import Anthropic from "@anthropic-ai/sdk";
import { Tender } from "@models";

// Debounce: cancel any pending auto-trigger for the same tender before firing a new one.
// Prevents a burst of note saves from firing N concurrent Sonnet calls.
const pendingAutoTriggers = new Map<string, ReturnType<typeof setTimeout>>();
const AUTO_TRIGGER_DELAY_MS = 3000;

export function scheduleTenderSummary(tenderId: string): void {
  const existing = pendingAutoTriggers.get(tenderId);
  if (existing) clearTimeout(existing);

  // Mark as generating immediately so the client can reflect this state
  (Tender as any).findByIdAndUpdate(tenderId, { $set: { summaryGenerating: true } }).catch(() => {});

  const timer = setTimeout(() => {
    pendingAutoTriggers.delete(tenderId);
    generateTenderSummary(tenderId, "auto").catch((err) =>
      console.warn(`[generateTenderSummary] Debounced trigger failed for ${tenderId}:`, err)
    );
  }, AUTO_TRIGGER_DELAY_MS);
  pendingAutoTriggers.set(tenderId, timer);
}

const SUMMARY_PROMPT = `You are writing a living bid briefing for a construction tender at Bow Mark, a paving and concrete company. The audience is estimators — people responsible for pricing this job, planning its execution, and writing the proposal. Their core questions are: "What am I actually bidding on?", "How would we execute this?", and "What will affect our price and schedule?"

Synthesize all available document summaries, page indexes, and human notes into a structured briefing.
Write in clear, direct language. Be specific — use actual numbers, locations, and standards where mentioned.
If a section has nothing to report, write "Nothing noted."

COVERAGE IS THE PRIORITY. Think of this as a scope inventory for pricing — every major section of work must appear so nothing is missed in the bid. A "section of work" is a trade or activity category (e.g. asphalt paving, watermain, traffic control, concrete curb, site grading) — NOT individual line items from the schedule of quantities. Missing an entire section of work is a failure. Listing every line item is also a failure — that level of detail belongs in the documents, not the summary.

FORMAT: One bullet per section of work. For Bow Mark's core work (asphalt paving, concrete), include key quantities (e.g. square metres, tonnes) if available — this helps size the job at a glance. For supporting work (underground utilities, signage, landscaping, etc.), stay at the category level — do not list every pipe size, fitting, or item type. Include a detail or spec only when it is genuinely noteworthy (unusual method, tight constraint, something that changes how you'd approach or price the work). Do not list spec codes or item numbers.

ADDENDUM SYNTHESIS: Every section reflects the net state after all addendums. If an addendum introduces a new section of work, it must appear in Scope. If it only modifies a spec detail within an existing section, it does not need its own Scope bullet — just note it in Addendum Changes.

Return the briefing as markdown. Start with a short paragraph (2-4 sentences) summarizing the job at a glance — what it is, where, and roughly what scale. Then include exactly these five headings:

## Scope
One bullet per major section of work, net of all addendums. Group related line items under their trade/activity — do not list individual schedule items.

## Key Requirements
Spec constraints, materials, or standards that shape how the job gets done — especially anything non-standard or restrictive.

## Risks & Gotchas
Anything that could cause problems: site conditions, owner quirks, tight constraints, known conflicts.

## Addendum Changes
Every addendum, chronologically, with its key changes noted.

## Outstanding Items
Unresolved conflicts, missing information, or items needing follow-up.`;

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
        summaryGenerating: false,
      },
    });

    console.log(
      `[generateTenderSummary] Summary generated for tender ${tenderId} (${enrichedFiles.length} files, ${notes.length} notes)`
    );
  } catch (error) {
    console.error(`[generateTenderSummary] Failed for tender ${tenderId}:`, error);
    await (Tender as any).findByIdAndUpdate(tenderId, { $set: { summaryGenerating: false } }).catch(() => {});
    throw error;
  }
}
