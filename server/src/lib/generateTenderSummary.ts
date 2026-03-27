import Anthropic from "@anthropic-ai/sdk";
import { Tender } from "@models";

// Debounce: cancel any pending auto-trigger for the same tender before firing a new one.
// Prevents a burst of note saves from firing N concurrent Sonnet calls.
const pendingAutoTriggers = new Map<string, ReturnType<typeof setTimeout>>();
const AUTO_TRIGGER_DELAY_MS = 3000;

export function scheduleTenderSummary(tenderId: string): void {
  const existing = pendingAutoTriggers.get(tenderId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingAutoTriggers.delete(tenderId);
    generateTenderSummary(tenderId, "auto").catch((err) =>
      console.warn(`[generateTenderSummary] Debounced trigger failed for ${tenderId}:`, err)
    );
  }, AUTO_TRIGGER_DELAY_MS);
  pendingAutoTriggers.set(tenderId, timer);
}

const SUMMARY_PROMPT = `You are writing a living job briefing for a construction tender at Bow-Mark, a paving and concrete company.

Synthesize all available document summaries, page indexes, and human notes into a structured briefing.
Write in clear, direct language. Be specific — use actual numbers, locations, and standards where mentioned.
If a section has nothing to report, write "Nothing noted."

COMPLETENESS: Every distinct scope item, addendum, and risk must appear — do not omit or merge items. But keep each entry to one concise line. This is a scannable briefing, not a detailed report. Bullet points only — no paragraphs within sections.

ADDENDUM SYNTHESIS IS REQUIRED. Every section must reflect the net state after all addendums are applied. If an addendum adds a scope item, that item must appear in Scope. If an addendum changes a spec requirement, that change must appear in Key Requirements. If an addendum introduces a risk, it must appear in Risks & Gotchas. The Addendum Changes section is a chronological log of what changed — all other sections show the current state after those changes have been applied.

Return the briefing as markdown. Start with a short paragraph (2-4 sentences) summarizing the job at a glance — what it is, where, and roughly what scale. Then include exactly these five headings:

## Scope
Every distinct work item and quantity on one line each — net scope after all addendums.

## Key Requirements
Critical spec constraints, materials, or standards. One line per item.

## Risks & Gotchas
Site conditions, owner quirks, or tight constraints that could cause problems. One line per item.

## Addendum Changes
Every addendum, chronologically. One line per addendum summarizing its key changes.

## Outstanding Items
Unresolved conflicts, missing information, or items needing follow-up. One line each.`;

export async function generateTenderSummary(
  tenderId: string,
  triggeredBy: "auto" | "manual" = "auto",
  anthropicClient?: Pick<Anthropic, "messages">
): Promise<void> {
  const anthropic = anthropicClient ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tender = await Tender.findById(tenderId)
    .populate({ path: "files" })
    .lean();

  if (!tender) {
    console.warn(`[generateTenderSummary] Tender ${tenderId} not found`);
    return;
  }

  const enrichedFiles = ((tender.files as any[]) ?? []).filter(
    (f: any) => f.summaryStatus === "ready"
  );

  const notes = ((tender as any).notes ?? []) as Array<{
    _id: any;
    content: string;
    savedAt: Date;
  }>;

  // Build text-only context — no PDF loads
  const fileContext = enrichedFiles
    .map((f: any) => {
      const summary = f.summary as any;
      const pageIndex = f.pageIndex as
        | Array<{ page: number; summary: string }>
        | undefined;
      const lines = [
        `Document: ${summary?.documentType || "Unknown"}`,
        summary?.overview ? `Overview: ${summary.overview}` : null,
        summary?.keyTopics?.length
          ? `Key Topics: ${summary.keyTopics.join(", ")}`
          : null,
        pageIndex?.length
          ? `Page Index:\n${pageIndex.map((p) => `  p.${p.page}: ${p.summary}`).join("\n")}`
          : null,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n---\n\n");

  const notesContext =
    notes.length > 0
      ? notes
          .map(
            (n) =>
              `- ${n.content} (${new Date(n.savedAt).toLocaleDateString()})`
          )
          .join("\n")
      : "No human notes saved yet.";

  const userContent = `Tender: ${(tender as any).name} (Job Code: ${(tender as any).jobcode})
${(tender as any).description ? `Description: ${(tender as any).description}\n` : ""}
## Documents

${fileContext || "No documents processed yet."}

## Human Notes

${notesContext}

---

${SUMMARY_PROMPT}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: userContent }],
    });

    const content =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : "";

    if (!content) {
      console.warn(
        `[generateTenderSummary] Empty response for tender ${tenderId}`
      );
      return;
    }

    const generatedFrom = [
      ...enrichedFiles.map((f: any) => f._id.toString()),
      ...notes.map((n: any) => n._id.toString()),
    ];

    await (Tender as any).findByIdAndUpdate(tenderId, {
      $set: {
        jobSummary: {
          content,
          generatedAt: new Date(),
          generatedBy: triggeredBy,
          generatedFrom,
        },
      },
    });

    console.log(
      `[generateTenderSummary] Summary generated for tender ${tenderId} (${enrichedFiles.length} files, ${notes.length} notes)`
    );
  } catch (error) {
    console.error(`[generateTenderSummary] Failed for tender ${tenderId}:`, error);
    throw error;
  }
}
