import Anthropic from "@anthropic-ai/sdk";
import { EnrichedFile } from "@models";
import { getFile } from "@utils/fileStorage";
import type { EnrichedFileSummaryMessage } from "../../rabbitmq/publisher";
import { summarizePdf, DocumentSummary, withRateLimitRetry } from "./summarizePdf";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARY_PROMPT = `You are processing a construction document for a paving/concrete company.
Analyze this document and return a JSON object with exactly these fields:
{
  "overview": "2-4 sentence summary of what this document is and its main purpose",
  "documentType": "what type of document this is (e.g. Spec Book, Drawing, Schedule of Quantities, Geotechnical Report, Municipal Spec, Standard Drawing, Material Standard, DSSP, Traffic Control Plan, Addendum, etc.)",
  "keyTopics": ["array", "of", "key", "topics", "materials", "or", "requirements", "mentioned"]
}
Return only valid JSON, no markdown, no explanation.`;

export const enrichedFileSummaryHandler = {
  async handle(message: EnrichedFileSummaryMessage): Promise<void> {
    const { enrichedFileId, fileId } = message;
    console.log(`[EnrichedFileSummary] Processing file ${fileId} (enrichedFile ${enrichedFileId})`);

    await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
      $set: { summaryStatus: "processing" },
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
          summaryStatus: "ready",
          ...(pageCount !== undefined ? { pageCount } : {}),
        },
      });

      console.log(`[EnrichedFileSummary] Done for file ${fileId}`);
    } catch (error) {
      console.error(`[EnrichedFileSummary] Failed for file ${fileId}:`, error);
      const summaryError = error instanceof Error ? error.message : String(error);
      await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
        $set: { summaryStatus: "failed", summaryError },
      });
      throw error;
    }
  },
};
