import { PDFDocument } from "pdf-lib";
import {
  generatePageIndex,
  synthesizeSummaryFromPageIndex,
  type PageIndexEntry,
} from "../consumer/handlers/summarizePdf";

// Fake Anthropic client that returns a deterministic short summary per
// call. Every call to messages.create increments a counter so tests can
// assert exactly how many Claude requests were made — critical for
// verifying resume behavior (no wasted calls on already-indexed pages).
function makeFakeAnthropic() {
  const create = vi.fn().mockImplementation(async () => ({
    content: [{ type: "text", text: "fake page summary" }],
  }));
  return { messages: { create } };
}

async function makePdf(pageCount: number): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    pdfDoc.addPage([600, 800]);
  }
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

describe("generatePageIndex", () => {
  it("indexes every page of a fresh PDF", async () => {
    const pdf = await makePdf(3);
    const anthropic = makeFakeAnthropic();

    const result = await generatePageIndex(anthropic as any, pdf, {
      interPageDelayMs: 0,
    });

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.page)).toEqual([1, 2, 3]);
    expect(result.every((r) => r.summary === "fake page summary")).toBe(true);
    expect(anthropic.messages.create).toHaveBeenCalledTimes(3);
  });

  it("skips pages already in resumeFrom (no wasted Claude calls)", async () => {
    const pdf = await makePdf(5);
    const anthropic = makeFakeAnthropic();

    const resumeSeed: PageIndexEntry[] = [
      { page: 1, summary: "prior run page 1" },
      { page: 2, summary: "prior run page 2" },
      { page: 3, summary: "prior run page 3" },
    ];

    const result = await generatePageIndex(anthropic as any, pdf, {
      resumeFrom: resumeSeed,
      interPageDelayMs: 0,
    });

    // Only 2 new Claude calls (pages 4 and 5). This is the core C3 fix —
    // without resume support, a crash at page 4 would re-pay 3 Claude
    // calls for pages already indexed.
    expect(anthropic.messages.create).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(5);
    // Resumed pages keep their original summaries
    expect(result.find((r) => r.page === 1)?.summary).toBe("prior run page 1");
    expect(result.find((r) => r.page === 3)?.summary).toBe("prior run page 3");
    // New pages got the fake summary
    expect(result.find((r) => r.page === 4)?.summary).toBe("fake page summary");
    expect(result.find((r) => r.page === 5)?.summary).toBe("fake page summary");
  });

  it("returns an empty array when every page is already in resumeFrom", async () => {
    const pdf = await makePdf(2);
    const anthropic = makeFakeAnthropic();

    const resumeSeed: PageIndexEntry[] = [
      { page: 1, summary: "done" },
      { page: 2, summary: "done" },
    ];

    const result = await generatePageIndex(anthropic as any, pdf, {
      resumeFrom: resumeSeed,
      interPageDelayMs: 0,
    });

    expect(anthropic.messages.create).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it("invokes onCheckpoint every N pages and at the end", async () => {
    const pdf = await makePdf(7);
    const anthropic = makeFakeAnthropic();
    const checkpoint = vi.fn().mockResolvedValue(undefined);

    await generatePageIndex(anthropic as any, pdf, {
      checkpointEveryPages: 2,
      interPageDelayMs: 0,
      onCheckpoint: checkpoint,
    });

    // Checkpoints fire at pages 2, 4, 6 (every-2 trigger), plus the initial
    // zero-progress checkpoint before any work starts, plus the final
    // checkpoint at the end. For a 7-page PDF with checkpointEvery=2:
    //   initial → 2 → 4 → 6 → final = 5 checkpoints minimum
    expect(checkpoint).toHaveBeenCalled();
    const calls = checkpoint.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.current).toBe(7);
    expect(lastCall.total).toBe(7);
    expect(lastCall.pageIndex).toHaveLength(7);
  });

  it("sorts checkpoint pageIndex by page number for stable readers", async () => {
    const pdf = await makePdf(4);
    const anthropic = makeFakeAnthropic();
    const checkpoint = vi.fn().mockResolvedValue(undefined);

    // Seed resumeFrom out-of-order so we can verify sort stabilizes output
    const resumeSeed: PageIndexEntry[] = [
      { page: 3, summary: "seed three" },
      { page: 1, summary: "seed one" },
    ];

    await generatePageIndex(anthropic as any, pdf, {
      resumeFrom: resumeSeed,
      checkpointEveryPages: 1,
      interPageDelayMs: 0,
      onCheckpoint: checkpoint,
    });

    const finalCall = checkpoint.mock.calls[checkpoint.mock.calls.length - 1][0];
    const pages = finalCall.pageIndex.map((p: PageIndexEntry) => p.page);
    expect(pages).toEqual([1, 2, 3, 4]);
  });

  it("continues when onCheckpoint throws (progress is best-effort)", async () => {
    const pdf = await makePdf(3);
    const anthropic = makeFakeAnthropic();
    const checkpoint = vi.fn().mockRejectedValue(new Error("mongo exploded"));

    // Should complete all pages despite every checkpoint failing
    const result = await generatePageIndex(anthropic as any, pdf, {
      checkpointEveryPages: 1,
      interPageDelayMs: 0,
      onCheckpoint: checkpoint,
    });

    expect(result).toHaveLength(3);
    expect(checkpoint).toHaveBeenCalled();
  });

  it("returns final result sorted by page number", async () => {
    const pdf = await makePdf(5);
    const anthropic = makeFakeAnthropic();

    const resumeSeed: PageIndexEntry[] = [
      { page: 5, summary: "fifth" },
      { page: 2, summary: "second" },
    ];

    const result = await generatePageIndex(anthropic as any, pdf, {
      resumeFrom: resumeSeed,
      interPageDelayMs: 0,
    });

    expect(result.map((p) => p.page)).toEqual([1, 2, 3, 4, 5]);
  });
});

