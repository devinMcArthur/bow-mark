// @ts-nocheck — TypeScript 5.x OOMs on deeply chained Zod+Kysely types
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import mongoose from "mongoose";
import { Tender as TenderModel, Jobsite, EnrichedFile, System, TenderPricingSheet } from "@models";
import { UserRoles } from "@typescript/user";
import { TenderPricingRowType } from "@typescript/tenderPricingSheet";
import { scheduleTenderSummary } from "../../lib/generateTenderSummary";
import { getRequestContext, requireTenderContext } from "../context";
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
//
// Loads the document set for whichever chat is calling:
//   - Tender-scoped chat  → tender.files + system spec files
//   - Jobsite-scoped chat → allowed jobsite.enrichedFiles (minRole filtered) + system spec files
//
// For jobsite context, the per-file `minRole` gate is applied here — a foreman
// (role = User) will never receive files whose minRole is ProjectManager or higher,
// so the document tool handlers can't leak restricted content even if Claude
// asks for it by ID.
async function loadChatFiles(ctx: {
  tenderId?: string;
  jobsiteId?: string;
  role: UserRoles;
}): Promise<any[]> {
  if (ctx.tenderId) {
    const [tender, sys] = await Promise.all([
      TenderModel.findById(ctx.tenderId)
        .populate({ path: "files", populate: { path: "file" } })
        .lean(),
      System.getSystem(),
    ]);
    if (!tender) throw new Error(`Tender ${ctx.tenderId} not found`);
    return [
      ...(((tender as any).files ?? []) as any[]),
      ...(((sys?.specFiles ?? []) as any[])),
    ];
  }

  if (ctx.jobsiteId) {
    const [jobsite, sys] = await Promise.all([
      Jobsite.findById(ctx.jobsiteId).lean(),
      System.getSystem(),
    ]);
    if (!jobsite) throw new Error(`Jobsite ${ctx.jobsiteId} not found`);

    const allEntries = ((jobsite as any).enrichedFiles ?? []) as any[];
    const allowedIds = allEntries
      .filter((entry) => (entry.minRole ?? UserRoles.ProjectManager) <= ctx.role)
      .map((entry) => entry.enrichedFile);
    const jobsiteFiles = await EnrichedFile.find({ _id: { $in: allowedIds } })
      .populate("file")
      .lean();

    return [
      ...jobsiteFiles,
      ...(((sys?.specFiles ?? []) as any[])),
    ];
  }

  throw new Error(
    "No chat context — document tools require either X-Tender-Id or X-Jobsite-Id header",
  );
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

/**
 * Wraps an MCP tool handler with entry/exit/error logging. Every tool call
 * gets a one-line success log with timing, and any thrown error is logged
 * with a stack trace before being re-thrown (so the chat router can surface
 * it as is_error: true to Claude).
 *
 * Set MCP_DEBUG_TOOL_INPUTS=1 to also log the input args on each call.
 * Leave unset in prod — input dumps can be noisy and may include user data.
 */
function instrumented<TArgs>(
  name: string,
  handler: (args: TArgs) => Promise<unknown>,
): (args: TArgs) => Promise<unknown> {
  return async (args: TArgs) => {
    const start = Date.now();
    if (process.env.MCP_DEBUG_TOOL_INPUTS === "1") {
      console.log(`[mcp:${name}] input:`, JSON.stringify(args));
    }
    try {
      const result = await handler(args);
      console.log(`[mcp:${name}] ok (${Date.now() - start}ms)`);
      return result;
    } catch (err) {
      console.error(
        `[mcp:${name}] threw after ${Date.now() - start}ms:`,
        err instanceof Error ? err.stack ?? err.message : err,
      );
      throw err;
    }
  };
}

/**
 * Drop-in wrapper around `server.registerTool` that auto-instruments the
 * handler. Use this in place of `server.registerTool` for every tool in
 * this file so we get uniform entry/exit/error logging and never forget.
 */
function registerInstrumented<TConfig, TArgs>(
  server: McpServer,
  name: string,
  config: TConfig,
  handler: (args: TArgs) => Promise<unknown>,
): void {
  (server as any).registerTool(name, config, instrumented(name, handler));
}

export function register(
  server: McpServer,
  sessionState: TenderToolsSessionState,
): void {
  // ── search_tenders ───────────────────────────────────────────────────────
  // Cross-tender read tool — unlike the other tender tools, this one does
  // NOT use requireTenderContext() because its whole purpose is to find a
  // tenderId in the first place. Any authenticated chat (exec /chat,
  // pm-jobsite-chat, etc.) can call it to resolve a tender by name/jobcode
  // before calling tender-scoped tools.
  registerInstrumented(
    server,
    "search_tenders",
    {
      description:
        "Search for tenders by name or jobcode. Returns matching tenders with their IDs, names, jobcodes, and status. Use this to resolve a tender reference before calling any other tender tool — every tender-scoped tool needs a tenderId, and this is how you find one from a name the user mentions.",
      inputSchema: {
        query: z
          .string()
          .describe(
            "Name or jobcode to search for. Partial, case-insensitive match.",
          ),
        status: z
          .enum(["bidding", "won", "lost"])
          .optional()
          .describe("Optional filter: only return tenders in this status."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(10)
          .describe("Max results to return. Default 10, max 50."),
      },
    },
    async ({ query, status, limit }) => {
      // Escape regex metacharacters so user input can't accidentally construct
      // a malicious or malformed pattern.
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      const filter: any = {
        $or: [{ name: regex }, { jobcode: regex }],
      };
      if (status) filter.status = status;

      const results = await (TenderModel as any)
        .find(filter)
        .select("_id name jobcode status description")
        .sort({ name: 1 })
        .limit(limit ?? 10)
        .lean();

      return ok(
        JSON.stringify(
          results.map((t: any) => ({
            id: t._id.toString(),
            name: t.name,
            jobcode: t.jobcode,
            status: t.status,
            description: t.description ?? null,
          })),
          null,
          2,
        ),
      );
    },
  );

  // ── get_tender_pricing_rows ──────────────────────────────────────────────
  registerInstrumented(
    server,
    "get_tender_pricing_rows",
    {
      description:
        "Read the full pricing schedule for a tender — every schedule, group, and item with quantity, unit, status, notes, doc references, and pricing fields (unitPrice, markup, rate buildup outputs). In a tender-scoped chat (tender page), the active tenderId is resolved automatically and any tenderId argument is ignored. In a cross-tender chat (executive /chat, pm-jobsite-chat, etc.), pass the tenderId explicitly — use search_tenders first to find it by name or jobcode.",
      inputSchema: {
        tenderId: z
          .string()
          .optional()
          .describe(
            "Required when called from a chat that isn't bound to a specific tender. Ignored inside tender-specific chats.",
          ),
      },
    },
    async ({ tenderId: inputTenderId }) => {
      // Context-bound tenderId (from X-Tender-Id header) always wins over
      // Claude-supplied input — this preserves the prompt-injection guard
      // for tender-chat. If no context binding is present, fall back to the
      // explicit input param (exec /chat, pm-jobsite-chat flow).
      const ctx = getRequestContext();
      const tenderId = ctx.tenderId ?? inputTenderId;
      if (!tenderId) {
        throw new Error(
          "No tender context — pass a tenderId parameter (use search_tenders to find one by name or jobcode).",
        );
      }
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
        hasTemplate: r.rateBuildupSnapshot != null && r.rateBuildupSnapshot !== "",
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

  // ── create_pricing_rows ──────────────────────────────────────────────────
  registerInstrumented(
    server,
    "create_pricing_rows",
    {
      description:
        "Create one or more pricing rows (schedules, groups, or items) on the active tender. Rows are appended to the end of the sheet in the order provided. New rows always start in 'not_started' state. Quantity and unit are only allowed on items, not schedules or groups. itemNumber should be set to the SoQ-source number (e.g. 'A.1.3'). Up to 100 rows per call. Validation is all-or-nothing — if any row is invalid, none are saved.",
      inputSchema: {
        rows: z
          .array(
            z.object({
              type: z.nativeEnum(TenderPricingRowType),
              itemNumber: z.string().optional(),
              description: z.string().min(1),
              indentLevel: z.number().int().min(0).max(3).default(0),
              quantity: z.number().optional(),
              unit: z.string().optional(),
              notes: z.string().optional(),
              docRefs: z
                .array(
                  z.object({
                    enrichedFileId: z.string(),
                    page: z.number().int().min(1),
                    description: z.string().optional(),
                  }),
                )
                .optional(),
            }),
          )
          .min(1)
          .max(100),
      },
    },
    async ({ rows }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) throw new Error(`No pricing sheet found for tender ${tenderId}`);

      // Build a set of valid enrichedFileIds attached to this tender + sys spec files
      const [tender, sys] = await Promise.all([
        TenderModel.findById(tenderId)
          .populate({ path: "files", populate: { path: "file" } })
          .lean(),
        System.getSystem(),
      ]);
      const validFileIds = new Set<string>();
      for (const f of [
        ...(((tender as any)?.files ?? []) as any[]),
        ...(((sys?.specFiles ?? []) as any[])),
      ]) {
        if (f?._id) validFileIds.add(f._id.toString());
      }

      // Validate every row first
      const errors: string[] = [];
      rows.forEach((r, i) => {
        if (r.type !== TenderPricingRowType.Item && (r.quantity != null || r.unit != null)) {
          errors.push(`row[${i}]: quantity/unit only allowed on items, not ${r.type}`);
        }
        for (const ref of r.docRefs ?? []) {
          if (!mongoose.isValidObjectId(ref.enrichedFileId)) {
            errors.push(
              `row[${i}]: docRef enrichedFileId '${ref.enrichedFileId}' is not a valid ObjectId`,
            );
          } else if (!validFileIds.has(ref.enrichedFileId)) {
            errors.push(
              `row[${i}]: docRef enrichedFileId '${ref.enrichedFileId}' is not attached to this tender`,
            );
          }
        }
      });
      if (errors.length > 0) {
        throw new Error(`validation failed. No rows created.\n${errors.join("\n")}`);
      }

      // Apply each row
      const created: Array<{
        rowId: string;
        type: string;
        itemNumber: string;
        description: string;
      }> = [];
      for (const r of rows) {
        const newRow: any = {
          _id: new mongoose.Types.ObjectId(),
          type: r.type,
          sortOrder: sheet.rows.length,
          itemNumber: r.itemNumber ?? "",
          description: r.description,
          indentLevel: r.indentLevel,
          ...(r.type === TenderPricingRowType.Item && r.quantity != null ? { quantity: r.quantity } : {}),
          ...(r.type === TenderPricingRowType.Item && r.unit != null ? { unit: r.unit } : {}),
          ...(r.notes != null ? { notes: r.notes } : {}),
          docRefs: (r.docRefs ?? []).map((d) => ({
            _id: new mongoose.Types.ObjectId(),
            enrichedFileId: new mongoose.Types.ObjectId(d.enrichedFileId),
            page: d.page,
            ...(d.description != null ? { description: d.description } : {}),
          })),
          status: "not_started",
        };
        sheet.rows.push(newRow);
        created.push({
          rowId: newRow._id.toString(),
          type: newRow.type,
          itemNumber: newRow.itemNumber,
          description: newRow.description,
        });
      }
      sheet.updatedAt = new Date();
      await sheet.save();

      return ok(JSON.stringify({ created, totalCreated: created.length }));
    },
  );

  // ── update_pricing_rows ──────────────────────────────────────────────────
  registerInstrumented(
    server,
    "update_pricing_rows",
    {
      description:
        "Update one or more pricing rows on the active tender. Each update is identified by rowId. Only rows in 'not_started' state can be edited — already-started rows are protected. Editable fields: itemNumber, description, indentLevel, quantity, unit, unitPrice (items only). Notes: use appendNotes to add, replaceNotes to overwrite (for corrections). DocRefs: use appendDocRefs to add, removeDocRefIds to remove specific refs by ID (from get_tender_pricing_rows). Up to 100 updates per call. Validation is all-or-nothing.",
      inputSchema: {
        updates: z
          .array(
            z.object({
              rowId: z.string(),
              itemNumber: z.string().optional(),
              description: z.string().optional(),
              indentLevel: z.number().int().min(0).max(3).optional(),
              quantity: z.number().optional(),
              unit: z.string().optional(),
              unitPrice: z.number().nullable().optional(),
              appendNotes: z.string().optional(),
              replaceNotes: z
                .string()
                .nullable()
                .optional()
                .describe(
                  "Replace the entire notes field with this value. Pass null to clear notes entirely. Takes precedence over appendNotes if both are provided.",
                ),
              appendDocRefs: z
                .array(
                  z.object({
                    enrichedFileId: z.string(),
                    page: z.number().int().min(1),
                    description: z.string().optional(),
                  }),
                )
                .optional(),
              removeDocRefIds: z
                .array(z.string())
                .optional()
                .describe(
                  "Remove specific doc references by their docRefId (from get_tender_pricing_rows output).",
                ),
            }),
          )
          .min(1)
          .max(100),
      },
    },
    async ({ updates }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) throw new Error(`No pricing sheet found for tender ${tenderId}`);

      const rowsById = new Map(
        sheet.rows.map((r: any) => [r._id.toString(), r]),
      );

      // Build a set of valid enrichedFileIds attached to this tender + sys spec files
      const [tender, sys] = await Promise.all([
        TenderModel.findById(tenderId)
          .populate({ path: "files", populate: { path: "file" } })
          .lean(),
        System.getSystem(),
      ]);
      const validFileIds = new Set<string>();
      for (const f of [
        ...(((tender as any)?.files ?? []) as any[]),
        ...(((sys?.specFiles ?? []) as any[])),
      ]) {
        if (f?._id) validFileIds.add(f._id.toString());
      }

      // Validate-all-then-apply
      const errors: string[] = [];
      for (const u of updates) {
        const row = rowsById.get(u.rowId) as any;
        if (!row) {
          errors.push(`row ${u.rowId}: not found`);
          continue;
        }
        if (row.status !== "not_started") {
          errors.push(
            `row ${u.rowId}: in state '${row.status}', cannot edit (only 'not_started' rows are editable)`,
          );
        }
        if (
          row.type !== TenderPricingRowType.Item &&
          (u.quantity !== undefined || u.unit !== undefined || u.unitPrice !== undefined)
        ) {
          errors.push(
            `row ${u.rowId}: quantity/unit/unitPrice only allowed on items, not ${row.type}`,
          );
        }
        for (const ref of u.appendDocRefs ?? []) {
          if (!mongoose.isValidObjectId(ref.enrichedFileId)) {
            errors.push(
              `update[${updates.indexOf(u)}]: docRef enrichedFileId '${ref.enrichedFileId}' is not a valid ObjectId`,
            );
          } else if (!validFileIds.has(ref.enrichedFileId)) {
            errors.push(
              `update[${updates.indexOf(u)}]: docRef enrichedFileId '${ref.enrichedFileId}' is not attached to this tender`,
            );
          }
        }
      }
      if (errors.length > 0) {
        throw new Error(`validation failed. No updates applied.\n${errors.join("\n")}`);
      }

      const updated: Array<{ rowId: string; fieldsChanged: string[] }> = [];
      for (const u of updates) {
        const row = rowsById.get(u.rowId) as any;
        const fieldsChanged: string[] = [];

        if (u.itemNumber !== undefined) {
          row.itemNumber = u.itemNumber;
          fieldsChanged.push("itemNumber");
        }
        if (u.description !== undefined) {
          row.description = u.description;
          fieldsChanged.push("description");
        }
        if (u.indentLevel !== undefined) {
          row.indentLevel = u.indentLevel;
          fieldsChanged.push("indentLevel");
        }
        if (u.quantity !== undefined) {
          row.quantity = u.quantity;
          fieldsChanged.push("quantity");
        }
        if (u.unit !== undefined) {
          row.unit = u.unit;
          fieldsChanged.push("unit");
        }
        if (u.unitPrice !== undefined) {
          row.unitPrice = u.unitPrice;
          fieldsChanged.push("unitPrice");
        }
        if (u.replaceNotes !== undefined) {
          row.notes = u.replaceNotes ?? undefined;
          fieldsChanged.push("replaceNotes");
        } else if (u.appendNotes !== undefined) {
          row.notes = (row.notes ? row.notes + "\n\n" : "") + u.appendNotes;
          fieldsChanged.push("appendNotes");
        }
        if (u.removeDocRefIds !== undefined && u.removeDocRefIds.length > 0) {
          const removeSet = new Set(u.removeDocRefIds);
          const before = (row.docRefs ?? []).length;
          row.docRefs = (row.docRefs ?? []).filter(
            (d: any) => !removeSet.has(d._id.toString()),
          );
          if ((row.docRefs as any[]).length < before) {
            fieldsChanged.push("removeDocRefIds");
          }
        }
        if (u.appendDocRefs !== undefined) {
          const existing = (row.docRefs ?? []) as any[];
          let addedAny = false;
          for (const ref of u.appendDocRefs) {
            const isDup = existing.some(
              (e) =>
                e.enrichedFileId.toString() === ref.enrichedFileId &&
                e.page === ref.page,
            );
            if (isDup) continue;
            addedAny = true;
            existing.push({
              _id: new mongoose.Types.ObjectId(),
              enrichedFileId: new mongoose.Types.ObjectId(ref.enrichedFileId),
              page: ref.page,
              ...(ref.description != null ? { description: ref.description } : {}),
            });
          }
          if (addedAny) {
            row.docRefs = existing;
            fieldsChanged.push("appendDocRefs");
          }
        }

        updated.push({ rowId: u.rowId, fieldsChanged });
      }
      sheet.updatedAt = new Date();
      await sheet.save();

      return ok(JSON.stringify({ updated, totalUpdated: updated.length }));
    },
  );

  // ── delete_pricing_rows ──────────────────────────────────────────────────
  registerInstrumented(
    server,
    "delete_pricing_rows",
    {
      description:
        "Delete one or more pricing rows from the active tender. Only rows in 'not_started' state can be deleted. Up to 100 rows per call. Validation is all-or-nothing — if any row is not editable, none are deleted.",
      inputSchema: {
        rowIds: z.array(z.string()).min(1).max(100),
      },
    },
    async ({ rowIds }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) throw new Error(`No pricing sheet found for tender ${tenderId}`);

      const errors: string[] = [];
      const rowsById = new Map(
        sheet.rows.map((r: any) => [r._id.toString(), r]),
      );
      for (const id of rowIds) {
        const row = rowsById.get(id) as any;
        if (!row) {
          errors.push(`row ${id}: not found`);
          continue;
        }
        if (row.status !== "not_started") {
          errors.push(
            `row ${id}: in state '${row.status}', cannot delete (only 'not_started' rows can be deleted)`,
          );
        }
      }
      if (errors.length > 0) {
        throw new Error(`validation failed. No rows deleted.\n${errors.join("\n")}`);
      }

      const idSet = new Set(rowIds);
      sheet.rows = sheet.rows.filter(
        (r: any) => !idSet.has(r._id.toString()),
      ) as any;
      sheet.updatedAt = new Date();
      await sheet.save();

      return ok(JSON.stringify({ deleted: rowIds, totalDeleted: rowIds.length }));
    },
  );

  // ── reorder_pricing_rows ─────────────────────────────────────────────────
  registerInstrumented(
    server,
    "reorder_pricing_rows",
    {
      description:
        "Reorder ALL rows in the active tender's pricing sheet. Pass the complete list of rowIds in the desired order — partial reorders are rejected because they corrupt sortOrder. Reordering does not change row content, so it is allowed regardless of row status (not blocked by 'in_progress' rows).",
      inputSchema: {
        rowIds: z.array(z.string()).min(1),
      },
    },
    async ({ rowIds }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) throw new Error(`No pricing sheet found for tender ${tenderId}`);

      if (rowIds.length !== sheet.rows.length) {
        throw new Error(
          `rowIds.length (${rowIds.length}) does not match sheet.rows.length (${sheet.rows.length}). Reorder requires the full list of rows in the new order.`,
        );
      }
      const sheetIdSet = new Set(sheet.rows.map((r: any) => r._id.toString()));
      const inputIdSet = new Set(rowIds);
      if (
        sheetIdSet.size !== inputIdSet.size ||
        ![...sheetIdSet].every((id) => inputIdSet.has(id))
      ) {
        throw new Error(
          `rowIds set does not match sheet.rows set. Every existing rowId must appear exactly once.`,
        );
      }

      const rowMap = new Map(
        sheet.rows.map((r: any) => [r._id.toString(), r]),
      );
      const reordered = rowIds.map((id, i) => {
        const row = rowMap.get(id) as any;
        row.sortOrder = i;
        return row;
      });
      sheet.rows = reordered as any;
      sheet.updatedAt = new Date();
      await sheet.save();

      return ok(
        JSON.stringify({ reordered: true, totalRows: reordered.length }),
      );
    },
  );

  // ── save_tender_note ──────────────────────────────────────────────────────
  registerInstrumented(
    server,
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
  registerInstrumented(
    server,
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
        throw new Error(`Note not found — nothing was deleted.`);
      }

      scheduleTenderSummary(tenderId);
      return ok("Note deleted.");
    },
  );

  // ── list_document_pages ───────────────────────────────────────────────────
  registerInstrumented(
    server,
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
      const ctx = getRequestContext();
      const allFiles = await loadChatFiles(ctx);
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
  registerInstrumented(
    server,
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
      const ctx = getRequestContext();
      const allFiles = await loadChatFiles(ctx);

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
        content = [
          {
            type: "text" as const,
            text: `Document: ${docLabel}\n\n${text}`,
          },
        ];
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

        // The MCP SDK doesn't support Anthropic's "document" content type
        // in tool results — it validates against text/image/audio/resource
        // only. We encode the PDF as a JSON envelope inside a text block
        // that the SDK accepts. The chat router's executeTool adapter
        // detects the __mcp_document marker and reconstructs the native
        // Anthropic document block before sending to Claude.
        content = [
          {
            type: "text" as const,
            text: `Document: ${docLabel}\n${pageNote}\nWhen citing this document use the filename: "${docLabel}"`,
          },
          {
            type: "text" as const,
            text: JSON.stringify({
              __mcp_document: true,
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfChunk.toString("base64"),
              },
            }),
          },
        ];

        if (docPageCount > 0) sessionState.pdfPagesLoaded += pagesRead;
        sessionState.loadedRangeKeys.add(rangeKey);
      }

      return { content: content as any };
    },
  );
}
