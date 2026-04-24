# World-Class Tender Document Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dramatically reduce per-query costs (targeting 70–90% reduction) and improve answer accuracy by replacing coarse chunk navigation with a precise page-level index, adding a `list_document_pages` tool for cheap pre-navigation, decomposing multi-part queries before the agentic loop, and enforcing gap detection via system prompt instructions.

**Architecture:** Three independent improvements layered on the existing agentic system:
1. **Page-level index** — generated at ingestion (Haiku, per page), stored on `EnrichedFile`. A new `list_document_pages` tool returns this index as plain text (no PDF load), letting Claude pinpoint exactly which pages to request before calling `read_document`. Existing chunk-based rendering is kept as a backward-compat fallback until the rescan script is run.
2. **Query decomposition** — a Haiku pre-step in `tender-chat.ts` splits multi-part questions into focused sub-questions injected into the system prompt before the main Claude call.
3. **Gap detection** — system prompt instructions that require Claude to explicitly follow cross-references and confirm completeness before answering.

**Tech Stack:** TypeScript, Typegoose, TypeGraphQL, MongoDB, Anthropic SDK (claude-haiku-4-5 for ingestion and decomposition, claude-sonnet-4-6 / claude-opus-4-6 for main responses)

---

## File Map

| File | Change |
|------|--------|
| `server/src/typescript/enrichedFile.ts` | Add `IEnrichedFilePageEntry`; add `pageIndex?` to root interface (separate from summary) |
| `server/src/models/EnrichedFile/schema/index.ts` | Add `EnrichedFilePageIndexEntryClass`; add `pageIndex?` field to `EnrichedFileSchema` |
| `server/src/consumer/handlers/summarizePdf.ts` | Add `PAGE_INDEX_PROMPT`, `generatePageIndex()`, `summarizePageForIndex()` |
| `server/src/consumer/handlers/enrichedFileSummaryHandler.ts` | Call `generatePageIndex` after document summarization; persist `pageIndex` |
| `server/src/lib/readDocumentExecutor.ts` | Add `LIST_DOCUMENT_PAGES_TOOL` definition and handler inside `makeReadDocumentExecutor` |
| `server/src/lib/buildFileIndex.ts` | Render lean entries for docs with page index (hint about tool); keep chunk rendering as fallback for old docs |
| `server/src/router/tender-chat.ts` | Add query decomposition pre-step; include `LIST_DOCUMENT_PAGES_TOOL`; update system prompt with two-step navigation + gap detection instructions |
| `server/src/scripts/rescan-enriched-files.ts` | New script — resets ready EnrichedFiles to pending and re-publishes for re-summarization |

---

## Task 1: TypeScript Interfaces

**Files:**
- Modify: `server/src/typescript/enrichedFile.ts`

`pageIndex` is a top-level field on the EnrichedFile document (not nested inside `summary`). This keeps the summary focused on document-level routing info and the page index focused on navigation.

- [ ] **Step 1: Add `IEnrichedFilePageEntry` and `pageIndex` to the root interface**

Replace the entire file:

```typescript
export type SummaryStatus = "pending" | "processing" | "ready" | "failed";

export interface IEnrichedFilePageEntry {
  page: number;
  summary: string;
}

export interface IEnrichedFileChunk {
  startPage: number;
  endPage: number;
  overview: string;
  keyTopics: string[];
}

export interface IEnrichedFileSummary {
  overview: string;
  documentType: string;
  keyTopics: string[];
  chunks?: IEnrichedFileChunk[];
}

export interface IEnrichedFileCreate {
  fileId: string;
  documentType?: string;
}
```

Note: `chunks` is kept so existing documents (before rescan) continue to work. `pageIndex` is stored directly on the EnrichedFile document, not inside `summary`.

- [ ] **Step 2: Commit**

```bash
git add server/src/typescript/enrichedFile.ts
git commit -m "feat: add IEnrichedFilePageEntry interface for page-level document index"
```

---

## Task 2: MongoDB / GraphQL Schema

