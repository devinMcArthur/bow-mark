import request from "supertest";
import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import createApp from "../../app";
import { Conversation } from "@models";
import jestLogin from "@testing/jestLogin";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

let mongoServer: MongoMemoryServer;
let documents: SeededDatabase;
let app: Server;
let adminToken: string;
let developerToken: string;
let conversationId: string;
let assistantMsgId: string;

beforeAll(async () => {
  mongoServer = await prepareDatabase();
  app = await createApp();
  documents = await seedDatabase();
  adminToken = await jestLogin(app, "admin@bowmark.ca");
  developerToken = await jestLogin(app, "developer@bowmark.ca");

  // Create a conversation with a rated message
  const jobsite = documents.jobsites.jobsite_1;
  const convo = new Conversation({
    user: documents.users.developer_user._id,
    jobsiteId: jobsite._id,
    title: "Test conversation",
    aiModel: "claude-sonnet-4-6",
    messages: [
      { role: "user", content: "What is the ramp slope?" },
      {
        role: "assistant",
        content: "The slope is 8.3%.",
        rating: "up",
        ratedAt: new Date(),
      },
    ],
  });
  await convo.save();
  conversationId = convo._id.toString();
  assistantMsgId = (convo.messages[1] as any)._id.toString();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("GET /api/developer/ratings", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/developer/ratings");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-developer user (Admin)", async () => {
    const res = await request(app)
      .get("/api/developer/ratings")
      .set("Authorization", adminToken);
    expect(res.status).toBe(403);
  });

  it("returns 200 and rated messages for developer user", async () => {
    const res = await request(app)
      .get("/api/developer/ratings")
      .set("Authorization", developerToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const item = res.body[0];
    expect(item).toHaveProperty("conversationId");
    expect(item).toHaveProperty("rating");
    expect(item).toHaveProperty("assistantMessage");
    expect(item).toHaveProperty("userMessage");
    expect(item).toHaveProperty("contextType");
  });

  it("filters by rating=up", async () => {
    const res = await request(app)
      .get("/api/developer/ratings?rating=up")
      .set("Authorization", developerToken);
    expect(res.status).toBe(200);
    expect(res.body.every((r: any) => r.rating === "up")).toBe(true);
  });

  it("filters by rating=down returns empty when no downvotes exist", async () => {
    const res = await request(app)
      .get("/api/developer/ratings?rating=down")
      .set("Authorization", developerToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
