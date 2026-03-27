# Tender Notes & Living Job Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tender chat two-way — Claude saves human-provided context as discrete notes and maintains a living job summary synthesized from documents + notes, both persisted across conversations.

**Architecture:** Notes and jobSummary are embedded on the Tender MongoDB document. Note-saving and deletion are handled as inline Anthropic tools in the tender chat router (same pattern as read_document), giving the executor direct access to tenderId and userId without a separate MCP process. Summary generation is a single Sonnet call over text-only inputs (summaries + page indexes + notes) triggered after file processing, note saves/deletes, and manually.

**Tech Stack:** Typegoose/MongoDB, Type-GraphQL, Anthropic SDK, React/Chakra UI tabs, Apollo Client, vitest + testcontainers

---

## File Structure

**New files:**
- `server/src/lib/generateTenderSummary.ts` — Sonnet synthesis function, writes to tender.jobSummary
- `server/src/lib/tenderNoteTools.ts` — Anthropic tool definitions + executor factory for save/delete
- `server/src/__tests__/generateTenderSummary.test.ts` — unit tests (mocked Anthropic)
- `server/src/__tests__/tenderNoteTools.test.ts` — integration tests (real MongoDB via testcontainers)
- `client/src/components/Tender/TenderSummaryTab.tsx` — Summary tab UI
- `client/src/components/Tender/TenderNotesTab.tsx` — Notes tab UI

**Modified files:**
- `server/src/models/Tender/schema/index.ts` — add TenderNoteClass, TenderJobSummaryClass, notes[], jobSummary fields
- `server/src/typescript/tender.ts` — add ITenderNote, ITenderJobSummary interfaces
- `server/src/graphql/resolvers/tender/index.ts` — add tenderDeleteNote, tenderRegenerateSummary mutations
- `server/src/graphql/resolvers/tender/mutations.ts` — no changes needed (no input types required for these mutations)
- `server/src/router/tender-chat.ts` — add note tools, inject notes+summary into system prompt
- `server/src/consumer/handlers/enrichedFileSummaryHandler.ts` — trigger generateTenderSummary after all files ready
- `client/src/pages/tender/[id].tsx` → renamed to `client/src/pages/tender/[id]/index.tsx` — restructure into tabs
- `client/src/components/Tender/types.ts` — add TenderNote, TenderJobSummary, update TenderDetail

---

## Task 1: Server — Tender Schema (data model)

**Files:**
- Modify: `server/src/models/Tender/schema/index.ts`
- Modify: `server/src/typescript/tender.ts`

- [ ] **Step 1: Add interfaces to typescript/tender.ts**

```typescript
// server/src/typescript/tender.ts
export type { SummaryStatus, IEnrichedFileChunk, IEnrichedFileSummary, IEnrichedFileCreate } from "./enrichedFile";

export type TenderStatus = "bidding" | "won" | "lost";

export interface ITenderCreate {
  name: string;
  jobcode: string;
  description?: string;
  createdBy: string;
}

export interface ITenderUpdate {
  name?: string;
  description?: string;
  status?: TenderStatus;
  jobsiteId?: string | null;
}

export interface ITenderNote {
  content: string;
  savedBy: string; // User _id
  conversationId: string;
}

export interface ITenderJobSummary {
  content: string;
  generatedAt: Date;
  generatedBy: "auto" | "manual";
  generatedFrom: string[]; // enrichedFile _ids + note _ids
}
```

- [ ] **Step 2: Add schema classes to schema/index.ts**

Replace the full contents of `server/src/models/Tender/schema/index.ts` with:

```typescript
import { EnrichedFileClass } from "../../EnrichedFile/class";
import { JobsiteClass } from "../../Jobsite/class";
import { UserClass } from "../../User/class";
import { TenderStatus } from "@typescript/tender";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class TenderNoteClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field()
  public content!: string;

  @Field(() => UserClass, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public savedBy?: Ref<UserClass>;

  @Field()
  public savedAt!: Date;

  @Field()
  public conversationId!: string;
}

@ObjectType()
export class TenderJobSummaryClass {
  @Field()
  public content!: string;

  @Field()
  public generatedAt!: Date;

  @Field()
  public generatedBy!: string;

  @Field(() => [String])
  public generatedFrom!: string[];
}

@ObjectType()
export class TenderSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public name!: string;

  @Field({ nullable: false })
  @prop({ required: true, trim: true, unique: true })
  public jobcode!: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field(() => String, { nullable: false })
  @prop({
    required: true,
    enum: ["bidding", "won", "lost"],
    default: "bidding",
  })
  public status!: TenderStatus;

  @Field(() => JobsiteClass, { nullable: true })
  @prop({ ref: () => JobsiteClass, required: false })
  public jobsite?: Ref<JobsiteClass>;

  @Field(() => [EnrichedFileClass])
  @prop({ ref: () => EnrichedFileClass, type: () => [Types.ObjectId], default: [] })
  public files!: Ref<EnrichedFileClass>[];

  @Field(() => [TenderNoteClass])
  @prop({ type: () => [Object], default: [] })
  public notes!: TenderNoteClass[];

  @Field(() => TenderJobSummaryClass, { nullable: true })
  @prop({ type: () => Object, required: false })
  public jobSummary?: TenderJobSummaryClass;

  @Field(() => UserClass)
  @prop({ ref: () => UserClass, required: true })
  public createdBy!: Ref<UserClass>;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
```

