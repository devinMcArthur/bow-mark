// @ts-nocheck — TypeScript 5.x OOMs on deeply chained Zod+Kysely types
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import mongoose from "mongoose";
import { Tender } from "@models";
import { UserRoles } from "@typescript/user";
import { scheduleTenderSummary } from "../../lib/generateTenderSummary";
import { requireTenderContext } from "../context";

export interface TenderToolsSessionState {
  pdfPagesLoaded: number;
  loadedRangeKeys: Set<string>;
}

export function makeSessionState(): TenderToolsSessionState {
  return { pdfPagesLoaded: 0, loadedRangeKeys: new Set() };
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
  _sessionState: TenderToolsSessionState,
): void {
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

      await (Tender as any).findByIdAndUpdate(ctx.tenderId, {
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

      const result = await (Tender as any).updateOne(
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
}
