import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

// Mock Anthropic before importing the module under test
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: "## Scope\nTest scope.\n\n## Key Requirements\nTest requirements.\n\n## Risks & Gotchas\nNone.\n\n## Addendum Changes\nNone.\n\n## Outstanding Items\nNone.",
          },
        ],
      }),
    },
  })),
}));

// Mock the Tender model
const mockFindById = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
vi.mock("@models", () => ({
  Tender: {
    findById: mockFindById,
    findByIdAndUpdate: mockFindByIdAndUpdate,
  },
}));

import { generateTenderSummary } from "../lib/generateTenderSummary";

describe("generateTenderSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes jobSummary to tender with generatedFrom populated", async () => {
    const tenderId = new mongoose.Types.ObjectId().toString();
    const fileId1 = new mongoose.Types.ObjectId().toString();
    const noteId1 = new mongoose.Types.ObjectId().toString();

    const mockTender = {
      _id: tenderId,
      name: "Test Tender",
      jobcode: "T-001",
      notes: [{ _id: noteId1, content: "Busy road", savedAt: new Date() }],
      files: [
        {
          _id: fileId1,
          summaryStatus: "ready",
          summary: { overview: "Road paving project", keyTopics: ["asphalt", "culvert"] },
          pageIndex: [{ page: 1, summary: "Cover page" }],
        },
      ],
    };

    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTender),
      }),
    });

    await generateTenderSummary(tenderId);

    // Verify Tender.findById was called
    expect(mockFindById).toHaveBeenCalledWith(tenderId);
    // Verify findByIdAndUpdate was called to save the summary
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      tenderId,
      expect.objectContaining({
        $set: expect.objectContaining({
          jobSummary: expect.objectContaining({
            content: expect.any(String),
            generatedAt: expect.any(Date),
            generatedBy: "auto",
            generatedFrom: [fileId1, noteId1],
          }),
        }),
      })
    );
  });

  it("returns early if tender not found", async () => {
    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    });

    // Should not throw
    await expect(generateTenderSummary("nonexistent")).resolves.toBeUndefined();
  });

  it("returns early without saving if Anthropic returns empty content", async () => {
    const tenderId = new mongoose.Types.ObjectId().toString();

    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: tenderId,
          name: "Empty Response Tender",
          jobcode: "T-002",
          notes: [],
          files: [],
        }),
      }),
    });

    // Override Anthropic mock to return empty content for this test
    const AnthropicModule = await import("@anthropic-ai/sdk");
    const mockCreate = vi.fn().mockResolvedValue({ content: [] });
    (AnthropicModule.default as any).mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    await generateTenderSummary(tenderId);

    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});
