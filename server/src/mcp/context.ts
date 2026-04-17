// MCP-specific context extensions. The core request context primitives
// (ALS, trace IDs, session IDs) live in @lib/requestContext — this file
// only adds MCP-scoped helpers (tenderId / jobsiteId / conversationId).
import {
  getRequestContext as getBaseContext,
  runWithContext as runBaseContext,
  type RequestContext as BaseRequestContext,
} from "@lib/requestContext";
import { UserRoles } from "@typescript/user";

export interface McpRequestContext extends BaseRequestContext {
  // MCP always requires an authenticated user; the MCP auth middleware
  // guarantees userId is populated before any tool runs.
  userId: string;
  role: UserRoles;
  tenderId?: string;
  jobsiteId?: string;
  // Existing callers passed `conversationId`. We keep it here as an alias
  // that maps onto the core `correlationId` field for domain events.
  conversationId?: string;
}

export type RequestContext = McpRequestContext;

export function runWithContext<T>(
  ctx: McpRequestContext,
  fn: () => Promise<T>
): Promise<T> {
  // Mirror conversationId onto correlationId so DomainEvents emitted
  // during the MCP call thread stitch back to the conversation.
  const withCorrelation: McpRequestContext = ctx.conversationId
    ? { ...ctx, correlationId: ctx.conversationId }
    : ctx;
  return runBaseContext(withCorrelation, fn) as Promise<T>;
}

export function getRequestContext(): McpRequestContext {
  const ctx = getBaseContext();
  if (!ctx || !ctx.userId) {
    throw new Error("No request context — tool called outside MCP request");
  }
  return ctx as McpRequestContext;
}

export function requireTenderContext(): McpRequestContext & { tenderId: string } {
  const ctx = getRequestContext();
  if (!ctx.tenderId) {
    throw new Error("This tool requires X-Tender-Id header");
  }
  return ctx as McpRequestContext & { tenderId: string };
}
