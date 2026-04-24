import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Server } from "http";
import { requestContextMiddleware } from "../requestContext";
import { requireAuth } from "@lib/authMiddleware";
import { getRequestContext } from "@lib/requestContext";

let server: Server;

beforeAll(async () => {
  process.env.JWT_SECRET ??= "test-jwt-secret";
  const app = express();
  app.use(requestContextMiddleware);
  app.get("/probe", requireAuth, (_req, res) => {
    const ctx = getRequestContext();
    res.json({
      userId: ctx?.userId ?? null,
      sessionId: ctx?.sessionId ?? null,
    });
  });
  server = app.listen(0);
});

afterAll(() => server.close());

describe("requireAuth → requestContext threading", () => {
  it("populates userId and sessionId onto the active context", async () => {
    const token = jwt.sign(
      { userId: "user-123", sessionId: "session-abc" },
      process.env.JWT_SECRET!
    );
    const res = await request(server).get("/probe").set("Authorization", token);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user-123");
    expect(res.body.sessionId).toBe("session-abc");
  });

  it("leaves sessionId undefined when token lacks the claim", async () => {
    const token = jwt.sign(
      { userId: "user-123" },
      process.env.JWT_SECRET!
    );
    const res = await request(server).get("/probe").set("Authorization", token);
    expect(res.body.userId).toBe("user-123");
    expect(res.body.sessionId).toBeNull();
  });
});
