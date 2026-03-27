import Anthropic from "@anthropic-ai/sdk";
import mongoose from "mongoose";
import { Tender } from "@models";
import { ToolExecutionResult } from "./streamConversation";
import { scheduleTenderSummary } from "./generateTenderSummary";

export const SAVE_TENDER_NOTE_TOOL: Anthropic.Tool = {
  name: "save_tender_note",
  description:
    "Save an important piece of information to this tender's permanent job notes. " +
    "Only call this AFTER the user has confirmed they want to save it. " +
    "Always draft the note content in your message first and ask \"Should I save that to the job notes?\" before calling this tool. " +
    "Never call this tool without explicit user confirmation.",
  input_schema: {
    type: "object" as const,
    properties: {
      content: {
        type: "string",
        description: "The note text to save, as confirmed by the user.",
      },
    },
    required: ["content"],
  },
};

export const DELETE_TENDER_NOTE_TOOL: Anthropic.Tool = {
  name: "delete_tender_note",
  description:
    "Delete a previously saved note from this tender's job notes. " +
    "Only call this if the user explicitly asks to remove a specific note.",
  input_schema: {
    type: "object" as const,
    properties: {
      noteId: {
        type: "string",
        description: "The _id of the note to delete.",
      },
    },
    required: ["noteId"],
  },
};

/**
 * Returns an executeTool function for tender note operations.
 * tenderId and userId are injected server-side — Claude never supplies them.
 * Summary regeneration is fire-and-forget after each note change.
 */
export function makeTenderNoteExecutor(
  tenderId: string,
  userId: string,
  conversationId: string | undefined
): (name: string, input: Record<string, unknown>) => Promise<ToolExecutionResult> {
  return async (name: string, input: Record<string, unknown>): Promise<ToolExecutionResult> => {
    if (name === "save_tender_note") {
      const content = input.content as string;
      const convId = conversationId ?? "";

      await (Tender as any).findByIdAndUpdate(tenderId, {
        $push: {
          notes: {
            _id: new mongoose.Types.ObjectId(),
            content,
            savedAt: new Date(),
            savedBy: new mongoose.Types.ObjectId(userId),
            conversationId: convId,
          },
        },
      });

      scheduleTenderSummary(tenderId);

      return {
        content: `Note saved: "${content}"`,
        summary: `Saved note to tender job notes`,
      };
    }

    if (name === "delete_tender_note") {
      const noteId = input.noteId as string;

      const result = await (Tender as any).updateOne(
        { _id: tenderId },
        { $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId) } } }
      );

      if (result.modifiedCount === 0) {
        return {
          content: `Error: Note not found — nothing was deleted.`,
          summary: `Note delete failed: noteId not found on tender`,
        };
      }

      scheduleTenderSummary(tenderId);

      return {
        content: `Note deleted.`,
        summary: `Deleted note from tender job notes`,
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  };
}
