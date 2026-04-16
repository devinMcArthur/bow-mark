import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";

export class RateLimitExhaustedError extends Error {
  constructor(label: string) {
    super(`Rate limit retries exhausted for: ${label}`);
    this.name = "RateLimitExhaustedError";
  }
}

// Capped at 2 so rate limits escalate quickly to message-level retry
// (handler republishes with backoff). Previously 6, which let a single
// handler invocation burn 6+ Claude API calls against a still-limited
// endpoint before giving up — confusing attempt accounting and wasting
// tokens. Message-level retry has its own 3-step backoff (2/4/8 min),
// so 2 inner retries is enough for short bursts.
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 2
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit =
        error?.status === 429 || error?.error?.type === "rate_limit_error";
      if (!isRateLimit) throw error;
      if (attempt === maxRetries) throw new RateLimitExhaustedError(label);
      const retryAfterSec = parseInt(error?.headers?.["retry-after"] ?? "0", 10);
      const waitMs =
        retryAfterSec > 0
          ? retryAfterSec * 1000
          : Math.min(90_000, 2_000 * 2 ** attempt);
      console.warn(
        `[summarizePdf] Rate limited on ${label}. Waiting ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt + 1}/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw new RateLimitExhaustedError(label);
}

// Page-level buffer limit. Pages over this fall back to text extraction
// instead of being sent as PDF bytes to Claude (e.g. very dense drawing
// sheets or pages with hundreds of embedded link annotations).
const MAX_CHUNK_BYTES = 4 * 1024 * 1024;

/**
 * Legacy chunk descriptor for documents summarized before the page-index-
 * first refactor. New documents do not populate `chunks` — synthesis
 * produces a single cohesive summary from the per-page index. Kept here
 * so existing production data with populated `chunks` still deserializes
 * via the `DocumentSummary` type.
 */
export interface DocumentChunk {
  startPage: number;
  endPage: number;
  overview: string;
  keyTopics: string[];
}

export interface DocumentSummary {
  overview: string;
  documentType: string;
  keyTopics: string[];
  // Legacy field — not written by the current flow. Present on documents
  // processed before the page-index-first refactor.
  chunks?: DocumentChunk[];
}

export interface PageIndexEntry {
  page: number;
  summary: string;
}

// ─── Page index generation ───────────────────────────────────────────────────

export const PAGE_INDEX_PROMPT = `You are indexing one page from a construction document for a paving/concrete company.
Describe this page in 1-2 sentences. Be specific:
- Spec/text pages: include section number or heading and the most specific values, requirements, or standards (e.g. "Section 3.2 Temperature Requirements: minimum pavement surface temp 5°C, minimum air temp 3°C and rising")
- Drawing sheets: include drawing number, title, and what is shown (e.g. "Drawing C-3: culvert crossing detail, 900mm HDPE pipe at station 4+200")
- Tables/schedules: describe what the table contains and any key totals or items
- Cover/TOC pages: note it is a cover page or table of contents
Return only the description text — no JSON, no labels, no formatting.`;

async function extractPages(
  src: PDFDocument,
  startPage: number,
  endPage: number // exclusive
): Promise<Buffer> {
  const chunk = await PDFDocument.create();
  const indices = Array.from(
    { length: endPage - startPage },
    (_, i) => startPage + i
  );
  const pages = await chunk.copyPages(src, indices);
  for (const page of pages) chunk.addPage(page);
  const bytes = await chunk.save();
  return Buffer.from(bytes);
}

async function summarizePageForIndex(
  anthropic: Anthropic,
  pageBuffer: Buffer,
  pageNumber: number
): Promise<string> {
  // Large pages (e.g. high-res drawing sheets) fall back to text extraction
  // because sending them as PDF bytes would exceed Anthropic's request limit.
  if (pageBuffer.length > MAX_CHUNK_BYTES) {
    let text = "";
    try {
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");
      const parsed = await pdfParse(pageBuffer);
      text = parsed.text.trim().slice(0, 3000);
    } catch {
      // ignore — fall through to the no-text branch
    }
    if (!text) return `Page ${pageNumber}: drawing or image page`;

    const response = await withRateLimitRetry(
      () =>
        anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 150,
          messages: [
            {
              role: "user",
              content: `${PAGE_INDEX_PROMPT}\n\nPage content (text extracted from page ${pageNumber}):\n${text}`,
            },
          ],
        }),
      `page-index-text-${pageNumber}`
    );
    return response.content[0]?.type === "text"
      ? response.content[0].text.trim()
      : `Page ${pageNumber}`;
  }

  const base64 = pageBuffer.toString("base64");
  const response = await withRateLimitRetry(
    () =>
      anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: [
              { type: "text" as const, text: PAGE_INDEX_PROMPT },
              {
                type: "document" as any,
                source: {
                  type: "base64" as const,
                  media_type: "application/pdf" as const,
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    `page-index-${pageNumber}`
  );

  return response.content[0]?.type === "text"
    ? response.content[0].text.trim()
    : `Page ${pageNumber}`;
}

export interface GeneratePageIndexOptions {
  // Pages already indexed by a prior handler run. The loop skips any page
  // number present here, enabling resume-from-crash without re-paying the
  // Claude tokens for completed pages. Safe to pass undefined on first run.
  resumeFrom?: PageIndexEntry[];

  // How many newly-indexed pages to accumulate before writing a checkpoint
  // via onCheckpoint. Defaults to 5. Lower = more Mongo writes, tighter
  // progress; higher = fewer writes, coarser resume granularity.
  checkpointEveryPages?: number;

  // Override the 1.5s inter-page delay. Exposed primarily for tests so
  // indexing N pages doesn't sleep for N * 1.5s of real time.
  interPageDelayMs?: number;

  // Fired after every checkpointEveryPages pages finish, and also at the
  // very end. Receives the accumulated pageIndex plus progress counters.
  // Errors are logged but never throw — progress is best-effort.
  onCheckpoint?: (progress: {
    pageIndex: PageIndexEntry[];
    current: number;
    total: number;
  }) => Promise<void>;
}

/**
 * Generate a page-by-page index for a PDF.
 * Each entry is a 1-2 sentence description of that page's content.
 * Uses a 1.5s inter-page delay to stay well under Anthropic rate limits.
 * Returns an empty array if the PDF cannot be parsed.
 *
 * Supports resume-from-crash: pass `resumeFrom` with pages already indexed
 * and the loop will skip them. Checkpoints are written via `onCheckpoint`
 * every N pages so a crash mid-loop loses at most N-1 pages of work.
 */
export async function generatePageIndex(
  anthropic: Anthropic,
  buffer: Buffer,
  options: GeneratePageIndexOptions = {}
): Promise<PageIndexEntry[]> {
  let pdfDoc: PDFDocument;
  let totalPages: number;
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    totalPages = pdfDoc.getPageCount();
  } catch {
    console.warn("[generatePageIndex] pdf-lib failed to parse page tree — skipping page index");
    return [];
  }
  const resumeFrom = options.resumeFrom ?? [];
  const completedPages = new Set(resumeFrom.map((p) => p.page));
  const index: PageIndexEntry[] = [...resumeFrom];
  const checkpointEvery = options.checkpointEveryPages ?? 5;
  const INTER_PAGE_DELAY_MS = options.interPageDelayMs ?? 1_500;

  const alreadyDone = completedPages.size;
  if (alreadyDone > 0) {
    console.log(
      `[generatePageIndex] Resuming: ${alreadyDone}/${totalPages} pages already indexed`
    );
  } else {
    console.log(`[generatePageIndex] Indexing ${totalPages} pages...`);
  }

  const runCheckpoint = async () => {
    if (!options.onCheckpoint) return;
    // Sort by page number so readers always see a stable order, regardless
    // of the skip-and-append traversal that resume introduces.
    const sorted = [...index].sort((a, b) => a.page - b.page);
    try {
      await options.onCheckpoint({
        pageIndex: sorted,
        current: sorted.length,
        total: totalPages,
      });
    } catch (checkpointErr) {
      console.warn(`[generatePageIndex] checkpoint write failed:`, checkpointErr);
    }
  };

  // Kick off an initial checkpoint so the client sees the total immediately
  // (even before the first page finishes). Skipped on pure resume with no
  // new work to do.
  if (alreadyDone < totalPages) {
    await runCheckpoint();
  }

  let newlyProcessed = 0;
  let justProcessed = false; // only delay between actual work, not skipped pages

  for (let i = 0; i < totalPages; i++) {
    const pageNumber = i + 1;
    if (completedPages.has(pageNumber)) continue;

    if (justProcessed) {
      await new Promise((resolve) => setTimeout(resolve, INTER_PAGE_DELAY_MS));
    }

    try {
      const pageBuffer = await extractPages(pdfDoc, i, i + 1);
      const summary = await summarizePageForIndex(anthropic, pageBuffer, pageNumber);
      index.push({ page: pageNumber, summary });
    } catch (err) {
      console.warn(`[generatePageIndex] Failed to index page ${pageNumber}:`, err);
      index.push({ page: pageNumber, summary: `Page ${pageNumber}` });
    }

    newlyProcessed++;
    justProcessed = true;

    if (pageNumber % 10 === 0) {
      console.log(`[generatePageIndex] ${index.length}/${totalPages} pages indexed`);
    }

    // Checkpoint every N newly-processed pages. Using newlyProcessed as the
    // trigger (not pageNumber) keeps the cadence consistent when resuming
    // from a large existing pageIndex.
    if (newlyProcessed % checkpointEvery === 0) {
      await runCheckpoint();
    }
  }

  // Final checkpoint so the end state is always written, even if it wasn't
  // a multiple of checkpointEvery.
  if (newlyProcessed > 0 || alreadyDone < totalPages) {
    await runCheckpoint();
  }

  console.log(`[generatePageIndex] Done — ${index.length} pages indexed`);
  // Always return in page order so downstream consumers don't need to sort.
  return [...index].sort((a, b) => a.page - b.page);
}

// ─── Summary synthesis from page index ───────────────────────────────────────

const SYNTHESIS_PROMPT = `You are processing a construction document for a paving/concrete company. You have been given a per-page description of every page in the document — these descriptions were produced by a prior pass that looked at the actual page content. Synthesize them into a high-level summary of the entire document.

Return a JSON object with exactly these fields:
{
  "overview": "2-4 sentence summary of what this document is and its main purpose",
  "documentType": "what type of document this is (e.g. Spec Book, Drawing, Schedule of Quantities, Geotechnical Report, Municipal Spec, Standard Drawing, Material Standard, DSSP, Traffic Control Plan, Addendum, etc.)",
  "keyTopics": ["array", "of", "key", "topics", "materials", "or", "requirements", "mentioned"]
}
Return only valid JSON, no markdown, no explanation.`;

// Max characters of concatenated per-page descriptions to include in the
// synthesis prompt. At ~4 chars/token this keeps the prompt comfortably
// within Claude's 200k context even for ~2000-page documents. Massive docs
// get truncated from the middle — front and back typically carry cover,
// TOC, and conclusions, which are the highest-value context for a summary.
const MAX_SYNTHESIS_INPUT_CHARS = 400_000;

/**
 * Build the high-level DocumentSummary from a completed pageIndex.
 *
 * Single Claude call: concatenates the per-page descriptions into one
 * prompt and asks Claude to synthesize overview / documentType / keyTopics.
 *
 * Replaces the old chunked-PDF summary flow. Cheaper (pages already
 * distilled to text — no re-sending PDF bytes that the page index already
 * processed), simpler (one call, no chunk/merge tree), and higher quality
 * (synthesizer sees every page's essence at once, not a lossy chunk-merge
 * reduction).
 */
export async function synthesizeSummaryFromPageIndex(
  anthropic: Anthropic,
  pageIndex: PageIndexEntry[],
  fileDescription?: string | null
): Promise<DocumentSummary> {
  if (pageIndex.length === 0) {
    return {
      overview: "Document has no extractable pages to summarize.",
      documentType: "",
      keyTopics: [],
    };
  }

  // Sort defensively — callers should pass sorted, but this makes the
  // prompt always read in page order even if a resume set is unsorted.
  const sorted = [...pageIndex].sort((a, b) => a.page - b.page);

  let pagesText = sorted.map((p) => `Page ${p.page}: ${p.summary}`).join("\n");

  if (pagesText.length > MAX_SYNTHESIS_INPUT_CHARS) {
    const half = Math.floor(MAX_SYNTHESIS_INPUT_CHARS / 2);
    pagesText =
      pagesText.slice(0, half) +
      "\n\n[... middle pages omitted for length ...]\n\n" +
      pagesText.slice(-half);
  }

  const fileHeader = fileDescription
    ? `Original file name: ${fileDescription}\n\n`
    : "";
  const prompt = `${SYNTHESIS_PROMPT}\n\n${fileHeader}Per-page descriptions:\n${pagesText}`;

  const response = await withRateLimitRetry(
    () =>
      anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    "synthesize-summary"
  );

  const text =
    response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as DocumentSummary;
  } catch {
    throw new Error(
      `Claude returned invalid JSON for summary synthesis: ${text.slice(0, 200)}`
    );
  }
}
