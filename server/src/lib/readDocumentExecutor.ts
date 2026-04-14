/**
 * Shared read_document tool executor for document-based chat contexts
 * (tender chat, jobsite chat).
 *
 * Returns an executeTool function that:
 *   - Looks up a file by its enrichedFile _id in the provided file list
 *   - Fetches the file from S3
 *   - Handles PDF (with page range slicing), spreadsheet (CSV), and image content
 *   - Enforces a per-turn PDF page budget to stay under Anthropic's 100-page limit
 *   - Deduplicates reloads of the same document + page range within a turn
 */

// IMPORTANT: Do NOT delete this file. It is still imported by:
//   - server/src/router/foreman-jobsite-chat.ts
//   - server/src/router/pm-jobsite-chat.ts
// Tender chat has migrated to the centralized MCP server (server/src/mcp/tools/tender.ts).
// The two jobsite chats above will follow in a separate effort — until then, this file
// is the only doc-tool implementation they have.

import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { getFile } from "@utils/fileStorage";
import { ToolExecutionResult } from "./streamConversation";

export const READ_DOCUMENT_TOOL: Anthropic.Tool = {
  name: "read_document",
  description:
    "Load the contents of one specific document. For large documents (spec books, etc.) only a page range is loaded at a time — the response will tell you the total page count so you can request other sections if needed. IMPORTANT: Call this tool for ONE document at a time only — never request multiple documents in the same response.",
  input_schema: {
    type: "object" as const,
    properties: {
      file_object_id: {
        type: "string",
        description: "The _id of the file object from the document list",
      },
      start_page: {
        type: "number",
        description: "First page to read (1-indexed, inclusive). Omit to start from the beginning.",
      },
      end_page: {
        type: "number",
        description: "Last page to read (1-indexed, inclusive). Omit to read as far as the size limit allows.",
      },
    },
    required: ["file_object_id"],
  },
};

export const LIST_DOCUMENT_PAGES_TOOL: Anthropic.Tool = {
  name: "list_document_pages",
  description:
    "Returns a page-by-page index for a specific document — one line per page with a brief description of its content. Use this BEFORE read_document to identify exactly which pages contain the information you need. Much cheaper than loading the full document.",
  input_schema: {
    type: "object" as const,
    properties: {
      file_object_id: {
        type: "string",
        description: "The _id of the file object from the document list",
      },
    },
    required: ["file_object_id"],
  },
};

const MAX_READABLE_PDF_BYTES = 3 * 1024 * 1024; // ~4 MB base64 after encoding
const PDF_PAGE_LIMIT = 90; // conservative buffer below Anthropic's 100-page hard limit

/**
 * Returns an executeTool function scoped to the given file list.
 * The page budget and dedup set are per-request (reset each call to this factory).
 *
 * @param allFiles - Flat array of enriched file objects from all sources
 *                   (e.g. [...tenderFiles, ...specFiles]). Each item must have:
 *                   `_id`, `file` (ref or populated object with `_id`),
 *                   `documentType`, `summary?.documentType`, `pageCount`
 */