**Files:**
- Modify: `server/src/models/EnrichedFile/schema/index.ts`

- [ ] **Step 1: Add page index entry class and field to schema**

Replace the entire file:

```typescript
import { FileClass } from "../../File/class";
import { IEnrichedFileSummary, SummaryStatus } from "@typescript/enrichedFile";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class EnrichedFileSummaryChunkClass {
  @Field() public startPage!: number;
  @Field() public endPage!: number;
  @Field() public overview!: string;
  @Field(() => [String]) public keyTopics!: string[];
}

@ObjectType()
export class EnrichedFileSummaryClass {
  @Field() public overview!: string;
  @Field() public documentType!: string;
  @Field(() => [String]) public keyTopics!: string[];
  @Field(() => [EnrichedFileSummaryChunkClass], { nullable: true })
  public chunks?: EnrichedFileSummaryChunkClass[];
}

@ObjectType()
export class EnrichedFilePageIndexEntryClass {
  @Field() public page!: number;
  @Field() public summary!: string;
}

@ObjectType()
export class EnrichedFileSchema {
  @Field(() => ID) public _id!: Types.ObjectId;

  @Field(() => FileClass)
  @prop({ ref: () => FileClass, required: true })
  public file!: Ref<FileClass>;

  @Field({ nullable: true })
  @prop({ trim: true })
  public documentType?: string;

  @Field(() => EnrichedFileSummaryClass, { nullable: true })
  @prop({ type: () => Object, required: false })
  public summary?: IEnrichedFileSummary;

  @Field(() => String)
  @prop({
    required: true,
    enum: ["pending", "processing", "ready", "failed"],
    default: "pending",
  })
  public summaryStatus!: SummaryStatus;

  @Field({ nullable: true })
  @prop({ required: false })
  public pageCount?: number;

  @Field(() => [EnrichedFilePageIndexEntryClass], { nullable: true })
  @prop({ type: () => [Object], required: false })
  public pageIndex?: EnrichedFilePageIndexEntryClass[];

  @Field({ nullable: true })
  @prop({ trim: true })
  public summaryError?: string;

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/models/EnrichedFile/schema/index.ts
git commit -m "feat: add pageIndex field to EnrichedFile schema"
```

---

## Task 3: Page Index Generation

**Files:**
- Modify: `server/src/consumer/handlers/summarizePdf.ts`

Add two new exports at the bottom of the file: `PAGE_INDEX_PROMPT` and `generatePageIndex`. Do not modify any existing code.

- [ ] **Step 1: Add page index prompt and generation functions**

Append to the end of `server/src/consumer/handlers/summarizePdf.ts`:

