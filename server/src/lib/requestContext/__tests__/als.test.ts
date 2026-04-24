import {
  runWithContext,
  getRequestContext,
  requireRequestContext,
  withChildSpan,
  type RequestContext,
} from "..";

const base: RequestContext = {
  traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
  spanId: "00f067aa0ba902b7",
  actorKind: "user",
};

describe("requestContext ALS", () => {
  it("getRequestContext returns undefined outside runWithContext", () => {
    expect(getRequestContext()).toBeUndefined();
  });

  it("requireRequestContext throws outside runWithContext", () => {
    expect(() => requireRequestContext()).toThrow(/no active request context/i);
  });

  it("runWithContext makes the context available to nested async code", async () => {
    await runWithContext(base, async () => {
      expect(getRequestContext()).toEqual(base);
      await Promise.resolve();
      expect(getRequestContext()?.traceId).toBe(base.traceId);
    });
    expect(getRequestContext()).toBeUndefined();
  });

  it("withChildSpan creates a child span under the active context", async () => {
    await runWithContext(base, async () => {
      await withChildSpan(async () => {
        const child = requireRequestContext();
        expect(child.traceId).toBe(base.traceId);
        expect(child.parentSpanId).toBe(base.spanId);
        expect(child.spanId).not.toBe(base.spanId);
        expect(child.spanId).toMatch(/^[0-9a-f]{16}$/);
      });
      // parent span restored after child returns
      expect(getRequestContext()?.spanId).toBe(base.spanId);
    });
  });

  it("withChildSpan is a no-op when no parent context is active", async () => {
    const out = await withChildSpan(async () => "fallback");
    expect(out).toBe("fallback");
    expect(getRequestContext()).toBeUndefined();
  });
});