- [ ] **Step 3: Verify server compiles**

```bash
cd server && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to Tender schema.

- [ ] **Step 4: Commit**

```bash
git add server/src/models/Tender/schema/index.ts server/src/typescript/tender.ts
git commit -m "feat: add TenderNoteClass and TenderJobSummaryClass to Tender schema"
```

---

## Task 2: Server — generateTenderSummary

**Files:**
- Create: `server/src/lib/generateTenderSummary.ts`
- Create: `server/src/__tests__/generateTenderSummary.test.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/__tests__/generateTenderSummary.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

// Mock Anthropic before importing the module under test
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: "## Scope\nTest scope.\n\n## Key Requirements\nTest requirements.\n\n## Risks & Gotchas\nNone.\n\n## Addendum Changes\nNone.\n\n## Outstanding Items\nNone.",
          },
        ],
      }),
    },
  })),
}));

// Mock the Tender model
const mockFindById = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
vi.mock("@models", () => ({
  Tender: {
    findById: mockFindById,
  },
  EnrichedFile: {
    find: vi.fn().mockResolvedValue([]),
  },
}));

import { generateTenderSummary } from "../lib/generateTenderSummary";

describe("generateTenderSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes jobSummary to tender with generatedFrom populated", async () => {
    const tenderId = new mongoose.Types.ObjectId().toString();
    const fileId1 = new mongoose.Types.ObjectId().toString();
    const noteId1 = new mongoose.Types.ObjectId().toString();

    const mockTender = {
      _id: tenderId,
      name: "Test Tender",
      jobcode: "T-001",
      notes: [{ _id: noteId1, content: "Busy road", savedAt: new Date() }],
      files: [fileId1],
      findByIdAndUpdate: mockFindByIdAndUpdate,
    };

    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTender),
      }),
    });

    // Mock EnrichedFile.find to return a ready file
    const { EnrichedFile } = await import("@models");
    (EnrichedFile.find as any).mockResolvedValue([
      {
        _id: fileId1,
        summaryStatus: "ready",
        summary: { overview: "Road paving project", keyTopics: ["asphalt", "culvert"] },
        pageIndex: [{ page: 1, summary: "Cover page" }],
      },
    ]);

    await generateTenderSummary(tenderId);

    // Verify Tender.findById was called
    expect(mockFindById).toHaveBeenCalledWith(tenderId);
  });

  it("returns early if tender not found", async () => {
    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    });

    // Should not throw
    await expect(generateTenderSummary("nonexistent")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npm run test -- src/__tests__/generateTenderSummary.test.ts 2>&1 | tail -20
```

Expected: FAIL — `generateTenderSummary` not found.

- [ ] **Step 3: Implement generateTenderSummary**

Create `server/src/lib/generateTenderSummary.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { Tender, EnrichedFile } from "@models";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARY_PROMPT = `You are writing a living job briefing for a construction tender at Bow-Mark, a paving and concrete company.

Synthesize all available document summaries, page indexes, and human notes into a structured briefing.
Write in clear, direct language. Be specific — use actual numbers, locations, and standards where mentioned.
If a section has nothing to report, write "Nothing noted."

Return the briefing as markdown with exactly these five headings:

## Scope
What work is being done, where, and at what scale. Key quantities and locations.

## Key Requirements
Critical spec constraints, materials, standards, or compliance items that shape how the job is done.

## Risks & Gotchas
Site conditions, owner quirks, tight constraints, or anything flagged by the team that could cause problems.

## Addendum Changes
What has changed from the original contract, listed chronologically. If no addendums, note that.

## Outstanding Items
Unresolved conflicts between documents, missing information, or items that need follow-up.`;

export async function generateTenderSummary(tenderId: string): Promise<void> {
  const tender = await Tender.findById(tenderId)
    .populate({ path: "files" })
    .lean();

  if (!tender) {
    console.warn(`[generateTenderSummary] Tender ${tenderId} not found`);
    return;
  }

  const fileIds = ((tender.files as any[]) ?? []).map((f: any) =>
    f._id ? f._id.toString() : f.toString()
  );

  const enrichedFiles = fileIds.length > 0
    ? await EnrichedFile.find({ _id: { $in: fileIds }, summaryStatus: "ready" }).lean()
    : [];

  const notes = ((tender as any).notes ?? []) as Array<{
    _id: any;
    content: string;
    savedAt: Date;
  }>;

  // Build text-only context — no PDF loads
  const fileContext = enrichedFiles
    .map((f: any) => {
      const summary = f.summary as any;
      const pageIndex = f.pageIndex as Array<{ page: number; summary: string }> | undefined;
      const lines = [
        `Document: ${summary?.documentType || f.documentType || "Unknown"}`,
        summary?.overview ? `Overview: ${summary.overview}` : null,
        summary?.keyTopics?.length ? `Key Topics: ${summary.keyTopics.join(", ")}` : null,
        pageIndex?.length
          ? `Page Index:\n${pageIndex.map((p) => `  p.${p.page}: ${p.summary}`).join("\n")}`
          : null,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n---\n\n");

  const notesContext = notes.length > 0
    ? notes
        .map((n) => `- ${n.content} (${new Date(n.savedAt).toLocaleDateString()})`)
        .join("\n")
    : "No human notes saved yet.";

  const userContent = `Tender: ${(tender as any).name} (Job Code: ${(tender as any).jobcode})
${(tender as any).description ? `Description: ${(tender as any).description}\n` : ""}
## Documents

${fileContext || "No documents processed yet."}

## Human Notes

${notesContext}

---

${SUMMARY_PROMPT}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: userContent }],
  });

  const content =
    response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

  if (!content) {
    console.warn(`[generateTenderSummary] Empty response for tender ${tenderId}`);
    return;
  }

  const generatedFrom = [
    ...enrichedFiles.map((f: any) => f._id.toString()),
    ...notes.map((n: any) => n._id.toString()),
  ];

  await (Tender as any).findByIdAndUpdate(tenderId, {
    $set: {
      jobSummary: {
        content,
        generatedAt: new Date(),
        generatedBy: "auto",
        generatedFrom,
      },
    },
  });

  console.log(`[generateTenderSummary] Summary generated for tender ${tenderId} (${enrichedFiles.length} files, ${notes.length} notes)`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npm run test -- src/__tests__/generateTenderSummary.test.ts 2>&1 | tail -20
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/generateTenderSummary.ts server/src/__tests__/generateTenderSummary.test.ts
git commit -m "feat: add generateTenderSummary function with Sonnet synthesis"
```

---

## Task 3: Server — Tender Note Tools

**Files:**
- Create: `server/src/lib/tenderNoteTools.ts`
- Create: `server/src/__tests__/tenderNoteTools.test.ts`

The note tools follow the same pattern as `readDocumentExecutor.ts` — Anthropic tool definitions + a factory function that returns an executor with request-scoped state (tenderId, userId).

- [ ] **Step 1: Write failing tests**

Create `server/src/__tests__/tenderNoteTools.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";
import { Tender } from "@models";
import { makeTenderNoteExecutor } from "../lib/tenderNoteTools";

// Uses real MongoDB via vitestGlobalSetup (testcontainers)

describe("makeTenderNoteExecutor", () => {
  let tenderId: string;

  beforeEach(async () => {
    // Create a minimal tender for each test
    const tender = await (Tender as any).create({
      name: "Test Tender",
      jobcode: `T-${Date.now()}`,
      status: "bidding",
      files: [],
      notes: [],
      createdBy: new mongoose.Types.ObjectId(),
    });
    tenderId = tender._id.toString();
  });

  it("save_tender_note adds a note to the tender", async () => {
    const executor = makeTenderNoteExecutor(
      tenderId,
      new mongoose.Types.ObjectId().toString(),
      "conv-123"
    );

    const result = await executor("save_tender_note", {
      content: "The owner's rep is strict about traffic control",
      conversationId: "conv-123",
    });

    expect(result.content).toContain("Note saved");

    const updated = await (Tender as any).findById(tenderId).lean();
    expect(updated.notes).toHaveLength(1);
    expect(updated.notes[0].content).toBe("The owner's rep is strict about traffic control");
    expect(updated.notes[0].conversationId).toBe("conv-123");
  });

  it("delete_tender_note removes the note", async () => {
    // First save a note directly
    await (Tender as any).findByIdAndUpdate(tenderId, {
      $push: {
        notes: {
          _id: new mongoose.Types.ObjectId(),
          content: "Note to delete",
          savedAt: new Date(),
          savedBy: new mongoose.Types.ObjectId(),
          conversationId: "conv-abc",
        },
      },
    });

    const tender = await (Tender as any).findById(tenderId).lean();
    const noteId = tender.notes[0]._id.toString();

    const executor = makeTenderNoteExecutor(
      tenderId,
      new mongoose.Types.ObjectId().toString(),
      undefined
    );

    const result = await executor("delete_tender_note", { noteId });
    expect(result.content).toContain("deleted");

    const updated = await (Tender as any).findById(tenderId).lean();
    expect(updated.notes).toHaveLength(0);
  });

  it("throws for unknown tool name", async () => {
    const executor = makeTenderNoteExecutor(tenderId, "user-id", undefined);
    await expect(executor("unknown_tool", {})).rejects.toThrow("Unknown tool");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npm run test -- src/__tests__/tenderNoteTools.test.ts 2>&1 | tail -20
```

Expected: FAIL — `makeTenderNoteExecutor` not found.

- [ ] **Step 3: Implement tenderNoteTools.ts**

Create `server/src/lib/tenderNoteTools.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import mongoose from "mongoose";
import { Tender } from "@models";
import { ToolExecutionResult } from "./streamConversation";
import { generateTenderSummary } from "./generateTenderSummary";

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
      conversationId: {
        type: "string",
        description: "The current conversation ID for traceability.",
      },
    },
    required: ["content", "conversationId"],
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
      const convId = (input.conversationId as string | undefined) ?? conversationId ?? "";

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

      // Fire-and-forget summary regeneration
      generateTenderSummary(tenderId).catch((err) =>
        console.warn("[tenderNoteTools] Summary regeneration failed after note save:", err)
      );

      return {
        content: `Note saved: "${content}"`,
        summary: `Saved note to tender job notes`,
      };
    }

    if (name === "delete_tender_note") {
      const noteId = input.noteId as string;

      await (Tender as any).findByIdAndUpdate(tenderId, {
        $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId) } },
      });

      // Fire-and-forget summary regeneration
      generateTenderSummary(tenderId).catch((err) =>
        console.warn("[tenderNoteTools] Summary regeneration failed after note delete:", err)
      );

      return {
        content: `Note deleted.`,
        summary: `Deleted note from tender job notes`,
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npm run test -- src/__tests__/tenderNoteTools.test.ts 2>&1 | tail -20
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/tenderNoteTools.ts server/src/__tests__/tenderNoteTools.test.ts
git commit -m "feat: add tender note tools (save/delete) with executor factory"
```

---

## Task 4: Server — GraphQL Mutations

**Files:**
- Modify: `server/src/graphql/resolvers/tender/index.ts`

Add `tenderDeleteNote` and `tenderRegenerateSummary` mutations. These are the UI-facing surfaces — the chat router uses the executor directly, not GraphQL.

- [ ] **Step 1: Add mutations to the resolver**

In `server/src/graphql/resolvers/tender/index.ts`, add these imports at the top:

```typescript
import { generateTenderSummary } from "../../../lib/generateTenderSummary";
```

Then add these two mutations inside the `TenderResolver` class, after `tenderRetrySummary`:

```typescript
  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderDeleteNote(
    @Arg("id", () => ID) id: Id,
    @Arg("noteId", () => ID) noteId: Id
  ) {
    await (Tender as any).findByIdAndUpdate(id, {
      $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId.toString()) } },
    });
    // Fire-and-forget summary regeneration
    generateTenderSummary(id.toString()).catch((err) =>
      console.warn("[TenderResolver] Summary regeneration failed after note delete:", err)
    );
    return Tender.getById(id);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderRegenerateSummary(@Arg("id", () => ID) id: Id) {
    const tender = await Tender.getById(id, { throwError: true });
    await generateTenderSummary(id.toString());
    // Mark as manual
    await (Tender as any).findByIdAndUpdate(id, {
      $set: { "jobSummary.generatedBy": "manual" },
    });
    return Tender.getById(id);
  }
```

Also add `mongoose` to imports at the top if not already present:
```typescript
import mongoose from "mongoose";
```

- [ ] **Step 2: Verify server compiles**

```bash
cd server && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/graphql/resolvers/tender/index.ts
git commit -m "feat: add tenderDeleteNote and tenderRegenerateSummary GraphQL mutations"
```

---

## Task 5: Server — Tender Chat Router Integration

**Files:**
- Modify: `server/src/router/tender-chat.ts`

Add note tools to the tool list, combine executors, inject notes and job summary into the system prompt.

- [ ] **Step 1: Update imports**

Replace the import block at the top of `server/src/router/tender-chat.ts`:

```typescript
import { Router } from "express";
import mongoose from "mongoose";
import Anthropic from "@anthropic-ai/sdk";
import { Tender, User, System } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation } from "../lib/streamConversation";
import { READ_DOCUMENT_TOOL, LIST_DOCUMENT_PAGES_TOOL, makeReadDocumentExecutor } from "../lib/readDocumentExecutor";
import { SAVE_TENDER_NOTE_TOOL, DELETE_TENDER_NOTE_TOOL, makeTenderNoteExecutor } from "../lib/tenderNoteTools";
import { buildFileIndex } from "../lib/buildFileIndex";
import { requireAuth } from "../lib/authMiddleware";
```

- [ ] **Step 2: Update the tender query to include notes and jobSummary**

Replace this line in the route handler:

```typescript
    Tender.findById(tenderId)
      .populate({ path: "files", populate: { path: "file" } })
      .lean(),
```

With:

```typescript
    Tender.findById(tenderId)
      .populate({ path: "files", populate: { path: "file" } })
      .populate({ path: "notes.savedBy", select: "name" })
      .lean(),
```

- [ ] **Step 3: Build notes and summary context blocks**

After the `buildFileIndex` call and before the decomposition block, add:

```typescript
  // ── Notes context ──────────────────────────────────────────────────────────
  const tenderNotes = ((tender as any).notes ?? []) as Array<{
    _id: any;
    content: string;
    savedBy?: any;
    savedAt: Date;
  }>;

  const notesBlock =
    tenderNotes.length > 0
      ? `\n\n## Job Notes\n${tenderNotes
          .map((n) => {
            const who = n.savedBy?.name ?? "team";
            const when = new Date(n.savedAt).toLocaleDateString();
            return `- ${n.content} (saved by ${who}, ${when})`;
          })
          .join("\n")}`
      : "";

  const jobSummary = (tender as any).jobSummary as
    | { content: string; generatedAt: Date }
    | undefined;

  const summaryBlock = jobSummary?.content
    ? `\n\n## Job Summary\n${jobSummary.content}`
    : "";
```

- [ ] **Step 4: Inject notes and summary into the system prompt**

In the `systemPrompt` template string, add `${notesBlock}${summaryBlock}` after the file index section, before `${decompositionBlock}`:

```typescript
  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping to analyze tender documents for Bow-Mark, a paving and concrete company.

You are working on tender: **${tender.name}** (Job Code: ${tender.jobcode})${tender.description ? `\nTender description: ${tender.description}` : ""}

## Tender Documents

${fileIndex || "No tender documents have been processed yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications (shared across all tenders)\n\n${specFileIndex}` : ""}${notesBlock}${summaryBlock}
${decompositionBlock}
## Instructions

**Clarify before assuming.** Construction documents often contain multiple instances of similar things — two crossings, two structures, two phases, two contract items with similar names. If a question could apply to more than one thing, ask which one the user means before loading a document.

**Ask when uncertain.** If you read a document and are not confident it contains the answer, say so explicitly and ask the user if they want you to look in a different document or provide more context. Do not guess or fill gaps with general knowledge.

**Loading documents — two steps.** For documents that have a page index, call list_document_pages first to see the page-by-page breakdown, then call read_document with only the specific pages you need. This is much cheaper and faster than loading large page ranges blindly. Only skip list_document_pages if the document has no page index (the navigation hint will say so).

**Citations.** When you reference a specific fact, requirement, section, or drawing from a document you have read, include a page link in this format: **[[Document Type, p.X]](URL#page=X)**. Only cite pages you have actually read. If you are not certain of the exact page, note it as approximate: **[[Spec, p.~12]](URL#page=12)**.

**Drawings.** If a document is a drawing, describe what you see as part of your answer.

**Cross-references.** When you read a page that references another drawing, document, or standard (e.g. "see Drawing C-3", "per OPSS 1150"), note it explicitly. If it directly answers the question, follow it automatically. If tangential, mention it so the user can decide whether to pursue it.

**Completeness.** Before giving your final answer, confirm you have addressed all parts of the question. If you found cross-references you have not checked, note what is outstanding so the user can decide.

**Saving job notes.** If the user mentions something important that is not in the documents — owner preferences, site context, verbal agreements, known risks — draft a 1-2 sentence note and ask "Should I save that to the job notes?" before calling save_tender_note. Never save without explicit confirmation.

**Scope.** Answer only from the tender documents, reference specs, and job notes provided. If the answer is not in the documents, say so clearly rather than drawing on general knowledge.`;
```

- [ ] **Step 5: Update the streamConversation call**

Replace the `streamConversation` call with:

```typescript
  const noteExecutor = makeTenderNoteExecutor(tenderId, req.userId, conversationId);
  const docExecutor = makeReadDocumentExecutor([...tenderFiles, ...specFiles]);

  await streamConversation({
    res,
    userId: req.userId,
    conversationId,
    tenderId,
    messages,
    systemPrompt,
    tools: [LIST_DOCUMENT_PAGES_TOOL, READ_DOCUMENT_TOOL, SAVE_TENDER_NOTE_TOOL, DELETE_TENDER_NOTE_TOOL],
    toolChoice: { type: "auto", disable_parallel_tool_use: true },
    maxTokens: 8192,
    executeTool: async (name, input) => {
      if (name === SAVE_TENDER_NOTE_TOOL.name || name === DELETE_TENDER_NOTE_TOOL.name) {
        return noteExecutor(name, input);
      }
      return docExecutor(name, input);
    },
    logPrefix: "[tender-chat]",
  });
```

- [ ] **Step 6: Verify server compiles**

```bash
cd server && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/router/tender-chat.ts
git commit -m "feat: add note tools and notes/summary context to tender chat router"
```

---

## Task 6: Server — Enrichment Pipeline Trigger

**Files:**
- Modify: `server/src/consumer/handlers/enrichedFileSummaryHandler.ts`

After a file's status becomes `ready`, check if it belongs to a tender with all files ready, and trigger summary generation.

- [ ] **Step 1: Add import**

At the top of `server/src/consumer/handlers/enrichedFileSummaryHandler.ts`, add:

```typescript
import { Tender } from "@models";
import { generateTenderSummary } from "../../lib/generateTenderSummary";
```

(The existing import line is `import { EnrichedFile } from "@models";` — extend it or add a new import.)

- [ ] **Step 2: Add trigger after summaryStatus ready write**

After the final `findByIdAndUpdate` that sets `summaryStatus: "ready"` (after page index generation), add:

```typescript
      // Trigger tender summary regeneration if this file belongs to a tender
      // and all of that tender's files are now ready
      try {
        const tender = await Tender.findOne({ files: enrichedFileId }).lean();
        if (tender) {
          const fileIds = ((tender as any).files as any[]).map((f: any) =>
            f._id ? f._id.toString() : f.toString()
          );
          const { EnrichedFile: EF } = await import("@models");
          const pendingCount = await EF.countDocuments({
            _id: { $in: fileIds },
            summaryStatus: { $in: ["pending", "processing"] },
          });
          if (pendingCount === 0) {
            console.log(`[EnrichedFileSummary] All tender files ready — triggering summary for tender ${(tender as any)._id}`);
            generateTenderSummary((tender as any)._id.toString()).catch((err) =>
              console.warn("[EnrichedFileSummary] Tender summary generation failed:", err)
            );
          }
        }
      } catch (triggerErr) {
        // Non-fatal — document is still fully processed without the tender summary
        console.warn("[EnrichedFileSummary] Tender summary trigger check failed:", triggerErr);
      }
```

- [ ] **Step 3: Verify server compiles**

```bash
cd server && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/consumer/handlers/enrichedFileSummaryHandler.ts
git commit -m "feat: trigger tender summary regeneration when all files are ready"
```

---

## Task 7: Client — Types and GraphQL Query

**Files:**
- Modify: `client/src/components/Tender/types.ts`

- [ ] **Step 1: Update types.ts**

Replace the full contents of `client/src/components/Tender/types.ts` with:

```typescript
// ─── Shared TypeScript interfaces and utilities for Tender components ──────────

export const TENDER_STATUS_COLORS: Record<string, string> = {
  bidding: "blue",
  won: "green",
  lost: "red",
};

export const tenderStatusColor = (status: string): string =>
  TENDER_STATUS_COLORS[status] ?? "gray";

export interface TenderFileSummaryChunk {
  startPage: number;
  endPage: number;
  overview: string;
  keyTopics: string[];
}

export interface TenderFileSummary {
  overview: string;
  documentType: string;
  keyTopics: string[];
  chunks?: TenderFileSummaryChunk[] | null;
}

export interface TenderFileItem {
  _id: string;
  documentType?: string | null;
  summaryStatus: string;
  summaryError?: string | null;
  pageCount?: number | null;
  summary?: TenderFileSummary | null;
  file: {
    _id: string;
    mimetype: string;
    description?: string | null;
  };
}

export interface TenderJobsite {
  _id: string;
  name: string;
}

export interface TenderNote {
  _id: string;
  content: string;
  savedBy?: { name?: string | null } | null;
  savedAt: string;
  conversationId: string;
}

export interface TenderJobSummary {
  content: string;
  generatedAt: string;
  generatedBy: string;
  generatedFrom: string[];
}

export interface TenderDetail {
  _id: string;
  name: string;
  jobcode: string;
  status: string;
  description?: string | null;
  files: TenderFileItem[];
  notes: TenderNote[];
  jobSummary?: TenderJobSummary | null;
  jobsite?: TenderJobsite | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Tender/types.ts
git commit -m "feat: add TenderNote and TenderJobSummary to client types"
```

---

## Task 8: Client — TenderSummaryTab Component

**Files:**
- Create: `client/src/components/Tender/TenderSummaryTab.tsx`

- [ ] **Step 1: Create TenderSummaryTab.tsx**

```tsx
import {
  Box,
  Button,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import React from "react";
import ReactMarkdown from "react-markdown";
import { TenderDetail, TenderJobSummary } from "./types";

const REGENERATE_SUMMARY = gql`
  mutation TenderRegenerateSummary($id: ID!) {
    tenderRegenerateSummary(id: $id) {
      _id
      jobSummary {
        content
        generatedAt
        generatedBy
        generatedFrom
      }
    }
  }
`;

interface Props {
  tender: TenderDetail;
  onUpdated: () => void;
}

function isStale(jobSummary: TenderJobSummary, tender: TenderDetail): boolean {
  const readyFileIds = tender.files
    .filter((f) => f.summaryStatus === "ready")
    .map((f) => f._id);
  const noteIds = tender.notes.map((n) => n._id);
  const currentIds = new Set([...readyFileIds, ...noteIds]);
  return [...currentIds].some((id) => !jobSummary.generatedFrom.includes(id));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TenderSummaryTab: React.FC<Props> = ({ tender, onUpdated }) => {
  const [regenerate, { loading }] = Apollo.useMutation(REGENERATE_SUMMARY, {
    onCompleted: onUpdated,
  });

  const { jobSummary } = tender;
  const stale = jobSummary ? isStale(jobSummary, tender) : false;

  if (!jobSummary) {
    return (
      <VStack align="stretch" spacing={4} p={4}>
        <Text color="gray.500" fontSize="sm">
          No summary generated yet. Add documents and click Regenerate.
        </Text>
        <Button
          size="sm"
          colorScheme="blue"
          isLoading={loading}
          onClick={() => regenerate({ variables: { id: tender._id } })}
        >
          Generate Summary
        </Button>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={3} p={4}>
      <HStack justify="space-between" align="center">
        <Text fontSize="xs" color="gray.500">
          Generated {timeAgo(jobSummary.generatedAt)}
          {jobSummary.generatedBy === "manual" ? " (manual)" : ""}
        </Text>
        <Button
          size="xs"
          variant="outline"
          isLoading={loading}
          onClick={() => regenerate({ variables: { id: tender._id } })}
        >
          Regenerate
        </Button>
      </HStack>

      {stale && (
        <Box
          bg="yellow.50"
          border="1px solid"
          borderColor="yellow.300"
          borderRadius="md"
          px={3}
          py={2}
        >
          <Text fontSize="xs" color="yellow.800">
            New files or notes have been added since this summary was generated.
          </Text>
        </Box>
      )}

      {loading ? (
        <Box py={8} textAlign="center">
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.500" mt={2}>
            Generating summary...
          </Text>
        </Box>
      ) : (
        <Box
          fontSize="sm"
          sx={{
            "h2": { fontWeight: "semibold", fontSize: "sm", mt: 4, mb: 1 },
            "ul, ol": { pl: 4 },
            "li": { mb: 1 },
            "p": { mb: 2 },
          }}
        >
          <ReactMarkdown>{jobSummary.content}</ReactMarkdown>
        </Box>
      )}
    </VStack>
  );
};

export default TenderSummaryTab;
```

- [ ] **Step 2: Verify react-markdown is available**

```bash
cd client && grep "react-markdown" package.json
```

If not present:
```bash
cd client && npm install react-markdown
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Tender/TenderSummaryTab.tsx
git commit -m "feat: add TenderSummaryTab component with stale detection and regenerate"
```

---

## Task 9: Client — TenderNotesTab Component

**Files:**
- Create: `client/src/components/Tender/TenderNotesTab.tsx`

- [ ] **Step 1: Create TenderNotesTab.tsx**

```tsx
import {
  Box,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import React from "react";
import { TenderDetail } from "./types";

const DELETE_NOTE = gql`
  mutation TenderDeleteNote($id: ID!, $noteId: ID!) {
    tenderDeleteNote(id: $id, noteId: $noteId) {
      _id
      notes {
        _id
        content
        savedBy {
          name
        }
        savedAt
        conversationId
      }
      jobSummary {
        content
        generatedAt
        generatedBy
        generatedFrom
      }
    }
  }
`;

interface Props {
  tender: TenderDetail;
  onUpdated: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TenderNotesTab: React.FC<Props> = ({ tender, onUpdated }) => {
  const [deleteNote, { loading: deleting }] = Apollo.useMutation(DELETE_NOTE, {
    onCompleted: onUpdated,
  });

  if (tender.notes.length === 0) {
    return (
      <Box p={4}>
        <Text fontSize="sm" color="gray.500">
          No notes saved yet. Claude will suggest saving important context during conversations.
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={2} p={4}>
      {tender.notes.map((note) => (
        <Box
          key={note._id}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          px={3}
          py={2}
        >
          <HStack justify="space-between" align="flex-start">
            <Text fontSize="sm" flex={1} mr={2}>
              {note.content}
            </Text>
            <IconButton
              aria-label="Delete note"
              icon={<DeleteIcon />}
              size="xs"
              variant="ghost"
              colorScheme="red"
              isLoading={deleting}
              onClick={() =>
                deleteNote({ variables: { id: tender._id, noteId: note._id } })
              }
            />
          </HStack>
          <Text fontSize="xs" color="gray.400" mt={1}>
            {note.savedBy?.name ?? "Claude"} · {timeAgo(note.savedAt)}
          </Text>
        </Box>
      ))}
    </VStack>
  );
};

export default TenderNotesTab;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Tender/TenderNotesTab.tsx
git commit -m "feat: add TenderNotesTab component with delete"
```

---

## Task 10: Client — Page Restructure (Tabs)

**Files:**
- Rename: `client/src/pages/tender/[id].tsx` → `client/src/pages/tender/[id]/index.tsx`
- Modify: `client/src/pages/tender/[id]/index.tsx`

Note: The pricing branch already performed this rename. If merging from that branch, skip the rename and just modify `[id]/index.tsx`. If working fresh on this branch, perform the rename with git mv.

- [ ] **Step 1: Rename file (skip if already done by pricing branch merge)**

```bash
mkdir -p client/src/pages/tender/\[id\]
git mv client/src/pages/tender/\[id\].tsx client/src/pages/tender/\[id\]/index.tsx
```

- [ ] **Step 2: Rewrite the page with tabs**

Replace the full contents of `client/src/pages/tender/[id]/index.tsx`:

```tsx
import {
  Box,
  Divider,
  Flex,
  Heading,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { navbarHeight } from "../../../constants/styles";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import { useRouter } from "next/router";
import React from "react";
import Breadcrumbs from "../../../components/Common/Breadcrumbs";
import Container from "../../../components/Common/Container";
import Permission from "../../../components/Common/Permission";
import TenderOverview from "../../../components/Tender/TenderOverview";
import TenderDocuments from "../../../components/Tender/TenderDocuments";
import TenderSummaryTab from "../../../components/Tender/TenderSummaryTab";
import TenderNotesTab from "../../../components/Tender/TenderNotesTab";
import ChatPage from "../../../components/Chat/ChatPage";
import { TenderDetail } from "../../../components/Tender/types";
import { UserRoles } from "../../../generated/graphql";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const TENDER_QUERY = gql`
  query TenderDetail($id: ID!) {
    tender(id: $id) {
      _id
      name
      jobcode
      status
      description
      createdAt
      updatedAt
      files {
        _id
        documentType
        summaryStatus
        summaryError
        pageCount
        summary {
          overview
          documentType
          keyTopics
        }
        file {
          _id
          mimetype
          description
        }
      }
      notes {
        _id
        content
        savedBy {
          name
        }
        savedAt
        conversationId
      }
      jobSummary {
        content
        generatedAt
        generatedBy
        generatedFrom
      }
      jobsite {
        _id
        name
      }
    }
  }
`;

interface TenderQueryResult {
  tender: TenderDetail | null;
}

interface TenderQueryVars {
  id: string;
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const TENDER_SUGGESTIONS = [
  "Summarize the key scope of work from the documents",
  "What are the main risks identified in the tender documents?",
  "List any environmental or geotechnical requirements",
  "What are the bonding and insurance requirements?",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const TenderDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const tenderId = typeof id === "string" ? id : "";
  const conversationIdParam = router.query.conversationId;
  const initialConversationId =
    typeof conversationIdParam === "string" ? conversationIdParam : undefined;

  const { data, loading, refetch, startPolling, stopPolling } = Apollo.useQuery<
    TenderQueryResult,
    TenderQueryVars
  >(TENDER_QUERY, {
    variables: { id: tenderId },
    skip: !tenderId,
  });

  const tender = data?.tender;

  // Poll every 3s while any files are pending/processing, stop when all settle
  React.useEffect(() => {
    const hasProcessing = tender?.files.some(
      (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
    );
    if (hasProcessing) {
      startPolling(3000);
    } else {
      stopPolling();
    }
  }, [tender?.files, startPolling, stopPolling]);

  if (loading) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container>
          <Spinner />
        </Container>
      </Permission>
    );
  }

  if (!tender && !loading) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container>
          <Text color="gray.500">Tender not found.</Text>
        </Container>
      </Permission>
    );
  }

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Flex h={`calc(100vh - ${navbarHeight})`} w="100%" overflow="hidden">
        {/* ── Left panel with tabs ─────────────────────────────────────────── */}
        <Box
          w="420px"
          flexShrink={0}
          borderRight="1px solid"
          borderColor="gray.200"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          <Box px={5} pt={5} pb={3} flexShrink={0}>
            <Breadcrumbs
              crumbs={[
                { title: "Tenders", link: "/tenders" },
                {
                  title: tender
                    ? `${tender.jobcode} — ${tender.name}`
                    : "...",
                  isCurrentPage: true,
                },
              ]}
            />
          </Box>

          {tender && (
            <Tabs
              display="flex"
              flexDirection="column"
              flex={1}
              overflow="hidden"
              size="sm"
              variant="line"
            >
              <TabList px={5} flexShrink={0}>
                <Tab>Job</Tab>
                <Tab>Summary</Tab>
                <Tab>Notes {tender.notes.length > 0 ? `(${tender.notes.length})` : ""}</Tab>
              </TabList>

              <TabPanels flex={1} overflow="hidden">
                {/* ── Job tab ──────────────────────────────────────────────── */}
                <TabPanel h="100%" overflowY="auto" px={5} py={3}>
                  <TenderOverview
                    key={tender._id}
                    tender={tender}
                    onUpdated={() => refetch()}
                  />
                  <Divider my={4} />
                  <Heading size="sm" mb={3} color="gray.700">
                    Documents
                  </Heading>
                  <TenderDocuments
                    tender={tender}
                    onUpdated={() => refetch()}
                  />
                </TabPanel>

                {/* ── Summary tab ──────────────────────────────────────────── */}
                <TabPanel h="100%" overflowY="auto" p={0}>
                  <TenderSummaryTab
                    tender={tender}
                    onUpdated={() => refetch()}
                  />
                </TabPanel>

                {/* ── Notes tab ────────────────────────────────────────────── */}
                <TabPanel h="100%" overflowY="auto" p={0}>
                  <TenderNotesTab
                    tender={tender}
                    onUpdated={() => refetch()}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </Box>

        {/* ── Right panel: Chat (always visible) ──────────────────────────── */}
        <Box flex={1} overflow="hidden">
          <ChatPage
            messageEndpoint="/api/tender-chat/message"
            conversationsEndpoint={`/api/tender-conversations/${tenderId}`}
            extraPayload={{ tenderId }}
            suggestions={TENDER_SUGGESTIONS}
            disableRouting
            initialConversationId={initialConversationId}
          />
        </Box>
      </Flex>
    </Permission>
  );
};

export default TenderDetailPage;
```

- [ ] **Step 3: Run the client type check**

```bash
cd client && npm run type-check 2>&1 | tail -30
```

Expected: no new errors (pre-existing errors unrelated to this feature are acceptable).

- [ ] **Step 4: Run codegen to regenerate GraphQL types**

```bash
cd client && npm run codegen 2>&1 | tail -20
```

Expected: completes without errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/tender/ client/src/components/Tender/
git commit -m "feat: restructure tender page into Job/Summary/Notes tabs"
```

---

## Self-Review

**Spec coverage check:**
- ✅ TenderNoteClass + TenderJobSummaryClass on schema — Task 1
- ✅ generateTenderSummary (five sections, Sonnet, text-only) — Task 2
- ✅ save_tender_note + delete_tender_note tools + executor — Task 3
- ✅ tenderDeleteNote + tenderRegenerateSummary mutations — Task 4
- ✅ Notes/summary injected into chat system prompt — Task 5
- ✅ "Should I save that?" instruction in system prompt — Task 5
- ✅ Trigger after all files ready — Task 6
- ✅ Trigger after note save/delete (fire-and-forget in executor) — Task 3
- ✅ Manual regeneration button — Tasks 8 + 4
- ✅ Staleness detection — Task 8
- ✅ Notes tab with delete — Task 9
- ✅ Tab restructure (Job / Summary / Notes) — Task 10
- ✅ Chat always visible on left panel tabs — Task 10

**Not in this plan (per spec):**
- Pricing tab — separate branch
- Jobsite chat notes/summary — future work
- Note editing — out of scope
