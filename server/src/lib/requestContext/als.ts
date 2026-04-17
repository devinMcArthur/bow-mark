import { AsyncLocalStorage } from "async_hooks";
import { randomSpanId } from "./traceparent";
import type { RequestContext } from "./types";

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function requireRequestContext(): RequestContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "No active request context — code path requires runWithContext()"
    );
  }
  return ctx;
}

/**
 * Run `fn` inside a child span derived from the active context. If there is
 * no active context (e.g. called from a background job without explicit
 * context setup), `fn` runs unchanged — mirrors OTel's graceful no-op
 * behaviour and lets us sprinkle withChildSpan() freely without mandating
 * context everywhere.
 */
export function withChildSpan<T>(fn: () => Promise<T> | T): Promise<T> | T {
  const parent = storage.getStore();
  if (!parent) return fn();
  const child: RequestContext = {
    ...parent,
    parentSpanId: parent.spanId,
    spanId: randomSpanId(),
  };
  return storage.run(child, fn);
}
