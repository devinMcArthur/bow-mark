import * as dotenv from "dotenv";
import path from "path";
import { randomUUID } from "crypto";
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
import { register as registerTender, makeSessionState as makeTenderSessionState } from "./mcp/tools/tender";
import jwt from "jsonwebtoken";
import { AgentApiKey, User } from "@models";
import { UserRoles } from "@typescript/user";
import createJWT from "@utils/createJWT";
import { runWithContext, RequestContext } from "./mcp/context";
import {
  parseTraceparent,
  randomTraceId,
  randomSpanId,
} from "@lib/requestContext";

// ─── MCP Server ───────────────────────────────────────────────────────────────

type ToolScope = "read" | "readwrite";

function createMcpServer(scope: ToolScope): McpServer {
  const server = new McpServer({
    name: "bow-mark-analytics",
    version: "1.0.0",
  });

  registerSearch(server);
  registerFinancial(server);
  registerProductivity(server);
  registerOperational(server);

  // Per-session state for tender tools (page budget + dedup) — fresh per
  // McpServer instance, which createMcpServer() creates one of per session.
  const tenderSessionState = makeTenderSessionState();
  registerTender(server, tenderSessionState, scope);

  return server;
}

const AGENT_JWT_TTL_SECONDS = 60 * 60; // 1h

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const transports: Map<string, StreamableHTTPServerTransport> = new Map();

// ─── /mcp/auth: exchange raw API key for short-lived JWT ──────────────────────
// External agents post their raw key here once per ~hour and use the returned
// JWT for /mcp traffic. Human users authenticate via the GraphQL login flow
// and don't hit this endpoint.
app.post("/mcp/auth", async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: "Server misconfigured: missing JWT_SECRET" });
    return;
  }

  const rawKey = header.slice("Bearer ".length).trim();
  const doc = await AgentApiKey.verify(rawKey);
  if (!doc) {
    res.status(401).json({ error: "Invalid or revoked key" });
    return;
  }

  const token = createJWT(
    {
      agentId: (doc as unknown as { _id: { toString(): string } })._id.toString(),
      scope: doc.scope,
      sessionId: randomUUID(),
    },
    { expiresIn: AGENT_JWT_TTL_SECONDS }
  );

  res.json({ token, expiresIn: AGENT_JWT_TTL_SECONDS });
});

app.post("/mcp", async (req, res) => {
  // ── Auth: validate JWT from Authorization header ────────────────────────
  // The JWT can carry either userId (human, minted by GraphQL login) or
  // agentId (external automation, minted by /mcp/auth from a raw API key).
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let userId: string | undefined;
  let agentId: string | undefined;
  let mcpScope: ToolScope | undefined;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    if (decoded?.userId) {
      userId = decoded.userId;
    } else if (decoded?.agentId) {
      agentId = decoded.agentId;
      mcpScope = decoded.scope === "readwrite" ? "readwrite" : "read";
    } else {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  let role: UserRoles | undefined;
  let actorKind: "ai" | "agent" = "ai";

  if (userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    role = (user.role ?? UserRoles.User) as UserRoles;
    if (role < UserRoles.User) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } else if (agentId) {
    // Re-verify the underlying key wasn't revoked between JWT issuance
    // and now. Cheap indexed lookup; only fires once per /mcp request.
    const doc = await AgentApiKey.findById(agentId).lean();
    if (!doc || doc.revokedAt) {
      res.status(401).json({ error: "Agent key revoked" });
      return;
    }
    actorKind = "agent";
  }

  // Default scope for human users (no claim) is full readwrite — preserves
  // existing chat behavior. Agents always carry an explicit scope claim.
  const effectiveScope: ToolScope = mcpScope ?? "readwrite";

  // ── Optional tender / jobsite binding ──────────────────────────────────
  const tenderIdHeader = req.headers["x-tender-id"];
  const tenderId =
    typeof tenderIdHeader === "string" ? tenderIdHeader : undefined;
  if (tenderId && !mongoose.isValidObjectId(tenderId)) {
    res.status(400).json({ error: "Invalid X-Tender-Id" });
    return;
  }

  const jobsiteIdHeader = req.headers["x-jobsite-id"];
  const jobsiteId =
    typeof jobsiteIdHeader === "string" ? jobsiteIdHeader : undefined;
  if (jobsiteId && !mongoose.isValidObjectId(jobsiteId)) {
    res.status(400).json({ error: "Invalid X-Jobsite-Id" });
    return;
  }

  const conversationIdHeader = req.headers["x-conversation-id"];
  const conversationId =
    typeof conversationIdHeader === "string" ? conversationIdHeader : undefined;

  const inbound = parseTraceparent(req.header("traceparent"));
  const ctx: RequestContext = {
    traceId: inbound?.traceId ?? randomTraceId(),
    spanId: randomSpanId(),
    parentSpanId: inbound?.spanId,
    actorKind,
    userId,
    agentId,
    role,
    mcpScope: effectiveScope,
    tenderId,
    jobsiteId,
    conversationId,
  };

  // ── Route through MCP transport inside the ALS context ─────────────────
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await runWithContext(ctx, () =>
      transport.handleRequest(req, res, req.body),
    );
    return;
  }

  // New session — use cryptographically strong session IDs (128 bits of
  // entropy) so unauthenticated GET/DELETE /mcp handlers can't be attacked
  // by guessing a session ID to attach to a stream or terminate it.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sid) => {
      transports.set(sid, transport);
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  const server = createMcpServer(effectiveScope);
  await server.connect(transport);
  await runWithContext(ctx, () =>
    transport.handleRequest(req, res, req.body),
  );
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
