// @ts-nocheck — TypeScript 5.x OOMs on deeply chained Zod+Kysely types
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import mongoose from "mongoose";
import { Tender as TenderModel, System, TenderPricingSheet } from "@models";
import { UserRoles } from "@typescript/user";
import { scheduleTenderSummary } from "../../lib/generateTenderSummary";
import { requireTenderContext } from "../context";
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { getFile } from "@utils/fileStorage";

export interface TenderToolsSessionState {
  pdfPagesLoaded: number;
  loadedRangeKeys: Set<string>;
}

export function makeSessionState(): TenderToolsSessionState {
  return { pdfPagesLoaded: 0, loadedRangeKeys: new Set() };
}

const MAX_READABLE_PDF_BYTES = 3 * 1024 * 1024;
const PDF_PAGE_LIMIT = 90;

// System.getSystem() populates specFiles.file — required by read_document for the file._id lookup.
// Do not replace with a plain System.findOne() without preserving that population.
async function loadTenderFiles(tenderId: string): Promise<any[]> {
  const [tender, sys] = await Promise.all([
    TenderModel.findById(tenderId)
      .populate({ path: "files", populate: { path: "file" } })
      .lean(),
    System.getSystem(),
  ]);
  if (!tender) throw new Error(`Tender ${tenderId} not found`);
  return [
    ...(((tender as any).files ?? []) as any[]),
    ...(((sys?.specFiles ?? []) as any[])),
  ];
}