export function makeReadDocumentExecutor(
  allFiles: any[]
): (name: string, input: Record<string, unknown>) => Promise<ToolExecutionResult> {
  let pdfPagesLoaded = 0;
  const loadedRangeKeys = new Set<string>();

  return async (_name: string, rawInput: Record<string, unknown>): Promise<ToolExecutionResult> => {
    // ── list_document_pages ────────────────────────────────────────────────
    if (_name === "list_document_pages") {
      const fileId = rawInput.file_object_id as string;
      const fileObj = allFiles.find((f: any) => f._id.toString() === fileId);
      if (!fileObj) throw new Error(`File ${fileId} not found`);

      const docLabel =
        (fileObj.summary as any)?.documentType || fileObj.documentType || "Document";
      const pageIndex = fileObj.pageIndex as Array<{ page: number; summary: string }> | undefined;

      if (!pageIndex || pageIndex.length === 0) {
        return {
          content: `No page index is available for "${docLabel}" yet. Use read_document to load pages directly.`,
          summary: `No page index for ${docLabel}`,
        };
      }

      const lines = pageIndex.map((e) => `p.${e.page}: ${e.summary}`).join("\n");
      return {
        content: `Page index for "${docLabel}" (${pageIndex.length} pages total):\n\n${lines}`,
        summary: `Listed ${pageIndex.length} pages for ${docLabel}`,
      };
    }

    // ── read_document (existing logic below) ──────────────────────────────
    const input = rawInput as { file_object_id: string; start_page?: number; end_page?: number };

    const fileObj = allFiles.find((f: any) => f._id.toString() === input.file_object_id);
    if (!fileObj) throw new Error(`File ${input.file_object_id} not found`);
    if (!fileObj.file) throw new Error(`File reference missing for ${input.file_object_id}`);

    const fileId =
      typeof fileObj.file === "object" && (fileObj.file as any)._id
        ? (fileObj.file as any)._id.toString()
        : (fileObj.file as any).toString();

    const docLabel = (fileObj.summary as any)?.documentType || fileObj.documentType || "Document";

    // Deduplicate same document + page range within this turn
    const rangeKey = `${fileId}:${input.start_page ?? 0}:${input.end_page ?? "end"}`;
    if (loadedRangeKeys.has(rangeKey)) {
      throw new Error(`Document "${docLabel}" (same page range) is already loaded in this conversation turn.`);
    }

    // Pre-flight page budget check
    const docPageCount = fileObj.pageCount ?? 0;
    const requestedPages =
      input.end_page && input.start_page ? input.end_page - input.start_page + 1 : docPageCount;
    const estimatedPages = Math.min(requestedPages || docPageCount, docPageCount || requestedPages);
    if (estimatedPages > 0 && pdfPagesLoaded + estimatedPages > PDF_PAGE_LIMIT) {
      throw new Error(
        `Cannot load "${docLabel}" — this turn has already used ${pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit. ` +
          `Please answer based on what has already been loaded, or let the user know they should ask about one document at a time.`
      );
    }

    const s3Object = await getFile(fileId);
    if (!s3Object?.Body) throw new Error("File body empty");

    const buffer = s3Object.Body as Buffer;
    const contentType = s3Object.ContentType || "application/pdf";

    const isSpreadsheet =
      contentType.includes("spreadsheet") ||
      contentType.includes("excel") ||
      contentType.includes("ms-excel");

    let content: Anthropic.ToolResultBlockParam["content"];
    let summary: string;

    if (isSpreadsheet) {
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const text = workbook.SheetNames.map((name) => {
        const ws = workbook.Sheets[name];
        return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
      }).join("\n\n");
      content = `Document: ${docLabel}\n\n${text}`;
      summary = `Loaded document: ${docLabel}`;
      if (docPageCount > 0) pdfPagesLoaded += docPageCount;
      loadedRangeKeys.add(rangeKey);
    } else if (contentType.startsWith("image/")) {
      const base64 = buffer.toString("base64");
      content = [
        { type: "text" as const, text: `Document: ${docLabel}` },
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: base64,
          },
        },
      ];
      summary = `Loaded document: ${docLabel}`;
      if (docPageCount > 0) pdfPagesLoaded += docPageCount;
      loadedRangeKeys.add(rangeKey);
    } else {
      // PDF — extract only the requested page range, bisecting if too large
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();

      let startIdx = input.start_page ? Math.max(0, input.start_page - 1) : 0;
      let endIdx = input.end_page ? Math.min(input.end_page, totalPages) : totalPages;

      let pdfChunk: Buffer;
      while (true) {
        const indices = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i);
        const chunkDoc = await PDFDocument.create();
        const pages = await chunkDoc.copyPages(pdfDoc, indices);
        for (const page of pages) chunkDoc.addPage(page);
        pdfChunk = Buffer.from(await chunkDoc.save());
        if (pdfChunk.length <= MAX_READABLE_PDF_BYTES || endIdx - startIdx <= 1) break;
        endIdx = startIdx + Math.floor((endIdx - startIdx) / 2);
      }

      const pagesRead = endIdx - startIdx;

      // Post-read page budget check (actual pages may differ from estimate)
      if (pdfPagesLoaded + pagesRead > PDF_PAGE_LIMIT) {
        throw new Error(
          `Cannot load "${docLabel}" (${pagesRead} pages) — this turn has already used ${pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit.`
        );
      }

      const pageNote =
        totalPages > pagesRead
          ? `Pages ${startIdx + 1}–${endIdx} of ${totalPages} total. Use start_page/end_page to read other sections.`
          : `All ${totalPages} pages.`;

      content = [
        {
          type: "text" as const,
          text: `Document: ${docLabel}\n${pageNote}\nWhen citing this document use the filename: "${docLabel}"`,
        },
        {
          type: "document" as any,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: pdfChunk.toString("base64"),
          },
        },
      ];

      summary = `Loaded document: ${docLabel} (${pageNote})`;
      if (docPageCount > 0) pdfPagesLoaded += pagesRead;
      loadedRangeKeys.add(rangeKey);
    }

    return { content, summary };
  };
}
