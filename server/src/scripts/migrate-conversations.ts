/**
 * Migration: Merge ChatConversation + TenderConversation into unified Conversation collection
 *
 * Run once after deploying the conversation unification.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/scripts/migrate-conversations.ts
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, "../../.env.development") });
}

import mongoose from "mongoose";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;

  const chatConvos = db.collection("chatconversations");
  const tenderConvos = db.collection("tenderconversations");
  const conversations = db.collection("conversations");

  // ── ChatConversation → Conversation ─────────────────────────────────────────
  const chatDocs = await chatConvos.find({}).toArray();
  console.log(`Found ${chatDocs.length} ChatConversation document(s)`);

  let chatMigrated = 0;
  for (const doc of chatDocs) {
    const existing = await conversations.findOne({ _id: doc._id });
    if (existing) {
      console.log(`  Skipping ChatConversation ${doc._id} — already exists in conversations`);
      continue;
    }
    // jobsiteId was already optional in ChatConversation — keep as-is
    const { _id, user, jobsiteId, title, aiModel, messages, totalInputTokens, totalOutputTokens, createdAt, updatedAt } = doc;
    await conversations.insertOne({
      _id,
      user,
      ...(jobsiteId ? { jobsiteId } : {}),
      title: title ?? "New conversation",
      aiModel: aiModel ?? "unknown",
      messages: messages ?? [],
      totalInputTokens: totalInputTokens ?? 0,
      totalOutputTokens: totalOutputTokens ?? 0,
      createdAt,
      updatedAt,
    });
    chatMigrated++;
  }
  console.log(`  Migrated ${chatMigrated} ChatConversation document(s)`);

  // ── TenderConversation → Conversation ────────────────────────────────────────
  const tenderDocs = await tenderConvos.find({}).toArray();
  console.log(`Found ${tenderDocs.length} TenderConversation document(s)`);

  let tenderMigrated = 0;
  for (const doc of tenderDocs) {
    const existing = await conversations.findOne({ _id: doc._id });
    if (existing) {
      console.log(`  Skipping TenderConversation ${doc._id} — already exists in conversations`);
      continue;
    }
    // Old field name was "tender", new field name is "tenderId"
    const { _id, tender, user, title, aiModel, messages, totalInputTokens, totalOutputTokens, createdAt, updatedAt } = doc;
    await conversations.insertOne({
      _id,
      user,
      tenderId: tender,
      title: title ?? "New conversation",
      aiModel: aiModel ?? "unknown",
      messages: messages ?? [],
      totalInputTokens: totalInputTokens ?? 0,
      totalOutputTokens: totalOutputTokens ?? 0,
      createdAt,
      updatedAt,
    });
    tenderMigrated++;
  }
  console.log(`  Migrated ${tenderMigrated} TenderConversation document(s)`);

  console.log("Migration complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