```typescript
export const PAGE_INDEX_PROMPT = `You are indexing one page from a construction document for a paving/concrete company.
Describe this page in 1-2 sentences. Be specific:
- Spec/text pages: include section number or heading and the most specific values, requirements, or standards (e.g. "Section 3.2 Temperature Requirements: minimum pavement surface temp 5°C, minimum air temp 3°C and rising")
- Drawing sheets: include drawing number, title, and what is shown (e.g. "Drawing C-3: culvert crossing detail, 900mm HDPE pipe at station 4+200")
- Tables/schedules: describe what the table contains and any key totals or items
- Cover/TOC pages: note it is a cover page or table of contents
Return only the description text — no JSON, no labels, no formatting.`;

async function summarizePageForIndex(
  anthropic: Anthropic,
  pageBuffer: Buffer,
  pageNumber: number
): Promise<string> {
  // Large pages (e.g. high-res drawing sheets) fall back to text extraction
  if (pageBuffer.length > MAX_CHUNK_BYTES) {
    let text = "";
    try {
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");
      const parsed = await pdfParse(pageBuffer);
      text = parsed.text.trim().slice(0, 3000);
    } catch {
      // ignore
    }
    if (!text) return `Page ${pageNumber}: drawing or image page`;

    const response = await withRateLimitRetry(
      () =>
        anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 150,
          messages: [
            {
              role: "user",
              content: `${PAGE_INDEX_PROMPT}\n\nPage content (text extracted from page ${pageNumber}):\n${text}`,
            },
          ],
        }),
      `page-index-text-${pageNumber}`
    );
    return response.content[0]?.type === "text"
      ? response.content[0].text.trim()
      : `Page ${pageNumber}`;
  }

  const base64 = pageBuffer.toString("base64");
  const response = await withRateLimitRetry(
    () =>
      anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: [
              { type: "text" as const, text: PAGE_INDEX_PROMPT },
              {
                type: "document" as any,
                source: {
                  type: "base64" as const,
                  media_type: "application/pdf" as const,
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    `page-index-${pageNumber}`
  );

  return response.content[0]?.type === "text"
    ? response.content[0].text.trim()
    : `Page ${pageNumber}`;
}

/**
 * Generate a page-by-page index for a PDF.
 * Each entry is a 1-2 sentence description of that page's content.
 * Uses a 1.5s inter-page delay to stay well under Anthropic rate limits.
 * Returns an empty array if the PDF cannot be parsed.
 */
export async function generatePageIndex(
  anthropic: Anthropic,
  buffer: Buffer
): Promise<Array<{ page: number; summary: string }>> {
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch {
    console.warn("[generatePageIndex] pdf-lib failed to parse — skipping page index");
    return [];
  }

  const totalPages = pdfDoc.getPageCount();
  console.log(`[generatePageIndex] Indexing ${totalPages} pages...`);

  const index: Array<{ page: number; summary: string }> = [];
  const INTER_PAGE_DELAY_MS = 1_500;

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, INTER_PAGE_DELAY_MS));
    }
    try {
      const pageBuffer = await extractPages(pdfDoc, i, i + 1);
      const summary = await summarizePageForIndex(anthropic, pageBuffer, i + 1);
      index.push({ page: i + 1, summary });
      if ((i + 1) % 10 === 0) {
        console.log(`[generatePageIndex] ${i + 1}/${totalPages} pages indexed`);
      }
    } catch (err) {
      console.warn(`[generatePageIndex] Failed to index page ${i + 1}:`, err);
      index.push({ page: i + 1, summary: `Page ${i + 1}` });
    }
  }

  console.log(`[generatePageIndex] Done — ${index.length} pages indexed`);
  return index;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/consumer/handlers/summarizePdf.ts
git commit -m "feat: add generatePageIndex for per-page document navigation index"
```

---

## Task 4: Wire Page Index Into Enrichment Handler

**Files:**
- Modify: `server/src/consumer/handlers/enrichedFileSummaryHandler.ts`

