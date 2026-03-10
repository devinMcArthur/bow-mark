import * as dotenv from "dotenv";
import path from "path";
import "reflect-metadata";

if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.join(__dirname, "..", ".env.development") });
}

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import mongoose from "mongoose";
import { register as registerSearch } from "./mcp/tools/search";
import { register as registerFinancial } from "./mcp/tools/financial";
import { register as registerProductivity } from "./mcp/tools/productivity";
import { register as registerOperational } from "./mcp/tools/operational";

// ─── MCP Server ───────────────────────────────────────────────────────────────

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "bow-mark-analytics",
    version: "1.0.0",
  });

  registerSearch(server);
  registerFinancial(server);
  registerProductivity(server);
  registerOperational(server);

  return server;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const transports: Map<string, StreamableHTTPServerTransport> = new Map();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () =>
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    onsessioninitialized: (sid) => {
      transports.set(sid, transport);
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.close();
    transports.delete(sessionId);
  }
  res.status(204).send();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "bow-mark-mcp-analytics" });
});

const PORT = process.env.MCP_PORT || 8081;

const start = async () => {
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      });
      console.log("MCP: MongoDB connected");
    } catch (err) {
      console.error("MCP: MongoDB connection failed — notes unavailable", err);
    }
  }

  app.listen(PORT, () => {
    console.log(`MCP Analytics server running on port ${PORT}`);
  });
};

start();
