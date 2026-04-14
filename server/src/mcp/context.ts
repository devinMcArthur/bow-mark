import { AsyncLocalStorage } from "async_hooks";
import { UserRoles } from "@typescript/user";

export interface RequestContext {
  userId: string;
  role: UserRoles;
  tenderId?: string;
  /** Populated from X-Conversation-Id header (Task 2); used by tender note tools (Task 5). */
  conversationId?: string;
}

const als = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return als.run(ctx, fn);
}

export function getRequestContext(): RequestContext {
  const ctx = als.getStore();
  if (!ctx) {
    throw new Error("No request context — tool called outside MCP request");
  }
  return ctx;
}

export function requireTenderContext(): RequestContext & { tenderId: string } {
  const ctx = getRequestContext();
  if (!ctx.tenderId) {
    throw new Error("This tool requires X-Tender-Id header");
  }
  return ctx as RequestContext & { tenderId: string };
}