After the existing summary is saved, generate and persist the page index. Only runs for PDF files (not spreadsheets or images — those don't have page indexes).

- [ ] **Step 1: Import `generatePageIndex` and call it after summarization**

Add the import at the top of the file (after the existing `summarizePdf` import on line 5):

```typescript
import { summarizePdf, DocumentSummary, withRateLimitRetry, RateLimitExhaustedError, generatePageIndex } from "./summarizePdf";
```

Then, inside the `handle` method, after the `await EnrichedFile.findByIdAndUpdate(enrichedFileId, { $set: { summary, summaryStatus: "ready", ... } })` call (currently lines 115–121), add the page index generation for PDFs:

```typescript
      await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
        $set: {
          summary,
          summaryStatus: "ready",
          ...(pageCount !== undefined ? { pageCount } : {}),
        },
      });

      // Generate page-level index for PDFs (not spreadsheets or images)
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
```

- [ ] **Step 2: Commit**

```bash
git add server/src/consumer/handlers/enrichedFileSummaryHandler.ts
git commit -m "feat: generate and persist page index after PDF summarization"
```

---

## Task 5: Add list_document_pages Tool

**Files:**
- Modify: `server/src/lib/readDocumentExecutor.ts`

Add a second tool definition and handle it inside the existing executor. `list_document_pages` returns the stored `pageIndex` as plain text — no S3 fetch, no PDF decode, just a MongoDB field lookup.

- [ ] **Step 1: Add tool definition**

After the closing brace of `READ_DOCUMENT_TOOL` (after line 40), add:

```typescript
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
```

- [ ] **Step 2: Handle `list_document_pages` inside the executor**

In `makeReadDocumentExecutor`, the returned function currently starts with `const input = rawInput as { file_object_id: string; ... }`. Add a branch at the very top of the returned function, before the existing `fileObj` lookup:

```typescript
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
    // ... rest of existing code unchanged
```

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/readDocumentExecutor.ts
git commit -m "feat: add list_document_pages tool for cheap page-level navigation"
```

---

## Task 6: Update buildFileIndex Renderer

**Files:**
- Modify: `server/src/lib/buildFileIndex.ts`

Documents with a `pageIndex` get a lean system prompt entry — just overview and key topics, plus a note that the page index is available via tool. Documents without a `pageIndex` (old docs awaiting rescan) continue to render with the chunk index as before.

- [ ] **Step 1: Replace the file**

```typescript
export function buildFileEntry(f: any, serverBase: string, token: string): string {
  const summary = f.summary as any;
  const pageIndex = f.pageIndex as Array<{ page: number; summary: string }> | undefined;
  const chunks = summary?.chunks as Array<{
    startPage: number;
    endPage: number;
    overview: string;
    keyTopics: string[];
  }> | undefined;

  // Docs with a page index: lean entry — the detail is available via list_document_pages
  const navigationHint =
    pageIndex && pageIndex.length > 0
      ? `\nNavigation: ${pageIndex.length}-page index available — call list_document_pages to see page-by-page breakdown before loading`
      : chunks && chunks.length > 1
      ? `\nPage Sections:\n${chunks
          .map((c) => `  Pages ${c.startPage}–${c.endPage}: ${c.keyTopics.slice(0, 6).join(", ")}`)
          .join("\n")}`
      : "";

  const filename = f.file?.description;
  return [
    `**File ID: ${f._id}**`,
    filename ? `Filename: ${filename}` : null,
    `Type: ${summary?.documentType || f.documentType || "Unknown"}`,
    `URL: ${serverBase}/api/enriched-files/${f._id}`,
    summary
      ? `Overview: ${summary.overview}\nKey Topics: ${(summary.keyTopics as string[]).join(", ")}${navigationHint}`
      : "Summary: not yet available",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface FileIndexResult {
  fileIndex: string;
  specFileIndex: string;
  pendingNotice: string;
}

export function buildFileIndex(
  jobsiteFiles: any[],
  specFiles: any[],
  serverBase: string,
  token: string
): FileIndexResult {
  const readyFiles = jobsiteFiles.filter((f: any) => f.summaryStatus === "ready");
  const pendingFiles = jobsiteFiles.filter(
    (f: any) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  );
  const readySpecFiles = specFiles.filter((f: any) => f.summaryStatus === "ready");

  const fileIndex = readyFiles
    .map((f) => buildFileEntry(f, serverBase, token))
    .join("\n\n---\n\n");
  const specFileIndex = readySpecFiles
    .map((f) => buildFileEntry(f, serverBase, token))
    .join("\n\n---\n\n");
  const pendingNotice =
    pendingFiles.length > 0
      ? `\n\nNOTE: ${pendingFiles.length} document(s) are still being processed.`
      : "";

  return { fileIndex, specFileIndex, pendingNotice };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/lib/buildFileIndex.ts
git commit -m "feat: render lean file index entries for docs with page index"
```

---

## Task 7: Query Decomposition + System Prompt Updates

**Files:**
- Modify: `server/src/router/tender-chat.ts`

Three changes in one file:
1. Include `LIST_DOCUMENT_PAGES_TOOL` in the tools array
2. Add a Haiku pre-step to decompose multi-part queries
3. Update system prompt instructions with two-step navigation and gap detection

- [ ] **Step 1: Update import**

Change the import on line 6:

```typescript
import { READ_DOCUMENT_TOOL, LIST_DOCUMENT_PAGES_TOOL, makeReadDocumentExecutor } from "../lib/readDocumentExecutor";
```

- [ ] **Step 2: Add query decomposition after the `buildFileIndex` call and before `systemPrompt`**

After line 63 (`const { fileIndex, specFileIndex, pendingNotice } = buildFileIndex(...)`), add:

```typescript
  // ── Query decomposition ────────────────────────────────────────────────────
  // Split multi-part questions into focused sub-questions before the main call.
  // Runs in parallel with system prompt assembly — only affects the system prompt.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  let decomposedQuestions: string[] = [];
  if (lastUserMessage.trim()) {
    try {
      const anthropicForDecomp = new (await import("@anthropic-ai/sdk")).default({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      const decompResponse = await anthropicForDecomp.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Does this question contain multiple distinct parts that should each be answered separately from a document?
If yes, list each part as a short, focused question (one per line, no numbering or bullets).
If no, reply with exactly: SINGLE

Question: "${lastUserMessage}"`,
          },
        ],
      });
      const decompText =
        decompResponse.content[0]?.type === "text"
          ? decompResponse.content[0].text.trim()
          : "SINGLE";
      if (decompText !== "SINGLE") {
        decomposedQuestions = decompText
          .split("\n")
          .map((q) => q.trim())
          .filter(Boolean);
      }
    } catch {
      // Non-fatal — proceed without decomposition
    }
  }
```

- [ ] **Step 3: Replace the `systemPrompt` definition**

Replace the existing `const systemPrompt = ...` block (lines 65–85) with:

```typescript
  const decompositionBlock =
    decomposedQuestions.length > 1
      ? `\n## This Question\nThis question has multiple parts — address each one:\n${decomposedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n`
      : "";

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping to analyze tender documents for Bow-Mark, a paving and concrete company.

You are working on tender: **${tender.name}** (Job Code: ${tender.jobcode})${tender.description ? `\nTender description: ${tender.description}` : ""}

## Tender Documents

${fileIndex || "No tender documents have been processed yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications (shared across all tenders)\n\n${specFileIndex}` : ""}
${decompositionBlock}
## Instructions

**Clarify before assuming.** Construction documents often contain multiple instances of similar things — two crossings, two structures, two phases, two contract items with similar names. If a question could apply to more than one thing, ask which one the user means before loading a document.

**Ask when uncertain.** If you read a document and are not confident it contains the answer, say so explicitly and ask the user if they want you to look in a different document or provide more context. Do not guess or fill gaps with general knowledge.

**Loading documents — two steps.** For documents that have a page index, call list_document_pages first to see the page-by-page breakdown, then call read_document with only the specific pages you need. This is much cheaper and faster than loading large page ranges blindly. Only skip list_document_pages if the document has no page index (the navigation hint will say so).

**Citations.** When you reference a specific fact, requirement, section, or drawing from a document you have read, include a page link in this format: **[[Document Type, p.X]](URL#page=X)**. Only cite pages you have actually read. If you are not certain of the exact page, note it as approximate: **[[Spec, p.~12]](URL#page=12)**.

**Drawings.** If a document is a drawing, describe what you see as part of your answer.

**Cross-references.** When you read a page that references another drawing, document, or standard (e.g. "see Drawing C-3", "per OPSS 1150"), note it explicitly. If it directly answers the question, follow it automatically. If tangential, mention it so the user can decide whether to pursue it.

**Completeness.** Before giving your final answer, confirm you have addressed all parts of the question. If you found cross-references you have not checked, note what is outstanding so the user can decide.

**Scope.** Answer only from the tender documents and reference specs provided. If the answer is not in the documents, say so clearly rather than drawing on general knowledge.`;
```

- [ ] **Step 4: Include `LIST_DOCUMENT_PAGES_TOOL` in tools array**

Change line 95:

```typescript
    tools: [LIST_DOCUMENT_PAGES_TOOL, READ_DOCUMENT_TOOL],
```

- [ ] **Step 5: Commit**

```bash
git add server/src/router/tender-chat.ts
git commit -m "feat: add query decomposition, list_document_pages tool, and gap detection instructions"
```

---

## Task 8: Re-scan Script

**Files:**
- Create: `server/src/scripts/rescan-enriched-files.ts`

Resets all ready EnrichedFiles to pending and re-publishes them to RabbitMQ. Run once after deploying this feature to regenerate all summaries with page indexes. The consumer must be running to process the queue.

- [ ] **Step 1: Create the script**

```typescript
/**
 * Rescan enriched files — re-trigger summarization for all ready EnrichedFiles.
 *
 * Run after deploying the world-class tender summaries feature to regenerate
 * all document summaries and build page indexes for existing documents.
 * The consumer MUST be running to process the queue.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/scripts/rescan-enriched-files.ts
 *
 * Flags:
 *   --dry-run   Log what would be reset without making any changes
 *   --id <id>   Re-scan a single enrichedFile by its MongoDB _id
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, "../../.env.development") });
}

import mongoose from "mongoose";
import { EnrichedFile } from "../models";
import { publishEnrichedFileCreated } from "../rabbitmq/publisher";

const isDryRun = process.argv.includes("--dry-run");
const targetId = (() => {
  const idx = process.argv.indexOf("--id");
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI required");
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });
  console.log("[rescan] Connected to MongoDB");

  const query = targetId
    ? { _id: new mongoose.Types.ObjectId(targetId) }
    : { summaryStatus: "ready" };

  const files = await EnrichedFile.find(query).populate("file").lean();
  console.log(
    `[rescan] Found ${files.length} file(s) to re-scan${isDryRun ? " (dry run — no changes will be made)" : ""}`
  );

  let count = 0;
  for (const f of files) {
    const fileId =
      typeof f.file === "object" && (f.file as any)._id
        ? (f.file as any)._id.toString()
        : (f.file as any).toString();

    console.log(`[rescan] ${isDryRun ? "[dry-run] " : ""}${f._id} → file ${fileId}`);

    if (!isDryRun) {
      await EnrichedFile.findByIdAndUpdate(f._id, {
        $set: { summaryStatus: "pending" },
        $unset: { summary: "", summaryError: "", pageIndex: "" },
      });
      await publishEnrichedFileCreated(f._id.toString(), fileId, 0);
      count++;
      // Small delay to avoid flooding RabbitMQ
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(
    `[rescan] Done. ${isDryRun ? "Would have reset" : "Reset and re-queued"} ${isDryRun ? files.length : count} file(s).`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[rescan] Fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/scripts/rescan-enriched-files.ts
git commit -m "feat: add rescan-enriched-files script to rebuild page indexes on existing documents"
```

---

## Deployment Notes

1. **Deploy the server** — the consumer picks up the new page index generation automatically for all new uploads.

2. **Verify a fresh upload** produces a page index by checking MongoDB after a document is processed:
   ```bash
   # In the server pod or via mongo shell
   db.enrichedfiles.findOne({ summaryStatus: "ready", pageIndex: { $exists: true } }, { pageIndex: 1 })
   ```
   You should see an array of `{ page, summary }` entries.

3. **Verify the chat** — ask a specific question about a freshly uploaded document. You should see `list_document_pages` called in the tool_call events before `read_document`.

4. **Re-scan existing documents** — once confident the new flow works, run the rescan script:
   ```bash
   # Dry run first
   ts-node -r tsconfig-paths/register src/scripts/rescan-enriched-files.ts --dry-run

   # Then for real (consumer must be running)
   ts-node -r tsconfig-paths/register src/scripts/rescan-enriched-files.ts
   ```

5. **Monitor the consumer** — for a 300-page document, page index generation takes ~8–10 minutes (1.5s delay × 300 pages). Watch consumer logs to confirm completion.

6. **Cost validation** — after the rescan, pick a conversation that previously used heavy document loads and re-ask the same question. Compare token usage in the usage events.
