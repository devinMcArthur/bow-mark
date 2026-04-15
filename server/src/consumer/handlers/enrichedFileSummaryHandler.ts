import Anthropic from "@anthropic-ai/sdk";
import { EnrichedFile, Tender } from "@models";
import { getFile } from "@utils/fileStorage";
import type { EnrichedFileSummaryMessage } from "../../rabbitmq/publisher";
import { summarizePdf, DocumentSummary, withRateLimitRetry, RateLimitExhaustedError, generatePageIndex } from "./summarizePdf";
import { publishEnrichedFileCreated } from "../../rabbitmq/publisher";
import { scheduleTenderSummary } from "../../lib/generateTenderSummary";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Matches PROCESSING_STUCK_MS in consumer/index.ts. If a message arrives
// while another handler is already processing the file, we bail as long as
// that handler is inside its processing window. After the window elapses,
// the watchdog treats the file as orphaned and any redelivered message is
// free to take ownership.
const HANDLER_OWNERSHIP_WINDOW_MS = 90 * 60_000;

const SUMMARY_PROMPT = `You are processing a construction document for a paving/concrete company.
Analyze this document and return a JSON object with exactly these fields:
{
  "overview": "2-4 sentence summary of what this document is and its main purpose",
  "documentType": "what type of document this is (e.g. Spec Book, Drawing, Schedule of Quantities, Geotechnical Report, Municipal Spec, Standard Drawing, Material Standard, DSSP, Traffic Control Plan, Addendum, etc.)",
  "keyTopics": ["array", "of", "key", "topics", "materials", "or", "requirements", "mentioned"]
}
Return only valid JSON, no markdown, no explanation.`;

const MAX_MESSAGE_ATTEMPTS = 3;
// Delay before republishing on rate limit exhaustion: 2min, 4min, 8min
const messageRetryDelayMs = (attempt: number) => Math.min(8 * 60_000, 2 * 60_000 * 2 ** attempt);

