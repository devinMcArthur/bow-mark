import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";

export class RateLimitExhaustedError extends Error {
  constructor(label: string) {
    super(`Rate limit retries exhausted for: ${label}`);
    this.name = "RateLimitExhaustedError";
  }
}

export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 6
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.error?.type === "rate_limit_error";
      if (!isRateLimit) throw error;
      if (attempt === maxRetries) throw new RateLimitExhaustedError(label);
      const retryAfterSec = parseInt(error?.headers?.["retry-after"] ?? "0", 10);
      const waitMs = retryAfterSec > 0 ? retryAfterSec * 1000 : Math.min(90_000, 2_000 * 2 ** attempt);
      console.warn(`[summarizePdf] Rate limited on ${label}. Waiting ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw new RateLimitExhaustedError(label);
}

// 4 MB original → ~5.3 MB base64. Single-page chunks at this size work fine
// against Anthropic's API — the original request_too_large errors were caused
// by multi-page chunks where dense pages pushed the total far above this.
// Adaptive bisection now ensures each chunk is checked against the ACTUAL
// extracted size, so we only fall back to text extraction for truly giant pages.
const MAX_CHUNK_BYTES = 4 * 1024 * 1024;
const MAX_CHUNK_PAGES = 50;

export interface DocumentChunk {
  startPage: number; // 1-indexed, inclusive
  endPage: number;   // 1-indexed, inclusive
  overview: string;
  keyTopics: string[];
}

export interface DocumentSummary {
  overview: string;
  documentType: string;
  keyTopics: string[];
  chunks?: DocumentChunk[];
}

/**
 * Summarize a PDF buffer, splitting into chunks if needed.
 * Uses adaptive bisection so high-variance documents (mix of thin text pages
 * and heavy drawing pages) never exceed Anthropic's request size limit.
 */
export async function summarizePdf(
  anthropic: Anthropic,
  buffer: Buffer,
  summaryPrompt: string
): Promise<DocumentSummary> {
  // pdf-lib is used only for chunking large PDFs. Some files have malformed
  // page trees that pdf-lib can't parse. In that case, send the raw buffer
  // directly to Claude (which uses its own PDF renderer) or fall back to text.
  let pdfDoc: PDFDocument | null = null;
  let totalPages = 0;

  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    totalPages = pdfDoc.getPageCount();
  } catch (err) {
    console.warn(
      `[summarizePdf] pdf-lib failed to parse page tree (${(err as Error).message}) — ` +
      `sending raw buffer to Claude directly`
    );
    // Claude's own PDF renderer handles many PDFs that pdf-lib cannot.
    if (buffer.length <= MAX_CHUNK_BYTES) {
      return sendChunk(anthropic, buffer, summaryPrompt);
    }
    // Too large to send in one shot — fall back to text extraction.
    return summarizePageAsText(anthropic, buffer, 1, summaryPrompt);
  }

  const bytesPerPage = buffer.length / Math.max(totalPages, 1);
  const initialChunkSize = Math.max(1, Math.min(MAX_CHUNK_PAGES, Math.floor(MAX_CHUNK_BYTES / bytesPerPage)));

  console.log(
    `[summarizePdf] ${totalPages} pages, ${(buffer.length / 1024 / 1024).toFixed(1)} MB, ` +
    `${bytesPerPage.toFixed(0)} bytes/page → initial chunk size: ${initialChunkSize}`
  );

  if (totalPages <= initialChunkSize) {
    // Fits in one shot — no chunk index needed
    return summarizeRange(anthropic, pdfDoc, 0, totalPages, summaryPrompt);
  }

  // Multi-chunk: collect summaries with their page ranges
  // 5s inter-chunk delay keeps token usage well under the 50k/min Tier 1 limit
  const INTER_CHUNK_DELAY_MS = 5_000;
  const partials: Array<{ summary: DocumentSummary; startPage: number; endPage: number }> = [];
  for (let start = 0; start < totalPages; start += initialChunkSize) {
    if (partials.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, INTER_CHUNK_DELAY_MS));
    }
    const end = Math.min(start + initialChunkSize, totalPages);
    const summary = await summarizeRange(anthropic, pdfDoc, start, end, summaryPrompt);
    partials.push({ summary, startPage: start + 1, endPage: end }); // 1-indexed
  }

  const merged = await mergePartials(anthropic, partials.map((p) => p.summary), summaryPrompt);

  // Attach chunk index so the AI can navigate to the right page range at query time
  merged.chunks = partials
    .filter((p) => p.summary.overview || p.summary.keyTopics.length > 0)
    .map((p) => ({
      startPage: p.startPage,
      endPage: p.endPage,
      overview: p.summary.overview,
      keyTopics: p.summary.keyTopics,
    }));

  return merged;
}

/**
 * Summarize pages [start, end). If the extracted chunk exceeds MAX_CHUNK_BYTES,
 * bisect recursively until it fits. Falls back to a placeholder for single
 * pages that are still too large (e.g. a single 10 MB scan).
 */
async function summarizeRange(
  anthropic: Anthropic,
  pdfDoc: PDFDocument,
  start: number,
  end: number,
  summaryPrompt: string
): Promise<DocumentSummary> {
  const chunk = await extractPages(pdfDoc, start, end);
  const pageCount = end - start;

  if (chunk.length > MAX_CHUNK_BYTES && pageCount > 1) {
    const mid = Math.floor((start + end) / 2);
    console.log(
      `[summarizePdf] chunk pages ${start}-${end} is ${(chunk.length / 1024 / 1024).toFixed(1)} MB — bisecting at ${mid}`
    );
    const left = await summarizeRange(anthropic, pdfDoc, start, mid, summaryPrompt);
    const right = await summarizeRange(anthropic, pdfDoc, mid, end, summaryPrompt);
    return mergePartials(anthropic, [left, right], summaryPrompt);
  }

  if (chunk.length > MAX_CHUNK_BYTES) {
    // Single page is too large to send as PDF — extract text and summarize that instead
    console.warn(
      `[summarizePdf] page ${start + 1} is ${(chunk.length / 1024 / 1024).toFixed(1)} MB — falling back to text extraction`
    );
    return summarizePageAsText(anthropic, chunk, start + 1, summaryPrompt);
  }

  return sendChunk(anthropic, chunk, summaryPrompt);
}

async function extractPages(
  src: PDFDocument,
  startPage: number,
  endPage: number // exclusive
): Promise<Buffer> {
  const chunk = await PDFDocument.create();
  const indices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
  const pages = await chunk.copyPages(src, indices);
  for (const page of pages) chunk.addPage(page);
  const bytes = await chunk.save();
  return Buffer.from(bytes);
}

/**
 * Fallback for single pages that are too large to send as PDF (e.g. high-res
 * drawing sheets, ToC pages with hundreds of link annotations).
 * Extracts raw text from the page buffer and summarizes that instead.
 */
async function summarizePageAsText(
  anthropic: Anthropic,
  pageBuffer: Buffer,
  pageNumber: number,
  summaryPrompt: string
): Promise<DocumentSummary> {
  let text = "";
  try {
    const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");
    const parsed = await pdfParse(pageBuffer);
    text = parsed.text.trim();
  } catch (e) {
    console.warn(`[summarizePdf] text extraction failed for page ${pageNumber}:`, e);
  }

  if (!text) {
    // Truly no text content — likely a full-bleed drawing or blank scan
    console.warn(`[summarizePdf] page ${pageNumber} has no extractable text — marking as visual page`);
    return {
      overview: `Page ${pageNumber} appears to be a drawing, diagram, or image-only page with no extractable text.`,
      documentType: "",
      keyTopics: [],
    };
  }

  const response = await withRateLimitRetry(
    () => anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `${summaryPrompt}\n\nDocument content (text extracted from page ${pageNumber}):\n${text.slice(0, 50000)}`,
        },
      ],
    }),
    `page ${pageNumber} text`
  );

  const responseText = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  const cleaned = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(cleaned) as DocumentSummary;
  } catch {
    throw new Error(`Claude returned invalid JSON for page ${pageNumber} text: ${responseText.slice(0, 200)}`);
  }
}

async function sendChunk(
  anthropic: Anthropic,
  pdfBuffer: Buffer,
  summaryPrompt: string
): Promise<DocumentSummary> {
  const base64 = pdfBuffer.toString("base64");
  const response = await withRateLimitRetry(
    () => anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "text" as const, text: summaryPrompt },
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
    "pdf chunk"
  );

  const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(cleaned) as DocumentSummary;
  } catch {
    throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

/**
 * Merge multiple partial summaries into one using a second Claude call.
 */
async function mergePartials(
  anthropic: Anthropic,
  partials: DocumentSummary[],
  _summaryPrompt: string
): Promise<DocumentSummary> {
  // Filter out empty placeholders from skipped oversized pages
  const valid = partials.filter((p) => p.overview || p.keyTopics.length > 0);
  if (valid.length === 0) return partials[0];
  if (valid.length === 1) return valid[0];

  const partialsText = valid
    .map((p, i) => `Chunk ${i + 1}:\n${JSON.stringify(p, null, 2)}`)
    .join("\n\n");

  const response = await withRateLimitRetry(
    () => anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are merging partial document summaries from different sections of the same large document into a single cohesive summary.

Partial summaries:
${partialsText}

Return a single merged JSON object with exactly these fields:
{
  "overview": "2-4 sentence summary covering the whole document",
  "documentType": "the document type (consistent across chunks)",
  "keyTopics": ["merged", "deduplicated", "list", "of", "key", "topics"]
}
Return only valid JSON, no markdown, no explanation.`,
        },
      ],
    }),
    "merge partials"
  );

  const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(cleaned) as DocumentSummary;
  } catch {
    return valid[0];
  }
}