function requirePmRole(): void {
  const ctx = requireTenderContext();
  if (ctx.role < UserRoles.ProjectManager) {
    throw new Error("Forbidden: PM or Admin role required");
  }
}

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function register(
  server: McpServer,
  sessionState: TenderToolsSessionState,
): void {
  // ── get_tender_pricing_rows ──────────────────────────────────────────────
  server.registerTool(
    "get_tender_pricing_rows",
    {
      description:
        "Read the full pricing schedule for the active tender — every schedule, group, and item with quantity, unit, status, notes, doc references, and pricing fields (unitPrice, markup, rate buildup outputs). Call this whenever you need to know the current state of the schedule of quantities before suggesting edits.",
      inputSchema: {},
    },
    async () => {
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) {
        return ok(JSON.stringify({ rows: [], totalRows: 0, defaultMarkupPct: null }));
      }

      const rows = sheet.rows.map((r: any) => ({
        rowId: r._id.toString(),
        type: r.type,
        sortOrder: r.sortOrder,
        itemNumber: r.itemNumber ?? "",
        description: r.description ?? "",
        indentLevel: r.indentLevel,
        status: r.status ?? "not_started",
        quantity: r.quantity ?? null,
        unit: r.unit ?? null,
        notes: r.notes ?? null,
        docRefs: (r.docRefs ?? []).map((d: any) => ({
          docRefId: d._id.toString(),
          enrichedFileId: d.enrichedFileId.toString(),
          page: d.page,
          description: d.description ?? null,
        })),
        unitPrice: r.unitPrice ?? null,
        markupOverride: r.markupOverride ?? null,
        extraUnitPrice: r.extraUnitPrice ?? null,
        extraUnitPriceMemo: r.extraUnitPriceMemo ?? null,
        hasTemplate: r.rateBuildupSnapshot != null,
        rateBuildupOutputs: (r.rateBuildupOutputs ?? []).map((o: any) => ({
          kind: o.kind,
          materialId: o.materialId?.toString() ?? null,
          crewKindId: o.crewKindId?.toString() ?? null,
          unit: o.unit,
          perUnitValue: o.perUnitValue,
          totalValue: o.totalValue,
        })),
      }));

      return ok(
        JSON.stringify({
          defaultMarkupPct: sheet.defaultMarkupPct,
          rows,
          totalRows: rows.length,
        }),
      );
    },
  );

  // ── save_tender_note ──────────────────────────────────────────────────────
  server.registerTool(
    "save_tender_note",
    {
      description:
        "Save an important piece of information to this tender's permanent job notes. " +
        "Only call this AFTER the user has confirmed they want to save it. " +
        'Always draft the note content in your message first and ask "Should I save that to the job notes?" before calling this tool. ' +
        "Never call this tool without explicit user confirmation.",
      inputSchema: {
        content: z.string().describe("The note text to save, as confirmed by the user."),
      },
    },
    async ({ content }) => {
      requirePmRole();
      const ctx = requireTenderContext();

      await (TenderModel as any).findByIdAndUpdate(ctx.tenderId, {
        $push: {
          notes: {
            _id: new mongoose.Types.ObjectId(),
            content,
            savedAt: new Date(),
            savedBy: new mongoose.Types.ObjectId(ctx.userId),
            conversationId: ctx.conversationId ?? "",
          },
        },
      });

      scheduleTenderSummary(ctx.tenderId);
      return ok(`Note saved: "${content}"`);
    },
  );

  // ── delete_tender_note ────────────────────────────────────────────────────
  server.registerTool(
    "delete_tender_note",
    {
      description:
        "Delete a previously saved note from this tender's job notes. " +
        "Only call this if the user explicitly asks to remove a specific note.",
      inputSchema: {
        noteId: z.string().describe("The _id of the note to delete."),
      },
    },
    async ({ noteId }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();

      const result = await (TenderModel as any).updateOne(
        { _id: tenderId },
        { $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId) } } },
      );

      if (result.modifiedCount === 0) {
        return ok(`Error: Note not found — nothing was deleted.`);
      }

      scheduleTenderSummary(tenderId);
      return ok("Note deleted.");
    },
  );

  // ── list_document_pages ───────────────────────────────────────────────────
  server.registerTool(
    "list_document_pages",
    {
      description:
        "Returns a page-by-page index for a specific document — one line per page with a brief description of its content. Use this BEFORE read_document to identify exactly which pages contain the information you need. Much cheaper than loading the full document.",
      inputSchema: {
        file_object_id: z
          .string()
          .describe("The _id of the file object from the document list"),
      },
    },
    async ({ file_object_id }) => {
      const { tenderId } = requireTenderContext();
      const allFiles = await loadTenderFiles(tenderId);
      const fileObj = allFiles.find((f: any) => f._id.toString() === file_object_id);
      if (!fileObj) throw new Error(`File ${file_object_id} not found`);

      const docLabel =
        (fileObj.summary as any)?.documentType || fileObj.documentType || "Document";
      const pageIndex = fileObj.pageIndex as
        | Array<{ page: number; summary: string }>
        | undefined;

      if (!pageIndex || pageIndex.length === 0) {
        return ok(
          `No page index is available for "${docLabel}" yet. Use read_document to load pages directly.`,
        );
      }

      const lines = pageIndex.map((e) => `p.${e.page}: ${e.summary}`).join("\n");
      return ok(
        `Page index for "${docLabel}" (${pageIndex.length} pages total):\n\n${lines}`,
      );
    },
  );

  // ── read_document ────────────────────────────────────────────────────────
  server.registerTool(
    "read_document",
    {
      description:
        "Load the contents of one specific document. For large documents (spec books, etc.) only a page range is loaded at a time — the response will tell you the total page count so you can request other sections if needed. IMPORTANT: Call this tool for ONE document at a time only — never request multiple documents in the same response.",
      inputSchema: {
        file_object_id: z
          .string()
          .describe("The _id of the file object from the document list"),
        start_page: z
          .number()
          .optional()
          .describe(
            "First page to read (1-indexed, inclusive). Omit to start from the beginning.",
          ),
        end_page: z
          .number()
          .optional()
          .describe(
            "Last page to read (1-indexed, inclusive). Omit to read as far as the size limit allows.",
          ),
      },
    },
    async ({ file_object_id, start_page, end_page }) => {
      const { tenderId } = requireTenderContext();
      const allFiles = await loadTenderFiles(tenderId);

      const fileObj = allFiles.find((f: any) => f._id.toString() === file_object_id);
      if (!fileObj) throw new Error(`File ${file_object_id} not found`);
      if (!fileObj.file) throw new Error(`File reference missing for ${file_object_id}`);

      const fileId =
        typeof fileObj.file === "object" && (fileObj.file as any)._id
          ? (fileObj.file as any)._id.toString()
          : (fileObj.file as any).toString();

      const docLabel =
        (fileObj.summary as any)?.documentType || fileObj.documentType || "Document";

      // Per-session dedup
      const rangeKey = `${fileId}:${start_page ?? 0}:${end_page ?? "end"}`;
      if (sessionState.loadedRangeKeys.has(rangeKey)) {
        throw new Error(
          `Document "${docLabel}" (same page range) is already loaded in this conversation turn.`,
        );
      }

      // Pre-flight page budget check
      const docPageCount = fileObj.pageCount ?? 0;
      const requestedPages =
        end_page && start_page ? end_page - start_page + 1 : docPageCount;
      const estimatedPages = Math.min(
        requestedPages || docPageCount,
        docPageCount || requestedPages,
      );
      if (
        estimatedPages > 0 &&
        sessionState.pdfPagesLoaded + estimatedPages > PDF_PAGE_LIMIT
      ) {
        throw new Error(
          `Cannot load "${docLabel}" — this turn has already used ${sessionState.pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit. Please answer based on what has already been loaded, or let the user know they should ask about one document at a time.`,
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

      if (isSpreadsheet) {
        const xlsx = await import("xlsx");
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const text = workbook.SheetNames.map((name) => {
          const ws = workbook.Sheets[name];
          return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
        }).join("\n\n");
        content = `Document: ${docLabel}\n\n${text}`;
        if (docPageCount > 0) sessionState.pdfPagesLoaded += docPageCount;
        sessionState.loadedRangeKeys.add(rangeKey);
      } else if (contentType.startsWith("image/")) {
        const base64 = buffer.toString("base64");
        content = [
          { type: "text" as const, text: `Document: ${docLabel}` },
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
        ];
        if (docPageCount > 0) sessionState.pdfPagesLoaded += docPageCount;
        sessionState.loadedRangeKeys.add(rangeKey);
      } else {
        // PDF — extract only the requested page range, bisecting if too large
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const totalPages = pdfDoc.getPageCount();

        let startIdx = start_page ? Math.max(0, start_page - 1) : 0;
        let endIdx = end_page ? Math.min(end_page, totalPages) : totalPages;

        let pdfChunk: Buffer;
        while (true) {
          const indices = Array.from(
            { length: endIdx - startIdx },
            (_, i) => startIdx + i,
          );
          const chunkDoc = await PDFDocument.create();
          const pages = await chunkDoc.copyPages(pdfDoc, indices);
          for (const page of pages) chunkDoc.addPage(page);
          pdfChunk = Buffer.from(await chunkDoc.save());
          if (pdfChunk.length <= MAX_READABLE_PDF_BYTES || endIdx - startIdx <= 1)
            break;
          endIdx = startIdx + Math.floor((endIdx - startIdx) / 2);
        }

        const pagesRead = endIdx - startIdx;

        if (sessionState.pdfPagesLoaded + pagesRead > PDF_PAGE_LIMIT) {
          throw new Error(
            `Cannot load "${docLabel}" (${pagesRead} pages) — this turn has already used ${sessionState.pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit.`,
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

        if (docPageCount > 0) sessionState.pdfPagesLoaded += pagesRead;
        sessionState.loadedRangeKeys.add(rangeKey);
      }

      return { content: content as any };
    },
  );
}
