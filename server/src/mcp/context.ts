import { AsyncLocalStorage } from "async_hooks";
import { UserRoles } from "@typescript/user";

export interface RequestContext {
  userId: string;
  role: UserRoles;
  tenderId?: string;
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
