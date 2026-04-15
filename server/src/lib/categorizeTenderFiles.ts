/**
 * Tender document categorizer — groups a tender's uploaded files into
 * AI-chosen folders so estimators can navigate large tenders (60+ docs).
 *
 * Runs on a 60s debounce triggered by new files reaching `ready` state
 * (see the hook in enrichedFileSummaryHandler.ts). Each pass is a full
 * re-categorization: it reads every ready/partial file on the tender,
 * asks Claude to bucket them into a small number of folders (typically
 * 3-7), and overwrites `tender.fileCategories` with the result.
 *
 * Always-full re-categorization was an intentional choice — incremental
 * would preserve existing assignments on a single-file add, but adds
 * prompt complexity. 60s debounce keeps the cost reasonable (one Claude
 * call per burst of uploads, not per file).
 *
 * Files not present in any category's fileIds list are rendered as
 * "Uncategorized" by the client. This covers: in-flight uploads,
 * anything the AI dropped on the floor, and the window between upload
 * and the next debounced run.
 */

import Anthropic from "@anthropic-ai/sdk";
import mongoose from "mongoose";
import { Tender } from "@models";

// Debounce: cancel any pending auto-trigger for the same tender before
// firing a new one. A batch upload of 30 files collapses into a single
// Claude call, not 30 concurrent calls.
const pendingAutoTriggers = new Map<string, ReturnType<typeof setTimeout>>();
const AUTO_TRIGGER_DELAY_MS = 60_000;

export function scheduleCategorization(tenderId: string): void {
  const existing = pendingAutoTriggers.get(tenderId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingAutoTriggers.delete(tenderId);
    categorizeTenderFiles(tenderId).catch((err) =>
      console.warn(
        `[categorizeTenderFiles] Debounced trigger failed for ${tenderId}:`,
        err
      )
    );
  }, AUTO_TRIGGER_DELAY_MS);
  pendingAutoTriggers.set(tenderId, timer);
}

const CATEGORIZATION_PROMPT = `You are organizing construction tender documents into logical folders for an estimator at Bow Mark, a paving and concrete company. The estimator is pricing this job and needs the documents grouped so they can quickly find what they're looking for when flipping through a tender.

Rules:
- Group every provided file into exactly one category.
- Aim for a small number of folders — typically 3 to 7, scaled to how many files there are. Do NOT create single-file folders unless a file genuinely doesn't fit anywhere else. Err on the side of fewer, broader folders.
- Use construction/tender-appropriate category names an estimator would immediately recognize. Examples: "Drawings", "Specifications", "Schedule of Quantities", "Addenda", "Geotechnical", "Traffic Management", "Correspondence", "Standard Details", "Permits", "Reference Documents".
- Order the categories from MOST-OFTEN-ACCESSED first to LEAST-OFTEN-ACCESSED last during tender estimation. Drawings and the schedule of quantities are typically referenced most often while pricing a job. Addenda and correspondence are checked occasionally. Reference specs and standard details are looked up as needed. Order matters — the first category should be the one the estimator opens first.
- Use the filename, the AI-generated document type, the overview, and the key topics to decide where each file belongs. Filenames are often the strongest signal.

Return a JSON object with this exact shape:
{
  "categories": [
    { "name": "Drawings", "fileIds": ["<file id 1>", "<file id 2>"] },
    { "name": "Specifications", "fileIds": ["<file id 3>"] }
  ]
}

Every fileId from the input list must appear in exactly one category. Return only valid JSON, no markdown, no explanation.`;

export async function categorizeTenderFiles(
  tenderId: string,
  anthropicClient?: Pick<Anthropic, "messages">
): Promise<void> {
  const anthropic =
    anthropicClient ??
    new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tender = await Tender.findById(tenderId)
    .populate({ path: "files" })
    .lean();

  if (!tender) {
    console.warn(`[categorizeTenderFiles] Tender ${tenderId} not found`);
    return;
  }

  // `partial` files have a completed summary (pageIndex is what's
  // incomplete), so they have enough context to be categorized. Only
  // skip files that haven't produced a summary yet.
  const files = ((tender.files as any[]) ?? []).filter(
    (f: any) => f.summaryStatus === "ready" || f.summaryStatus === "partial"
  );

  if (files.length === 0) {
    console.log(
      `[categorizeTenderFiles] No summarized files for tender ${tenderId} — skipping`
    );
    return;
  }

  // Build compact per-file context. Filename first since it's the
  // strongest categorization signal for most construction tender docs.
  const fileContext = files
    .map((f: any) => {
      const summary = f.summary as any;
      const filename =
        ((f.file as any)?.description as string | undefined) ??
        `unknown-${f._id.toString()}`;
      const lines = [
        `- id: ${f._id.toString()}`,
        `  filename: ${filename}`,
        summary?.documentType
          ? `  documentType: ${summary.documentType}`
          : null,
        summary?.overview ? `  overview: ${summary.overview}` : null,
        summary?.keyTopics?.length
          ? `  keyTopics: ${summary.keyTopics.join(", ")}`
          : null,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");

  const userContent = `Tender: ${(tender as any).name} (${(tender as any).jobcode})
File count: ${files.length}

## Files to categorize

${fileContext}

---

${CATEGORIZATION_PROMPT}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: userContent }],
    });

    const rawText =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : "";
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: { categories: Array<{ name: string; fileIds: string[] }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error(
        `[categorizeTenderFiles] Invalid JSON from Claude for tender ${tenderId}: ${rawText.slice(0, 200)}`
      );
      return;
    }

    if (
      !parsed.categories ||
      !Array.isArray(parsed.categories) ||
      parsed.categories.length === 0
    ) {
      console.warn(
        `[categorizeTenderFiles] Empty categories response for tender ${tenderId}`
      );
      return;
    }

    // Validate the response:
    //   - only accept fileIds that were actually in the input
    //   - deduplicate (first category claiming a fileId wins)
    //   - drop empty categories (can happen if Claude assigns everything
    //     from a proposed category to another one at output time)
    const validFileIds = new Set(files.map((f: any) => f._id.toString()));
    const claimed = new Set<string>();
    const fileCategories = parsed.categories
      .filter((c) => c && typeof c.name === "string" && Array.isArray(c.fileIds))
      .map((cat, idx) => {
        const fileIds = (cat.fileIds ?? [])
          .filter((id) => typeof id === "string" && validFileIds.has(id))
          .filter((id) => {
            if (claimed.has(id)) return false;
            claimed.add(id);
            return true;
          })
          .map((id) => new mongoose.Types.ObjectId(id));
        return {
          _id: new mongoose.Types.ObjectId(),
          name: cat.name.trim(),
          order: idx,
          fileIds,
        };
      })
      .filter((c) => c.fileIds.length > 0);

    if (fileCategories.length === 0) {
      console.warn(
        `[categorizeTenderFiles] All categories empty after validation for tender ${tenderId}`
      );
      return;
    }

    await (Tender as any).findByIdAndUpdate(tenderId, {
      $set: { fileCategories },
    });

    const uncategorizedCount = validFileIds.size - claimed.size;
    console.log(
      `[categorizeTenderFiles] Categorized ${files.length} files into ${fileCategories.length} folders for tender ${tenderId}` +
        (uncategorizedCount > 0
          ? ` (${uncategorizedCount} left uncategorized)`
          : "")
    );
  } catch (error) {
    console.error(
      `[categorizeTenderFiles] Failed for tender ${tenderId}:`,
      error
    );
    throw error;
  }
}
