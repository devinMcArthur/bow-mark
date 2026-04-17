import express from "express";
import request from "supertest";
import type { Server } from "http";
import { requestContextMiddleware } from "../requestContext";
import { getRequestContext } from "@lib/requestContext";

let server: Server;

beforeAll(async () => {
  const app = express();
  app.use(requestContextMiddleware);
  app.get("/probe", (_req, res) => {
    const ctx = getRequestContext();
    res.json({
      hasContext: !!ctx,
      traceId: ctx?.traceId ?? null,
      spanId: ctx?.spanId ?? null,
      parentSpanId: ctx?.parentSpanId ?? null,
    });
  });
  server = app.listen(0);
});

afterAll(async () => {
  server.close();
});

describe("requestContextMiddleware", () => {
  it("stamps a fresh trace when no inbound header is present", async () => {
    const res = await request(server).get("/probe");
    expect(res.status).toBe(200);
    expect(res.body.hasContext).toBe(true);
    expect(res.body.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(res.body.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(res.body.parentSpanId).toBeNull();
    expect(res.headers["traceparent"]).toContain(res.body.traceId);
  });

  it("continues an inbound traceparent trace when provided", async () => {
    const inbound =
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const res = await request(server)
      .get("/probe")
      .set("traceparent", inbound);
    expect(res.body.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(res.body.parentSpanId).toBe("00f067aa0ba902b7");
    expect(res.body.spanId).not.toBe("00f067aa0ba902b7");
  });

  it("each request gets an independent trace", async () => {
    const a = await request(server).get("/probe");
    const b = await request(server).get("/probe");
    expect(a.body.traceId).not.toBe(b.body.traceId);
  });

  it("exposes traceparent on the response for client propagation", async () => {
    const res = await request(server).get("/probe");
    expect(res.headers["traceparent"]).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/
    );
  });
});
