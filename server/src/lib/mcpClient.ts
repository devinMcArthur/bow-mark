import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Response } from "express";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://mcp-analytics:8081";

export interface McpConnection {
  client: Client;
  tools: Anthropic.Tool[];
}

export interface ConnectMcpOptions {
  /** Authorization header value passed to the MCP server (raw token, no "Bearer" prefix needed — the existing requireAuth pattern uses raw tokens). */
  authToken?: string;
  /** Tender ID bound to this MCP session. Used by tender-scoped tools. */
  tenderId?: string;
  /** Optional conversation ID — passed through for note traceability. */
  conversationId?: string;
}

/**
 * Connect to the MCP analytics server and load its tool list.
 * Returns null and writes a 503 response if connection or tool loading fails.
 * Caller is responsible for calling client.close() in a finally block.
 */
export async function connectMcp(
  clientName: string,
  logPrefix: string,
  res: Response,
  opts?: ConnectMcpOptions,
): Promise<McpConnection | null> {
  const client = new Client({ name: clientName, version: "1.0.0" });

  const headers: Record<string, string> = {};
  if (opts?.authToken) headers["Authorization"] = opts.authToken;
  if (opts?.tenderId) headers["X-Tender-Id"] = opts.tenderId;
  if (opts?.conversationId) headers["X-Conversation-Id"] = opts.conversationId;

  const transport = new StreamableHTTPClientTransport(
    new URL(`${MCP_SERVER_URL}/mcp`),
    Object.keys(headers).length > 0
      ? { requestInit: { headers } }
      : undefined,
  );

  try {
    await client.connect(transport);
  } catch (err) {
    console.error(`${logPrefix} Failed to connect to MCP server:`, err);
    res.status(503).json({ error: "Analytics server unavailable" });
    return null;
  }

  let tools: Anthropic.Tool[];
  try {
    const { tools: rawTools } = await client.listTools();
    tools = rawTools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      input_schema: (t.inputSchema as Anthropic.Tool["input_schema"]) ?? {
        type: "object" as const,
        properties: {},
      },
    }));
  } catch (err) {
    console.error(`${logPrefix} Failed to load MCP tools:`, err);
    await client.close();
    res.status(503).json({ error: "Failed to load analytics tools" });
    return null;
  }

  return { client, tools };
}
