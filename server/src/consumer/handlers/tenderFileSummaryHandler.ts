// server/src/consumer/handlers/tenderFileSummaryHandler.ts
import Anthropic from "@anthropic-ai/sdk";
import { Tender } from "@models";
import { getFile } from "@utils/fileStorage";
import type { TenderFileSummaryMessage } from "../../rabbitmq/publisher";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARY_PROMPT = `You are processing a construction tender document for a paving/concrete company.
Analyze this document and return a JSON object with exactly these fields:
{
  "overview": "2-4 sentence summary of what this document is and its main purpose",
  "documentType": "what type of document this is (e.g. Spec Book, Drawing, Schedule of Quantities, Geotechnical Report, DSSP, Traffic Control Plan, Addendum, etc.)",
  "keyTopics": ["array", "of", "key", "topics", "materials", "or", "requirements", "mentioned"]
}
Return only valid JSON, no markdown, no explanation.`;

export const tenderFileSummaryHandler = {
  async handle(message: TenderFileSummaryMessage): Promise<void> {
    const { tenderId, fileObjectId, fileId } = message;
    console.log(`[TenderSummary] Processing file ${fileId} for tender ${tenderId}`);

    await Tender.findOneAndUpdate(
      { _id: tenderId, "files._id": fileObjectId },
      { $set: { "files.$.summaryStatus": "processing" } }
    );

    try {
      const s3Object = await getFile(fileId);
      if (!s3Object?.Body) throw new Error("File body is empty");

      const buffer = s3Object.Body as Buffer;
      const contentType = (s3Object.ContentType || "application/pdf") as string;
      const base64 = buffer.toString("base64");

      let messageContent: Anthropic.MessageParam["content"];

      if (contentType.includes("spreadsheet") || contentType.includes("excel") || contentType.includes("ms-excel")) {
        const xlsx = await import("xlsx");
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheets = workbook.SheetNames.map((name) => {
          const ws = workbook.Sheets[name];
          return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
        }).join("\n\n");
        messageContent = `${SUMMARY_PROMPT}\n\nDocument content:\n${sheets.slice(0, 50000)}`;
      } else if (contentType.startsWith("image/")) {
        messageContent = [
          { type: "text" as const, text: SUMMARY_PROMPT },
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: base64,
            },
          },
        ];
      } else {
        // PDF
        messageContent = [
          { type: "text" as const, text: SUMMARY_PROMPT },
          {
            type: "document" as any,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64,
            },
          },
        ];
      }

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        messages: [{ role: "user", content: messageContent }],
      });

      const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

      // Strip markdown code fences if present
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      let summary: { overview: string; documentType: string; keyTopics: string[] };
      try {
        summary = JSON.parse(cleaned);
      } catch {
        throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
      }

      await Tender.findOneAndUpdate(
        { _id: tenderId, "files._id": fileObjectId },
        { $set: { "files.$.summary": summary, "files.$.summaryStatus": "ready" } }
      );

      console.log(`[TenderSummary] Done for file ${fileId}`);
    } catch (error) {
      console.error(`[TenderSummary] Failed for file ${fileId}:`, error);
      await Tender.findOneAndUpdate(
        { _id: tenderId, "files._id": fileObjectId },
        { $set: { "files.$.summaryStatus": "failed" } }
      );
      throw error;
    }
  },
};