export const enrichedFileSummaryHandler = {
  async handle(message: EnrichedFileSummaryMessage): Promise<void> {
    const { enrichedFileId, fileId, attempt = 0 } = message;
    console.log(`[EnrichedFileSummary] Processing file ${fileId} (enrichedFile ${enrichedFileId}, attempt ${attempt})`);

    // Idempotency guard — duplicate messages (from watchdog republish, broker
    // redelivery, rate-limit retry, etc.) must not clobber a file that has
    // already been processed or is actively being processed by another handler.
    // Without this, a duplicate for a "ready" file would flip it back to
    // "processing" and burn Claude tokens re-summarizing.
    const current = await EnrichedFile.findById(enrichedFileId).lean();
    if (!current) {
      console.warn(`[EnrichedFileSummary] File ${enrichedFileId} not found — skipping`);
      return;
    }
    if (current.summaryStatus === "ready") {
      console.log(`[EnrichedFileSummary] File ${enrichedFileId} already ready — skipping duplicate`);
      return;
    }
    if (current.summaryStatus === "failed") {
      // Explicit retries (tenderRetrySummary, rescan script) reset status to
      // "pending" before republishing, so a "failed" status at entry means
      // this is a stray redelivery of an already-failed attempt. Skip.
      console.log(`[EnrichedFileSummary] File ${enrichedFileId} is failed — skipping stray delivery`);
      return;
    }
    if (current.summaryStatus === "processing") {
      const startedAt = current.processingStartedAt?.getTime() ?? 0;
      const ageMs = Date.now() - startedAt;
      if (ageMs < HANDLER_OWNERSHIP_WINDOW_MS) {
        console.log(
          `[EnrichedFileSummary] File ${enrichedFileId} already owned by another handler (${Math.round(ageMs / 1000)}s ago) — skipping duplicate`
        );
        return;
      }
      // Ownership window elapsed — the previous handler is presumed dead.
      // Fall through and take over.
      console.warn(
        `[EnrichedFileSummary] File ${enrichedFileId} was in processing for ${Math.round(ageMs / 60_000)}min — taking ownership`
      );
    }

    await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
      $set: {
        summaryStatus: "processing",
        processingStartedAt: new Date(),
      },
      $inc: { summaryAttempts: 1 },
    });

    try {
      const s3Object = await getFile(fileId);
      if (!s3Object?.Body) throw new Error("File body is empty");

      const buffer = s3Object.Body as Buffer;
      const contentType = (s3Object.ContentType || "application/pdf") as string;
      const base64 = buffer.toString("base64");

      const isSpreadsheet =
        contentType.includes("spreadsheet") ||
        contentType.includes("excel") ||
        contentType.includes("ms-excel") ||
        fileId.toLowerCase().endsWith(".xlsx") ||
        fileId.toLowerCase().endsWith(".xls");

      let summary: DocumentSummary;

      if (isSpreadsheet) {
        const xlsx = await import("xlsx");
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheets = workbook.SheetNames.map((name) => {
          const ws = workbook.Sheets[name];
          return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
        }).join("\n\n");
        const response = await withRateLimitRetry(
          () => anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 512,
            messages: [{ role: "user", content: `${SUMMARY_PROMPT}\n\nDocument content:\n${sheets.slice(0, 50000)}` }],
          }),
          "spreadsheet"
        );
        const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
        const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        try {
          summary = JSON.parse(cleaned);
        } catch {
          throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
        }
      } else if (contentType.startsWith("image/")) {
        const response = await withRateLimitRetry(
          () => anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 512,
            messages: [{
              role: "user",
              content: [
                { type: "text" as const, text: SUMMARY_PROMPT },
                {
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                    data: base64,
                  },
                },
              ],
            }],
          }),
          "image"
        );
        const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
        const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        try {
          summary = JSON.parse(cleaned);
        } catch {
          throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
        }
      } else {
        // PDF — chunked to handle large documents (e.g. 500-page spec books)
        summary = await summarizePdf(anthropic, buffer, SUMMARY_PROMPT);
      }

      // Count PDF pages from raw buffer
      let pageCount: number | undefined;
      if (!isSpreadsheet && !contentType.startsWith("image/")) {
        const pdfText = buffer.toString("binary");
        const pageMatches = pdfText.match(/\/Type\s*\/Page(?!s)/g);
        if (pageMatches && pageMatches.length > 0) {
          pageCount = pageMatches.length;
        }
      }

      await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
        $set: {
          summary,
          ...(pageCount !== undefined ? { pageCount } : {}),
        },
      });

      // Generate page-level index for PDFs (not spreadsheets or images)
      // summaryStatus is set to "ready" only after both summary and page index are complete
      if (!isSpreadsheet && !contentType.startsWith("image/")) {
        try {
          console.log(`[EnrichedFileSummary] Generating page index for file ${fileId}...`);
          const pageIndex = await generatePageIndex(anthropic, buffer);
          if (pageIndex.length > 0) {
            await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
              $set: { pageIndex },
            });
            console.log(`[EnrichedFileSummary] Page index saved: ${pageIndex.length} pages for file ${fileId}`);
          }
        } catch (indexErr) {
          // Non-fatal — document is still usable without page index
          console.warn(`[EnrichedFileSummary] Page index generation failed for file ${fileId}:`, indexErr);
        }
      }

      await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
        $set: { summaryStatus: "ready" },
        $unset: { processingStartedAt: "", summaryError: "" },
      });

      // Trigger tender summary regeneration if this file belongs to a tender
      // and all of that tender's files are now ready
      try {
        const tender = await Tender.findOne({ files: enrichedFileId }).lean();
        if (tender) {
          const fileIds = ((tender as any).files as any[]).map((f: any) =>
            f._id ? f._id.toString() : f.toString()
          );
          const pendingCount = await EnrichedFile.countDocuments({
            _id: { $in: fileIds },
            summaryStatus: { $in: ["pending", "processing"] },
          });
          if (pendingCount === 0) {
            console.log(`[EnrichedFileSummary] All tender files ready — scheduling summary for tender ${(tender as any)._id}`);
            scheduleTenderSummary((tender as any)._id.toString());
          }
        }
      } catch (triggerErr) {
        // Non-fatal — document is still fully processed without the tender summary
        console.warn("[EnrichedFileSummary] Tender summary trigger check failed:", triggerErr);
      }

      console.log(`[EnrichedFileSummary] Done for file ${fileId}`);
    } catch (error) {
      if (error instanceof RateLimitExhaustedError && attempt < MAX_MESSAGE_ATTEMPTS) {
        const delayMs = messageRetryDelayMs(attempt);
        console.warn(
          `[EnrichedFileSummary] Rate limit exhausted for file ${fileId} (attempt ${attempt}). ` +
          `Retrying in ${delayMs / 60_000} min...`
        );
        await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
          $set: { summaryStatus: "pending" },
          $unset: { processingStartedAt: "", summaryError: "" },
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const published = await publishEnrichedFileCreated(enrichedFileId, fileId, attempt + 1);
        if (!published) {
          // Broker unavailable — throw so current message is nack'd and redelivered
          // by broker, or caught by the watchdog on its next pass.
          throw new Error(
            `Failed to republish after rate limit for file ${fileId}. ` +
            `Watchdog will recover on next pass.`
          );
        }
        return;
      }

      console.error(`[EnrichedFileSummary] Failed for file ${fileId}:`, error);
      const summaryError = error instanceof Error ? error.message : String(error);
      await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
        $set: { summaryStatus: "failed", summaryError },
        $unset: { processingStartedAt: "" },
      });
      throw error;
    }
  },
};
