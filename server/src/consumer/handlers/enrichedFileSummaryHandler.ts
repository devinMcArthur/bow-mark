import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { Enrichment, Document as DocumentModel, File, Tender } from "@models";
import { getFile } from "@utils/fileStorage";
import type { EnrichedFileSummaryMessage } from "../../rabbitmq/publisher";
import {
  synthesizeSummaryFromPageIndex,
  DocumentSummary,
  withRateLimitRetry,
  RateLimitExhaustedError,
  generatePageIndex,
  type PageIndexEntry,
} from "./summarizePdf";
import { publishEnrichedFileCreated } from "../../rabbitmq/publisher";
import { scheduleTenderSummary } from "../../lib/generateTenderSummary";
import { scheduleCategorization } from "../../lib/categorizeTenderFiles";
import mongoose from "mongoose";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Matches PROCESSING_STUCK_MS in consumer/watchdog.ts. A "processing" file
// whose processingStartedAt is older than this is considered abandoned
// and can be claimed by a new handler. Used as the cutoff inside the
// atomic claim predicate below.
export const HANDLER_OWNERSHIP_WINDOW_MS = 90 * 60_000;

/**
 * Atomic ownership claim. Transitions an Enrichment to "processing"
 * only if it is currently in a claimable state:
 *   - pending                                 (first delivery)
 *   - partial                                 (resume pageIndex build)
 *   - processing + stale processingStartedAt  (abandoned by dead handler)
 *   - processing + missing processingStartedAt (legacy doc)
 *
 * Returns the claimed document (with new processingVersion) on success,
 * or null if the file was not claimable. Exported so unit tests can
 * exercise the claim logic directly without running the full handler.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function claimEnrichment(documentIdStr: string): Promise<any> {
  const claimCutoff = new Date(Date.now() - HANDLER_OWNERSHIP_WINDOW_MS);
  return Enrichment.findOneAndUpdate(
    {
      documentId: new mongoose.Types.ObjectId(documentIdStr),
      $or: [
        { status: "pending" },
        { status: "partial" },
        {
          status: "processing",
          $or: [
            { processingStartedAt: { $lt: claimCutoff } },
            { processingStartedAt: { $exists: false } },
          ],
        },
      ],
    },
    {
      $set: {
        status: "processing",
        processingStartedAt: new Date(),
      },
      $inc: { attempts: 1, processingVersion: 1 },
      $unset: { summaryError: "" },
    },
    { new: true }
  );
}

// Used for single-shot non-PDF file types (spreadsheets, images). PDFs go
// through the page-index-first flow and synthesize from the per-page index.
const SINGLE_SHOT_SUMMARY_PROMPT = `You are processing a construction document for a paving/concrete company.
Analyze this document and return a JSON object with exactly these fields:
{
  "overview": "2-4 sentence summary of what this document is and its main purpose",
  "documentType": "what type of document this is (e.g. Spec Book, Drawing, Schedule of Quantities, Geotechnical Report, Municipal Spec, Standard Drawing, Material Standard, DSSP, Traffic Control Plan, Addendum, etc.)",
  "keyTopics": ["array", "of", "key", "topics", "materials", "or", "requirements", "mentioned"]
}
Return only valid JSON, no markdown, no explanation.`;

export const MAX_MESSAGE_ATTEMPTS = 3;
// Delay before republishing on rate limit exhaustion: 2min, 4min, 8min
export const messageRetryDelayMs = (attempt: number) =>
  Math.min(8 * 60_000, 2 * 60_000 * 2 ** attempt);

// S3/Spaces "not found" classification. AWS SDK v2 surfaces NoSuchKey via
// `code`; newer SDKs and some wrappers use `name` or statusCode. Check all
// so a source-file-missing error lands cleanly in the orphaned branch.
export function isStorageNotFoundError(err: unknown): boolean {
  const e = err as
    | { code?: string; statusCode?: number; name?: string; message?: string }
    | null
    | undefined;
  if (!e) return false;
  if (e.code === "NoSuchKey" || e.code === "NotFound") return true;
  if (e.name === "NoSuchKey" || e.name === "NotFound") return true;
  if (e.statusCode === 404) return true;
  return false;
}

async function markOrphaned(
  documentIdStr: string,
  reason: string
): Promise<void> {
  await Enrichment.updateOne(
    { documentId: new mongoose.Types.ObjectId(documentIdStr) },
    {
      $set: { status: "orphaned", summaryError: reason },
      $unset: { processingStartedAt: "", summaryProgress: "" },
    }
  );
}

export const enrichedFileSummaryHandler = {
  async handle(message: EnrichedFileSummaryMessage): Promise<void> {
    const { enrichedFileId, fileId, attempt = 0 } = message;
    // enrichedFileId === documentId (invariant from B11-B16 migration)
    const documentId = new mongoose.Types.ObjectId(enrichedFileId);

    console.log(
      `[EnrichedFileSummary] Processing file ${fileId} (enrichedFile ${enrichedFileId}, attempt ${attempt})`
    );

    // Atomic ownership claim. processingVersion is incremented on every
    // successful claim; all subsequent writes in this handler run must
    // match this version or they no-op, so a zombie handler can't clobber
    // newer state. See claimEnrichment for the full predicate.
    const claimed = await claimEnrichment(enrichedFileId);

    if (!claimed) {
      const current = await Enrichment.findOne({ documentId }).lean();
      if (!current) {
        console.warn(
          `[EnrichedFileSummary] Enrichment for ${enrichedFileId} not found — skipping`
        );
        return;
      }
      console.log(
        `[EnrichedFileSummary] File ${enrichedFileId} not claimable (status=${current.status}) — skipping duplicate delivery`
      );
      return;
    }

    const claimedVersion = claimed.processingVersion ?? 1;
    // Already-indexed pages from a prior claim — used as resume seed so a
    // restart doesn't re-pay the Claude tokens we already spent.
    const existingPageIndex = (claimed.pageIndex ?? []) as PageIndexEntry[];

    // Resolve the original filename for the summarizer hint.
    // Document.currentFileId points to the File record with originalFilename.
    let originalFilename: string | null = null;
    try {
      const doc = await DocumentModel.findById(enrichedFileId).lean();
      if (doc) {
        const fileDoc = await File.findById(doc.currentFileId).lean();
        originalFilename = (fileDoc as any)?.originalFilename ?? (fileDoc as any)?.description ?? null;
      }
    } catch {
      // Best-effort — a missing hint doesn't break summarization
    }

    try {
      // Fetch the source file. Missing storage → orphaned (terminal).
      // Any other error falls through to the transient-failure handler.
      let s3Object: Awaited<ReturnType<typeof getFile>>;
      try {
        s3Object = await getFile(fileId);
      } catch (err) {
        if (isStorageNotFoundError(err)) {
          console.warn(
            `[EnrichedFileSummary] File ${fileId} missing from storage — marking orphaned`
          );
          await markOrphaned(
            enrichedFileId,
            "Source file not found in storage"
          );
          return;
        }
        throw err;
      }

      if (!s3Object?.Body) {
        await markOrphaned(enrichedFileId, "Source file body is empty");
        return;
      }

      const buffer = s3Object.Body as Buffer;
      const contentType = (s3Object.ContentType || "application/pdf") as string;
      const base64 = buffer.toString("base64");

      const lowerFileId = fileId.toLowerCase();

      const isSpreadsheet =
        contentType.includes("spreadsheet") ||
        contentType.includes("excel") ||
        contentType.includes("ms-excel") ||
        lowerFileId.endsWith(".xlsx") ||
        lowerFileId.endsWith(".xls");

      const isImage = contentType.startsWith("image/");

      // Modern Word format (OOXML). Handled via mammoth text extraction →
      // single Claude call, same pattern as spreadsheets. Legacy .doc
      // binary format is intentionally unsupported — mammoth can't parse
      // it and the format is rare in 2026. Users with .doc files are
      // expected to save as .docx. The client upload accept list only
      // advertises .docx to prevent surprises.
      const isWordDoc =
        contentType.includes("wordprocessingml") ||
        lowerFileId.endsWith(".docx");

      // Page count via pdf-lib for accuracy. Regex on raw buffer was the
      // old heuristic — inaccurate for malformed PDFs and files with
      // embedded sub-documents. Falls back to regex if pdf-lib fails to
      // parse the page tree (some PDFs have malformed page dictionaries
      // pdf-lib rejects but Claude's renderer accepts).
      let pageCount: number | undefined;
      if (!isSpreadsheet && !isImage && !isWordDoc) {
        try {
          const pdfDoc = await PDFDocument.load(buffer, {
            ignoreEncryption: true,
          });
          pageCount = pdfDoc.getPageCount();
        } catch {
          const pdfText = buffer.toString("binary");
          const pageMatches = pdfText.match(/\/Type\s*\/Page(?!s)/g);
          if (pageMatches && pageMatches.length > 0) {
            pageCount = pageMatches.length;
          }
        }
      }

      // ── Generate summary ────────────────────────────────────────────
      // Non-PDF paths (spreadsheet, image) produce a DocumentSummary from
      // a single Claude call. PDFs go through the page-index-first flow:
      //   (a) generate per-page descriptions with checkpointed resume,
      //   (b) synthesize the high-level summary from those descriptions.
      // The old chunked-PDF-summary path sent every page twice (once for
      // the summary chunks, once for the per-page index) — ~50% wasted
      // tokens. New flow sends each page exactly once.
      let summary: DocumentSummary;
      let pageIndex: PageIndexEntry[] | undefined;

      if (isSpreadsheet) {
        const xlsx = await import("xlsx");
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheets = workbook.SheetNames.map((name) => {
          const ws = workbook.Sheets[name];
          return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
        }).join("\n\n");
        const response = await withRateLimitRetry(
          () =>
            anthropic.messages.create({
              model: "claude-haiku-4-5",
              max_tokens: 512,
              messages: [
                {
                  role: "user",
                  content: `${SINGLE_SHOT_SUMMARY_PROMPT}\n\nDocument content:\n${sheets.slice(
                    0,
                    50000
                  )}`,
                },
              ],
            }),
          "spreadsheet"
        );
        const text =
          response.content[0]?.type === "text"
            ? response.content[0].text.trim()
            : "";
        const cleaned = text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        try {
          summary = JSON.parse(cleaned);
        } catch {
          throw new Error(
            `Claude returned invalid JSON: ${text.slice(0, 200)}`
          );
        }
      } else if (isImage) {
        const response = await withRateLimitRetry(
          () =>
            anthropic.messages.create({
              model: "claude-haiku-4-5",
              max_tokens: 512,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text" as const, text: SINGLE_SHOT_SUMMARY_PROMPT },
                    {
                      type: "image" as const,
                      source: {
                        type: "base64" as const,
                        media_type: contentType as
                          | "image/jpeg"
                          | "image/png"
                          | "image/webp"
                          | "image/gif",
                        data: base64,
                      },
                    },
                  ],
                },
              ],
            }),
          "image"
        );
        const text =
          response.content[0]?.type === "text"
            ? response.content[0].text.trim()
            : "";
        const cleaned = text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        try {
          summary = JSON.parse(cleaned);
        } catch {
          throw new Error(
            `Claude returned invalid JSON: ${text.slice(0, 200)}`
          );
        }
      } else if (isWordDoc) {
        // Extract raw text via mammoth, then summarize with a single
        // Claude call — same pattern as the spreadsheet branch. Text is
        // sliced to 50k chars to stay well within Claude's context.
        // Using require rather than dynamic import to avoid ES-module
        // interop issues in the ts-node runtime (matches the pdf-parse
        // pattern used elsewhere in this file's dependencies).
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mammoth = require("mammoth");
        const { value: text, messages: warnings } =
          (await mammoth.extractRawText({ buffer })) as {
            value: string;
            messages: Array<{ message: string }>;
          };

        if (warnings && warnings.length > 0) {
          console.warn(
            `[EnrichedFileSummary] mammoth warnings for ${fileId}:`,
            warnings.slice(0, 5).map((w) => w.message)
          );
        }

        if (!text || text.trim().length === 0) {
          throw new Error("Word document has no extractable text content");
        }

        const response = await withRateLimitRetry(
          () =>
            anthropic.messages.create({
              model: "claude-haiku-4-5",
              max_tokens: 512,
              messages: [
                {
                  role: "user",
                  content: `${SINGLE_SHOT_SUMMARY_PROMPT}\n\nDocument content:\n${text.slice(
                    0,
                    50000
                  )}`,
                },
              ],
            }),
          "word-doc"
        );
        const responseText =
          response.content[0]?.type === "text"
            ? response.content[0].text.trim()
            : "";
        const cleaned = responseText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        try {
          summary = JSON.parse(cleaned);
        } catch {
          throw new Error(
            `Claude returned invalid JSON: ${responseText.slice(0, 200)}`
          );
        }
      } else {
        // ── PDF: Phase A — generate page index with checkpoints ─────
        // resumeFrom carries any pages already indexed in a prior claim,
        // so a crash mid-loop doesn't re-pay the Claude tokens we already
        // spent. Checkpoints every 5 pages persist pageIndex + progress.
        console.log(
          `[EnrichedFileSummary] Generating page index for file ${fileId}...`
        );
        pageIndex = await generatePageIndex(anthropic, buffer, {
          resumeFrom: existingPageIndex,
          checkpointEveryPages: 5,
          onCheckpoint: async ({ pageIndex: pi, current, total }) => {
            await Enrichment.findOneAndUpdate(
              {
                documentId,
                processingVersion: claimedVersion,
              },
              {
                $set: {
                  pageIndex: pi,
                  summaryProgress: {
                    phase: "page_index",
                    current,
                    total,
                    updatedAt: new Date(),
                  },
                },
              }
            );
          },
        });

        // ── PDF: Phase B — synthesize summary from the page index ───
        // Brief phase transition so the UI shows "Synthesizing" while
        // the final Claude call runs. current=0/total=1 renders as an
        // indeterminate bar in the progress component.
        await Enrichment.findOneAndUpdate(
          { documentId, processingVersion: claimedVersion },
          {
            $set: {
              summaryProgress: {
                phase: "summary",
                current: 0,
                total: 1,
                updatedAt: new Date(),
              },
            },
          }
        );

        if (pageIndex.length === 0) {
          // pdf-lib couldn't parse the page tree (e.g. markup-heavy takeoff
          // PDFs with non-standard catalog structures). Fall back to sending
          // the raw PDF to Claude for a single-shot summary — no page index,
          // but at least we get a usable summary + documentType.
          console.warn(
            `[EnrichedFileSummary] Page index empty for ${fileId} — falling back to single-shot PDF summary`
          );
          const response = await withRateLimitRetry(
            () =>
              anthropic.messages.create({
                model: "claude-haiku-4-5",
                max_tokens: 512,
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text" as const,
                        text: SINGLE_SHOT_SUMMARY_PROMPT,
                      },
                      {
                        type: "document" as any,
                        source: {
                          type: "base64" as const,
                          media_type: "application/pdf" as const,
                          data: buffer.toString("base64"),
                        },
                      },
                    ],
                  },
                ],
              }),
            "pdf-fallback"
          );
          const text =
            response.content[0]?.type === "text"
              ? response.content[0].text.trim()
              : "";
          const cleaned = text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
          try {
            summary = JSON.parse(cleaned);
          } catch {
            throw new Error(
              `Claude returned invalid JSON for PDF fallback: ${text.slice(0, 200)}`
            );
          }
        } else {
          console.log(
            `[EnrichedFileSummary] Synthesizing summary from ${pageIndex.length} page descriptions for file ${fileId}...`
          );
          summary = await synthesizeSummaryFromPageIndex(
            anthropic,
            pageIndex,
            originalFilename
          );
        }
      }

      // ── Terminal state ──────────────────────────────────────────────
      // All paths converge here. pageIndex is set for PDFs, undefined for
      // spreadsheets/images. Guarded by processingVersion so a zombie
      // handler can't stomp on newer state.
      await Enrichment.findOneAndUpdate(
        { documentId, processingVersion: claimedVersion },
        {
          $set: {
            summary,
            status: "ready",
            ...(pageCount !== undefined ? { pageCount } : {}),
            ...(pageIndex !== undefined ? { pageIndex } : {}),
          },
          $unset: {
            processingStartedAt: "",
            summaryError: "",
            summaryProgress: "",
          },
        }
      );

      console.log(`[EnrichedFileSummary] Done for file ${fileId}`);

      // ── Trigger tender-level regeneration ───────────────────────────
      // Two things piggyback on a file reaching ready:
      //   1. Tender summary — only when every file on the tender has
      //      reached a terminal success state (partial/pending/processing
      //      all block it, because they'll still change the summary)
      //   2. Document categorization — on every file transition, 60s
      //      debounced. Burst uploads collapse into one Claude call.
      //      Partial files don't block categorization because they
      //      already have a usable summary.
      try {
        const tender = await Tender.findOne({ files: enrichedFileId }).lean();
        if (tender) {
          const tenderIdStr = (tender as any)._id.toString();

          // Always schedule categorization — the debounce ensures we
          // don't thrash on batch uploads, and a new file is exactly
          // when the folder structure may need to change.
          scheduleCategorization(tenderIdStr);

          const fileIds = ((tender as any).files as any[]).map((f: any) =>
            f._id ? new mongoose.Types.ObjectId(f._id.toString()) : new mongoose.Types.ObjectId(f.toString())
          );
          const pendingCount = await Enrichment.countDocuments({
            documentId: { $in: fileIds },
            status: {
              $in: ["pending", "processing", "partial"],
            },
          });
          if (pendingCount === 0) {
            console.log(
              `[EnrichedFileSummary] All tender files ready — scheduling summary for tender ${tenderIdStr}`
            );
            scheduleTenderSummary(tenderIdStr);
          }
        }
      } catch (triggerErr) {
        console.warn(
          "[EnrichedFileSummary] Tender-level trigger check failed:",
          triggerErr
        );
      }
    } catch (error) {
      if (
        error instanceof RateLimitExhaustedError &&
        attempt < MAX_MESSAGE_ATTEMPTS
      ) {
        const delayMs = messageRetryDelayMs(attempt);
        console.warn(
          `[EnrichedFileSummary] Rate limit exhausted for file ${fileId} (attempt ${attempt}). ` +
            `Retrying in ${delayMs / 60_000} min...`
        );
        // Reset state *before* publish. If publish fails, the file is
        // already in "pending" with no processingStartedAt — the watchdog
        // will pick it up on its next pass. Clearing summaryProgress too
        // so the UI doesn't show stale progress during the backoff.
        await Enrichment.updateOne(
          { documentId },
          {
            $set: { status: "pending" },
            $unset: {
              processingStartedAt: "",
              summaryError: "",
              summaryProgress: "",
            },
          }
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const published = await publishEnrichedFileCreated(
          enrichedFileId,
          fileId,
          attempt + 1
        );
        if (!published) {
          throw new Error(
            `Failed to republish after rate limit for file ${fileId}. ` +
              `Watchdog will recover on next pass.`
          );
        }
        return;
      }

      console.error(`[EnrichedFileSummary] Failed for file ${fileId}:`, error);
      const summaryError =
        error instanceof Error ? error.message : String(error);

      // If we've made progress on the page index (pageIndex has entries
      // from a prior checkpoint), mark as "partial" so the watchdog's
      // retry can resume from where we left off. Otherwise transient
      // failure — mark "failed" and let the normal retry flow take over.
      const current = await Enrichment.findOne({ documentId }).lean();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const persistedPages = ((current as any)?.pageIndex ?? []) as PageIndexEntry[];
      const status = persistedPages.length > 0 ? "partial" : "failed";

      await Enrichment.updateOne(
        { documentId },
        {
          $set: { status, summaryError },
          $unset: { processingStartedAt: "", summaryProgress: "" },
        }
      );
      throw error;
    }
  },
};
