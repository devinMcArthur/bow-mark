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
let token: string;
let otherToken: string;
let conversationId: string;
let userMsgId: string;
let assistantMsgId: string;

beforeAll(async () => {
  mongoServer = await prepareDatabase();
  app = await createApp();
  documents = await seedDatabase();
  token = await jestLogin(app, "admin@bowmark.ca");
  otherToken = await jestLogin(app, "baseforeman1@bowmark.ca");

  const convo = new Conversation({
    user: documents.users.admin_user._id,
    title: "Test conversation",
    aiModel: "claude-sonnet-4-6",
    messages: [
      { role: "user", content: "What is the ramp slope?" },
      { role: "assistant", content: "The slope is 8.3%." },
    ],
  });
  await convo.save();
  conversationId = convo._id.toString();
  userMsgId = (convo.messages[0] as any)._id.toString();
  assistantMsgId = (convo.messages[1] as any)._id.toString();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("PATCH /api/conversations/:id/messages/:msgId/rating", () => {
  describe("upvote", () => {
    it("returns success and persists upvote", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.rating).toBe("up");
    });
  });

  describe("downvote", () => {
    it("returns success and persists downvote with reasons", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({
          rating: "down",
          reasons: ["hallucinated_citation", "wrong_answer"],
          comment: "It cited the wrong page",
        });
      expect(res.status).toBe(200);
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.rating).toBe("down");
      expect(msg.ratingReasons).toEqual(["hallucinated_citation", "wrong_answer"]);
      expect(msg.ratingComment).toBe("It cited the wrong page");
    });
  });

  describe("clear rating", () => {
    it("clears rating and reasons when rating is null", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: null });
      expect(res.status).toBe(200);
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.rating).toBeUndefined();
      expect(msg.ratingReasons).toBeUndefined();
    });
  });

  describe("upvote clears previous downvote reasons", () => {
    it("removes ratingReasons when switching to upvote", async () => {
      // First downvote
      await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "down", reasons: ["too_vague"] });
      // Then upvote
      await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.rating).toBe("up");
      expect(msg.ratingReasons).toBeUndefined();
    });
  });

  describe("validation", () => {
    it("returns 400 for invalid rating value", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "sideways" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/rating must be/);
    });

    it("returns 400 when downvote has no reasons", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "down", reasons: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/reasons required/);
    });

    it("returns 400 for invalid reason value", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "down", reasons: ["not_a_real_reason"] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid reason/);
    });

    it("returns 404 for invalid conversation id", async () => {
      const res = await request(app)
        .patch(`/api/conversations/not-an-id/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      expect(res.status).toBe(404);
    });

    it("returns 404 for invalid message id", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/not-an-id/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      expect(res.status).toBe(404);
    });

    it("returns 404 when message id does not exist in conversation", async () => {
      const fakeId = "000000000000000000000001";
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${fakeId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      expect(res.status).toBe(404);
    });

    it("returns 403 when conversation belongs to another user", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", otherToken)
        .send({ rating: "up" });
      expect(res.status).toBe(403);
    });

    it("returns 401 without auth token", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .send({ rating: "up" });
      expect(res.status).toBe(401);
    });
  });

  describe("ratedAt timestamp", () => {
    it("sets ratedAt when upvoting", async () => {
      const before = new Date();
      await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.ratedAt).toBeDefined();
      expect(new Date(msg.ratedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("sets ratedAt when downvoting", async () => {
      const before = new Date();
      await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "down", reasons: ["too_vague"] });
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.ratedAt).toBeDefined();
      expect(new Date(msg.ratedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("clears ratedAt when rating is null", async () => {
      // First upvote to set ratedAt
      await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      // Then clear
      await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: null });
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.ratedAt).toBeUndefined();
    });
  });
});
