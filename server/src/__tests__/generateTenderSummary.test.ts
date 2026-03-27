import mongoose from "mongoose";
import { Tender } from "@models";
import { prepareDatabase } from "@testing/vitestDB";
import { generateTenderSummary } from "../lib/generateTenderSummary";

// Minimal mock Anthropic client — no real API calls
function makeMockAnthropicClient(responseText?: string) {
  return {
    messages: {
      create: async () => ({
        content: responseText !== undefined
          ? [{ type: "text" as const, text: responseText }]
          : [],
      }),
    },
  };
}

beforeAll(async () => {
  await prepareDatabase();
});

describe("generateTenderSummary", () => {
  it("writes jobSummary to tender", async () => {
    const tender = await (Tender as any).create({
      name: "Test Tender",
      jobcode: `T-${Date.now()}`,
      status: "bidding",
      files: [],
      notes: [
        {
          _id: new mongoose.Types.ObjectId(),
          content: "Busy road — traffic control required",
          savedAt: new Date(),
          savedBy: new mongoose.Types.ObjectId(),
          conversationId: "conv-1",
        },
      ],
      createdBy: new mongoose.Types.ObjectId(),
    });

    const mockClient = makeMockAnthropicClient(
      "## Scope\nTest scope.\n\n## Key Requirements\nNone.\n\n## Risks & Gotchas\nNone.\n\n## Addendum Changes\nNone.\n\n## Outstanding Items\nNone."
    );

    await generateTenderSummary(tender._id.toString(), "auto", mockClient as any);

    const updated = await (Tender as any).findById(tender._id).lean();
    expect(updated.jobSummary).toBeDefined();
    expect(updated.jobSummary.content).toContain("## Scope");
    expect(updated.jobSummary.generatedBy).toBe("auto");
    expect(updated.jobSummary.generatedFrom).toEqual([
      tender.notes[0]._id.toString(),
    ]);
  });

  it("returns early if tender not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const mockClient = makeMockAnthropicClient("## Scope\nSomething.");

    await expect(
      generateTenderSummary(nonExistentId, "auto", mockClient as any)
    ).resolves.toBeUndefined();
  });

  it("returns early without saving if Anthropic returns empty content", async () => {
    const tender = await (Tender as any).create({
      name: "Empty Response Tender",
      jobcode: `T-empty-${Date.now()}`,
      status: "bidding",
      files: [],
      notes: [],
      createdBy: new mongoose.Types.ObjectId(),
    });

    const mockClient = makeMockAnthropicClient(undefined); // empty content[]

    await generateTenderSummary(tender._id.toString(), "auto", mockClient as any);

    const updated = await (Tender as any).findById(tender._id).lean();
    expect(updated.jobSummary).toBeUndefined();
  });
});
