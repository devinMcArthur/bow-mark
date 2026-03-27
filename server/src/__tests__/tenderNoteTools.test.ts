import { vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "## Scope\nMocked." }],
      }),
    },
  })),
}));

import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";
import { Tender } from "@models";
import { makeTenderNoteExecutor } from "../lib/tenderNoteTools";

// Uses real MongoDB via vitestGlobalSetup (testcontainers)

describe("makeTenderNoteExecutor", () => {
  let tenderId: string;

  beforeEach(async () => {
    // Create a minimal tender for each test
    const tender = await (Tender as any).create({
      name: "Test Tender",
      jobcode: `T-${Date.now()}`,
      status: "bidding",
      files: [],
      notes: [],
      createdBy: new mongoose.Types.ObjectId(),
    });
    tenderId = tender._id.toString();
  });

  it("save_tender_note adds a note to the tender", async () => {
    const executor = makeTenderNoteExecutor(
      tenderId,
      new mongoose.Types.ObjectId().toString(),
      "conv-123"
    );

    const result = await executor("save_tender_note", {
      content: "The owner's rep is strict about traffic control",
      conversationId: "conv-123",
    });

    expect(result.content).toContain("Note saved");

    const updated = await (Tender as any).findById(tenderId).lean();
    expect(updated.notes).toHaveLength(1);
    expect(updated.notes[0].content).toBe("The owner's rep is strict about traffic control");
    expect(updated.notes[0].conversationId).toBe("conv-123");
  });

  it("delete_tender_note removes the note", async () => {
    // First save a note directly
    await (Tender as any).findByIdAndUpdate(tenderId, {
      $push: {
        notes: {
          _id: new mongoose.Types.ObjectId(),
          content: "Note to delete",
          savedAt: new Date(),
          savedBy: new mongoose.Types.ObjectId(),
          conversationId: "conv-abc",
        },
      },
    });

    const tender = await (Tender as any).findById(tenderId).lean();
    const noteId = tender.notes[0]._id.toString();

    const executor = makeTenderNoteExecutor(
      tenderId,
      new mongoose.Types.ObjectId().toString(),
      undefined
    );

    const result = await executor("delete_tender_note", { noteId });
    expect(result.content).toContain("deleted");

    const updated = await (Tender as any).findById(tenderId).lean();
    expect(updated.notes).toHaveLength(0);
  });

  it("throws for unknown tool name", async () => {
    const executor = makeTenderNoteExecutor(tenderId, "user-id", undefined);
    await expect(executor("unknown_tool", {})).rejects.toThrow("Unknown tool");
  });
});