// ─── synthesizeSummaryFromPageIndex ─────────────────────────────────────────

function makeSynthesisAnthropic(responseJson: string) {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: responseJson }],
  });
  return { messages: { create } };
}

describe("synthesizeSummaryFromPageIndex", () => {
  it("produces a DocumentSummary from pageIndex entries via a single Claude call", async () => {
    const anthropic = makeSynthesisAnthropic(
      JSON.stringify({
        overview: "This is a spec book for paving work on Highway 7.",
        documentType: "Spec Book",
        keyTopics: ["asphalt", "HL-3", "traffic control"],
      })
    );

    const result = await synthesizeSummaryFromPageIndex(anthropic as any, [
      { page: 1, summary: "Cover page: Highway 7 paving project" },
      { page: 2, summary: "Table of contents" },
      { page: 3, summary: "Section 1: Scope of work" },
    ]);

    expect(result.overview).toContain("Highway 7");
    expect(result.documentType).toBe("Spec Book");
    expect(result.keyTopics).toEqual(["asphalt", "HL-3", "traffic control"]);
    // Exactly one Claude call — no chunking, no merging.
    expect(anthropic.messages.create).toHaveBeenCalledTimes(1);

    const prompt = anthropic.messages.create.mock.calls[0][0].messages[0]
      .content as string;
    // Prompt must include the per-page descriptions so Claude has real
    // content to synthesize from.
    expect(prompt).toContain("Page 1: Cover page: Highway 7 paving project");
    expect(prompt).toContain("Page 2: Table of contents");
    expect(prompt).toContain("Page 3: Section 1: Scope of work");
  });

  it("returns a placeholder without calling Claude when pageIndex is empty", async () => {
    const anthropic = makeSynthesisAnthropic("{}");
    const result = await synthesizeSummaryFromPageIndex(anthropic as any, []);

    expect(result.overview).toContain("no extractable pages");
    expect(result.documentType).toBe("");
    expect(result.keyTopics).toEqual([]);
    expect(anthropic.messages.create).not.toHaveBeenCalled();
  });

  it("sorts unsorted page descriptions before building the prompt", async () => {
    const anthropic = makeSynthesisAnthropic(
      JSON.stringify({ overview: "x", documentType: "y", keyTopics: [] })
    );

    await synthesizeSummaryFromPageIndex(anthropic as any, [
      { page: 3, summary: "third" },
      { page: 1, summary: "first" },
      { page: 2, summary: "second" },
    ]);

    const prompt = anthropic.messages.create.mock.calls[0][0].messages[0]
      .content as string;
    const firstIdx = prompt.indexOf("Page 1: first");
    const secondIdx = prompt.indexOf("Page 2: second");
    const thirdIdx = prompt.indexOf("Page 3: third");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it("includes the file description in the prompt when provided", async () => {
    const anthropic = makeSynthesisAnthropic(
      JSON.stringify({ overview: "x", documentType: "y", keyTopics: [] })
    );

    await synthesizeSummaryFromPageIndex(
      anthropic as any,
      [{ page: 1, summary: "one" }],
      "tender-docs.pdf"
    );

    const prompt = anthropic.messages.create.mock.calls[0][0].messages[0]
      .content as string;
    expect(prompt).toContain("tender-docs.pdf");
  });

  it("throws when Claude returns invalid JSON", async () => {
    const anthropic = makeSynthesisAnthropic("not valid json");

    await expect(
      synthesizeSummaryFromPageIndex(anthropic as any, [
        { page: 1, summary: "one" },
      ])
    ).rejects.toThrow(/invalid JSON/);
  });

  it("truncates extremely long page descriptions from the middle", async () => {
    const anthropic = makeSynthesisAnthropic(
      JSON.stringify({ overview: "x", documentType: "y", keyTopics: [] })
    );

    // Each entry ~800 chars × 600 pages ≈ 480k chars — above the 400k cap
    const hugeIndex: PageIndexEntry[] = Array.from({ length: 600 }, (_, i) => ({
      page: i + 1,
      summary: "x".repeat(800),
    }));

    await synthesizeSummaryFromPageIndex(anthropic as any, hugeIndex);

    const prompt = anthropic.messages.create.mock.calls[0][0].messages[0]
      .content as string;
    // Cap + fileHeader + SYNTHESIS_PROMPT, so generous upper bound
    expect(prompt.length).toBeLessThan(450_000);
    expect(prompt).toContain("middle pages omitted");
    // Front and back pages should still be present
    expect(prompt).toContain("Page 1:");
    expect(prompt).toContain("Page 600:");
  });
});
