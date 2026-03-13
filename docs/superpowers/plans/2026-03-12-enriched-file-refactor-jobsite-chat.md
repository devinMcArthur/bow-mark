# EnrichedFile Refactor + Jobsite Chat Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote `EnrichedFile` from an embedded Tender subdocument to a first-class MongoDB collection, migrate Tender and System to reference it, add it to Jobsite with role-based access, unify all chatbot conversations into a single scalable `Conversation` model with a shared streaming router factory, and build a Jobsite chatbot for field crew use.

**Architecture:** `EnrichedFile` (new collection `enrichedfiles`) holds the `FileClass` ref plus all AI-generated summary data — it's the single source of truth for a processed document. Tender, System, and Jobsite all hold `Ref<EnrichedFileClass>[]` (or a thin wrapper with `minRole` for Jobsite). One unified RabbitMQ queue and one consumer handler drives summarisation for all three contexts. All chatbot conversations are stored in a single `conversations` collection with a `context` discriminator field; a `createChatRouter(config)` factory extracts the shared SSE streaming infrastructure so each chatbot is only its system prompt, tools, and file-loading logic. The Jobsite chatbot is the first consumer of the factory; the existing Tender and analytics chatbots are then refactored to use it.

**Tech Stack:** TypeScript, Typegoose/Mongoose, Type-GraphQL, RabbitMQ (amqplib), Anthropic SDK, Express, Next.js/React, Chakra UI, GraphQL Code Generator

---

## Background & Design Decisions

This plan was designed after a discussion about the Tender → Jobsite workflow when a bid is won. Key decisions made:

1. **Why first-class EnrichedFile?** The same AI-processed document (specs, drawings) needs to be referenced by both a Tender and the Jobsite that won it. Embedded subdocs can't be shared — you'd have to copy them and keep them in sync when a file is re-summarised. A standalone `enrichedfiles` collection lets both objects point at the same document.

2. **Why not re-summarise when promoting to Jobsite?** The summaries are navigation indexes, not answer sources. The chatbot reads actual PDF pages via `read_document`; the summary just helps it pick which pages. The difference between a "tender-focused" vs "operations-focused" index for the same spec book is marginal — the system prompt / chatbot persona is what makes the response useful for field crew. No re-processing means no API cost and instant availability.

3. **minRole lives on the Jobsite join, not on EnrichedFile.** A file's visibility is a property of the relationship (Jobsite ↔ file), not of the file itself. Same EnrichedFile might be accessible to all users in one Jobsite but PM-only in another. The join wrapper `JobsiteEnrichedFileRefClass` carries `minRole: UserRoles`.

4. **Jobsite.fileObjects[] is deprecated, not migrated.** 87 paving jobsites have files there (verified by MongoDB query). They stay visible as read-only; no new additions go through that path. All new Jobsite file management uses `enrichedFiles[]`.

5. **Tender → Jobsite "promote" flow is out of scope for this plan.** For now, files are added directly to a Jobsite's `enrichedFiles[]`. The promote flow (copy refs from a won Tender to the linked Jobsite) is a follow-on.

6. **RabbitMQ queues are consolidated.** `tender.file_summary` and `spec.file_summary` are replaced by a single `enriched.file_summary` queue. The message payload simplifies to `{ enrichedFileId, fileId }` — no `tenderId` needed.

7. **Conversations are unified into one collection.** `chatconversations` and `tenderconversations` are two near-identical schemas (same message structure, same token accounting) that differ only by their context ref. Adding Jobsite and DailyReport chatbots without unifying first means four separate models with copy-pasted code. The new `conversations` collection uses a `context: { type, refId }` discriminator field so new chatbot types cost zero schema changes. **Production impact:** `chatconversations` has real user data in production. `tenderconversations` exists only on this feature branch (Tender chat has never been deployed). The migration script renames `chatconversations` → `conversations` in-place (adding a `context` field) and is designed to run as a pre-deploy k8s Job.

8. **Chatbot router infrastructure is extracted into a factory.** `chat.ts` (~650 lines) and `tender-chat.ts` (~650 lines) share ~500 lines of identical SSE streaming logic — auth, keepalive, agentic tool loop, conversation save, title generation, error handling. Only the system prompt builder, tool definitions, and tool handler differ per chatbot. A `createChatRouter(config)` factory captures the shared infrastructure once; each chatbot registers its configuration. New chatbots (Jobsite, DailyReport) are ~80-100 lines of config, not 650 lines of copy-paste.

---

## File Map

### New Files (Server)
| File | Purpose |
|------|---------|
| `server/src/models/EnrichedFile/schema/index.ts` | Typegoose schema — all fields from the old embedded `EnrichedFileClass` |
| `server/src/models/EnrichedFile/class/index.ts` | Class with static methods, re-exports |
| `server/src/models/EnrichedFile/class/get.ts` | `getById`, `getByIds` |
| `server/src/models/EnrichedFile/class/create.ts` | `createDocument` |
| `server/src/models/EnrichedFile/index.ts` | barrel export |
| `server/src/consumer/handlers/enrichedFileSummaryHandler.ts` | Unified handler (merges tenderFileSummaryHandler + specFileSummaryHandler) |
| `server/src/router/enriched-files.ts` | Signed-URL redirect for any EnrichedFile by ID (replaces tender-files + spec-files) |
| `server/src/models/Conversation.ts` | Unified conversation model (`conversations` collection) replacing `ChatConversation` + `TenderConversation` |
| `server/src/router/chat/createChatRouter.ts` | Factory function — shared SSE streaming infrastructure; each chatbot passes config only |
| `server/src/router/chat/tenderChatConfig.ts` | Tender chatbot configuration (system prompt builder, tools, tool handler) |
| `server/src/router/chat/analyticsChatConfig.ts` | Analytics chatbot configuration (system prompt, MCP tools) |
| `server/src/router/chat/jobsiteChatConfig.ts` | Jobsite chatbot configuration (role-filtered files, operations system prompt) |
| `server/src/router/jobsite-chat.ts` | Thin Express router — calls `createChatRouter(jobsiteChatConfig)` |
| `server/src/scripts/migrate-enriched-files.ts` | One-off: extracts embedded Tender.files[] and System.specFiles[] into the new collection |
| `server/src/scripts/migrate-conversations.ts` | One-off: migrates `chatconversations` → `conversations` (adds context field); designed to also run as a k8s pre-deploy Job in production |

### Modified Files (Server)
| File | Change |
|------|--------|
| `server/src/models/ChatConversation.ts` | Kept temporarily during migration; deleted after `Conversation` model is live |
| `server/src/models/TenderConversation.ts` | Replaced by `Conversation` model; file deleted |
| `server/src/router/chat.ts` | Refactored to thin wrapper: `createChatRouter(analyticsChatConfig)` |
| `server/src/router/tender-chat.ts` | Refactored to thin wrapper: `createChatRouter(tenderChatConfig)` |
| `server/src/models/Tender/schema/index.ts` | Remove embedded classes; `files` becomes `Ref<EnrichedFileClass>[]` |
| `server/src/models/Tender/class/get.ts` | Nested populate: `populate({ path: "files", populate: "file" })` |
| `server/src/models/System/schema/index.ts` | `specFiles` becomes `Ref<EnrichedFileClass>[]` |
| `server/src/models/System/class/get.ts` | Add populate for specFiles |
| `server/src/models/Jobsite/schema/index.ts` | Add `enrichedFiles: JobsiteEnrichedFileRefClass[]`, deprecation comment on `fileObjects` |
| `server/src/models/Jobsite/schema/subDocuments.ts` | Add `JobsiteEnrichedFileRefClass { enrichedFile: Ref<EnrichedFileClass>, minRole: UserRoles }` |
| `server/src/models/index.ts` | Register `EnrichedFile` model (`enrichedfiles` collection) |
| `server/src/typescript/tender.ts` | Remove `IEnrichedFileSummary`, `IEnrichedFileChunk`, `SummaryStatus` (move to `@typescript/enrichedFile.ts`) |
| `server/src/rabbitmq/config.ts` | Add `enrichedFile` queue; remove `tenderFile` + `specFile` queues |
| `server/src/rabbitmq/publisher.ts` | Add `publishEnrichedFileCreated`; remove `publishTenderFileCreated` + `publishSpecFileCreated` |
| `server/src/consumer/handlers/index.ts` | Export `enrichedFileSummaryHandler`; remove old two |
| `server/src/consumer/index.ts` | Route `enrichedFile` queue; simplify `recoverStuckFiles` to query EnrichedFile collection |
| `server/src/graphql/resolvers/tender/index.ts` | File mutations create/delete EnrichedFile docs |
| `server/src/graphql/resolvers/system/index.ts` | Spec file mutations create/delete EnrichedFile docs |
| `server/src/graphql/resolvers/jobsite/index.ts` | Add enriched file mutations (add, remove, retry) |
| `server/src/app.ts` | Register `enriched-files` and `jobsite-chat` routers; remove old tender-files and spec-files routes |
| `server/src/router/tender-chat.ts` | Populate EnrichedFile refs; use `EnrichedFile` model for file index |

### New/Modified Files (Client)
| File | Purpose |
|------|---------|
| `client/src/graphql/mutations/JobsiteAddEnrichedFile.graphql` | New mutation |
| `client/src/graphql/mutations/JobsiteRemoveEnrichedFile.graphql` | New mutation |
| `client/src/graphql/mutations/JobsiteRetryEnrichedFile.graphql` | New mutation |
| `client/src/graphql/fragments/Jobsite.graphql` (or nearest equivalent) | Add `enrichedFiles` fields |
| `client/src/components/Common/EnrichedFiles/EnrichedFileList.tsx` | Shared file-list + status component (reused by Tender, System, Jobsite pages) |
| `client/src/graphql/fragments/System.graphql` | Update `specFiles` to match new shape (already has `chunks`) |
| `client/src/generated/graphql.tsx` | Regenerated by codegen |
| `client/src/generated/page.tsx` | Regenerated by codegen |

---

## Chunk 1: EnrichedFile Model

### Task 1: Create shared TypeScript types

**Files:**
- Create: `server/src/typescript/enrichedFile.ts`
- Modify: `server/src/typescript/tender.ts`

- [ ] **Step 1: Create `server/src/typescript/enrichedFile.ts`**

```ts
export type SummaryStatus = "pending" | "processing" | "ready" | "failed";

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
```

- [ ] **Step 2: Update `server/src/typescript/tender.ts` to import from the new shared file**

Remove `SummaryStatus`, `IEnrichedFileChunk`, `IEnrichedFileSummary` from tender.ts and re-export them from the shared file so nothing breaks during migration:

```ts
export type { SummaryStatus, IEnrichedFileChunk, IEnrichedFileSummary } from "./enrichedFile";
export type TenderStatus = "bidding" | "won" | "lost";
// ... keep ITenderCreate, ITenderUpdate, IEnrichedFileCreate
```

- [ ] **Step 3: Commit**

```bash
git add server/src/typescript/enrichedFile.ts server/src/typescript/tender.ts
git commit -m "refactor: extract EnrichedFile TypeScript types to shared module"
```

---

### Task 2: EnrichedFile Mongoose model

**Files:**
- Create: `server/src/models/EnrichedFile/schema/index.ts`
- Create: `server/src/models/EnrichedFile/class/get.ts`
- Create: `server/src/models/EnrichedFile/class/create.ts`
- Create: `server/src/models/EnrichedFile/class/index.ts`
- Create: `server/src/models/EnrichedFile/index.ts`
- Modify: `server/src/models/index.ts`

- [ ] **Step 1: Create the schema**

```ts
// server/src/models/EnrichedFile/schema/index.ts
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

  @Field()
  @prop({ required: true, enum: ["pending", "processing", "ready", "failed"], default: "pending" })
  public summaryStatus!: SummaryStatus;

  @Field({ nullable: true })
  @prop({ required: false })
  public pageCount?: number;

  @Field({ nullable: true })
  @prop({ trim: true })
  public summaryError?: string;

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;
}
```

- [ ] **Step 2: Create class/get.ts**

```ts
// server/src/models/EnrichedFile/class/get.ts
import { EnrichedFileDocument, EnrichedFileModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";

const byId = async (
  EnrichedFile: EnrichedFileModel,
  id: Id,
  options?: GetByIDOptions
): Promise<EnrichedFileDocument | null> => {
  if (options?.throwError) {
    const doc = await EnrichedFile.findById(id).populate("file");
    if (!doc) throw new Error(`EnrichedFile ${id} not found`);
    return doc;
  }
  return EnrichedFile.findById(id).populate("file");
};

const byIds = async (
  EnrichedFile: EnrichedFileModel,
  ids: Id[]
): Promise<EnrichedFileDocument[]> => {
  return EnrichedFile.find({ _id: { $in: ids } }).populate("file");
};

export default { byId, byIds };
```

- [ ] **Step 3: Create class/create.ts**

```ts
// server/src/models/EnrichedFile/class/create.ts
import { EnrichedFileDocument, EnrichedFileModel } from "@models";
import { Types } from "mongoose";

const document = async (
  EnrichedFile: EnrichedFileModel,
  fileId: string,
  documentType?: string
): Promise<EnrichedFileDocument> => {
  return new EnrichedFile({
    _id: new Types.ObjectId(),
    file: fileId,
    summaryStatus: "pending",
    ...(documentType ? { documentType } : {}),
  });
};

export default { document };
```

- [ ] **Step 4: Create class/index.ts**

```ts
// server/src/models/EnrichedFile/class/index.ts
import { getModelForClass, ReturnModelType } from "@typegoose/typegoose";
import { EnrichedFileSchema } from "../schema";
import get from "./get";
import create from "./create";

export class EnrichedFileClass extends EnrichedFileSchema {
  static async getById(this: ReturnModelType<typeof EnrichedFileClass>, id: string, options?: { throwError?: boolean }) {
    return get.byId(this, id, options);
  }

  static async getByIds(this: ReturnModelType<typeof EnrichedFileClass>, ids: string[]) {
    return get.byIds(this, ids);
  }

  static async createDocument(this: ReturnModelType<typeof EnrichedFileClass>, fileId: string, documentType?: string) {
    return create.document(this, fileId, documentType);
  }
}

export * from "../schema";
```

- [ ] **Step 5: Create index.ts barrel**

```ts
// server/src/models/EnrichedFile/index.ts
export * from "./schema";
export * from "./class";
```

- [ ] **Step 6: Register the model in `server/src/models/index.ts`**

Add at the top with other exports:
```ts
export * from "./EnrichedFile";
```

Add the model registration block (follow the existing pattern):
```ts
// ----- EnrichedFile -----
import { EnrichedFileClass } from "./EnrichedFile/class";

export type EnrichedFileDocument = DocumentType<EnrichedFileClass>;
export type EnrichedFileModel = ReturnModelType<typeof EnrichedFileClass>;

export const EnrichedFile = getModelForClass(EnrichedFileClass, {
  schemaOptions: { collection: "enrichedfiles" },
});
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd server && npx ts-node -r tsconfig-paths/register -e "require('./src/models/EnrichedFile')"
```
Expected: no output (no errors)

- [ ] **Step 8: Commit**

```bash
git add server/src/models/EnrichedFile/ server/src/models/index.ts
git commit -m "feat: add EnrichedFile as first-class MongoDB model"
```

---

## Chunk 2: RabbitMQ + Consumer Consolidation

### Task 3: Unified RabbitMQ queue and publisher

**Files:**
- Modify: `server/src/rabbitmq/config.ts`
- Modify: `server/src/rabbitmq/publisher.ts`

- [ ] **Step 1: Update `server/src/rabbitmq/config.ts`**

Replace the `tenderFile` and `specFile` queue entries with a single `enrichedFile` entry:

```ts
enrichedFile: {
  name: "enriched.file_summary",
  bindings: ["enriched_file.*"],
  options: { durable: true },
},
```

Remove from `ROUTING_KEYS`:
```ts
// DELETE tenderFile and specFile entries
```

Add to `ROUTING_KEYS`:
```ts
enrichedFile: {
  created: "enriched_file.created",
},
```

- [ ] **Step 2: Update `server/src/rabbitmq/publisher.ts`**

Remove `TenderFileSummaryMessage`, `publishTenderFileCreated`, `SpecFileSummaryMessage`, `publishSpecFileCreated`.

Add:
```ts
export interface EnrichedFileSummaryMessage {
  enrichedFileId: string;
  fileId: string;
  timestamp: string;
}

export const publishEnrichedFileCreated = async (
  enrichedFileId: string,
  fileId: string
): Promise<boolean> => {
  const message: EnrichedFileSummaryMessage = {
    enrichedFileId,
    fileId,
    timestamp: new Date().toISOString(),
  };
  try {
    const channel = await getChannel();
    await setupTopology();
    const success = channel.publish(
      RABBITMQ_CONFIG.exchange.name,
      ROUTING_KEYS.enrichedFile.created,
      Buffer.from(JSON.stringify(message)),
      { persistent: true, contentType: "application/json" }
    );
    if (success) console.log(`[RabbitMQ] Published enriched_file.created: ${enrichedFileId}`);
    return success;
  } catch (error) {
    console.error(`[RabbitMQ] Failed to publish enriched_file.created:`, error);
    return false;
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add server/src/rabbitmq/config.ts server/src/rabbitmq/publisher.ts
git commit -m "refactor: consolidate tender + spec file RabbitMQ queues into enriched_file queue"
```

---

### Task 4: Unified consumer handler

**Files:**
- Create: `server/src/consumer/handlers/enrichedFileSummaryHandler.ts`
- Modify: `server/src/consumer/handlers/index.ts`
- Modify: `server/src/consumer/index.ts`
- Delete: `server/src/consumer/handlers/tenderFileSummaryHandler.ts`
- Delete: `server/src/consumer/handlers/specFileSummaryHandler.ts`

- [ ] **Step 1: Create `server/src/consumer/handlers/enrichedFileSummaryHandler.ts`**

This merges both old handlers. The only logic change is: instead of updating an embedded subdoc on Tender or System, it updates the `EnrichedFile` document directly.

```ts
import Anthropic from "@anthropic-ai/sdk";
import { EnrichedFile } from "@models";
import { getFile } from "@utils/fileStorage";
import type { EnrichedFileSummaryMessage } from "../../rabbitmq/publisher";
import { summarizePdf, DocumentSummary } from "./summarizePdf";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARY_PROMPT = `You are processing a construction document for a paving/concrete company.
Analyze this document and return a JSON object with exactly these fields:
{
  "overview": "2-4 sentence summary of what this document is and its main purpose",
  "documentType": "what type of document this is (e.g. Spec Book, Drawing, Schedule of Quantities, Geotechnical Report, DSSP, Traffic Control Plan, Municipal Spec, Standard Drawing, Material Standard, Addendum, etc.)",
  "keyTopics": ["array", "of", "key", "topics", "materials", "or", "requirements", "mentioned"]
}
Return only valid JSON, no markdown, no explanation.`;

export const enrichedFileSummaryHandler = {
  async handle(message: EnrichedFileSummaryMessage): Promise<void> {
    const { enrichedFileId, fileId } = message;
    console.log(`[EnrichedSummary] Processing enrichedFile ${enrichedFileId}, file ${fileId}`);

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
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 512,
          messages: [{ role: "user", content: `${SUMMARY_PROMPT}\n\nDocument content:\n${sheets.slice(0, 50000)}` }],
        });
        const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
        const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        summary = JSON.parse(cleaned);
      } else if (contentType.startsWith("image/")) {
        const response = await anthropic.messages.create({
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
        });
        const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
        const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        summary = JSON.parse(cleaned);
      } else {
        summary = await summarizePdf(anthropic, buffer, SUMMARY_PROMPT);
      }

      let pageCount: number | undefined;
      if (!isSpreadsheet && !contentType.startsWith("image/")) {
        const pdfText = buffer.toString("binary");
        const pageMatches = pdfText.match(/\/Type\s*\/Page(?!s)/g);
        if (pageMatches?.length) pageCount = pageMatches.length;
      }

      await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
        $set: {
          summary,
          summaryStatus: "ready",
          ...(pageCount !== undefined ? { pageCount } : {}),
        },
      });

      console.log(`[EnrichedSummary] Done for enrichedFile ${enrichedFileId}`);
    } catch (error) {
      console.error(`[EnrichedSummary] Failed for enrichedFile ${enrichedFileId}:`, error);
      const summaryError = error instanceof Error ? error.message : String(error);
      await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
        $set: { summaryStatus: "failed", summaryError },
      });
      throw error;
    }
  },
};
```

- [ ] **Step 2: Update `server/src/consumer/handlers/index.ts`**

Remove exports for `tenderFileSummaryHandler` and `specFileSummaryHandler`. Add:
```ts
export { enrichedFileSummaryHandler } from "./enrichedFileSummaryHandler";
```

- [ ] **Step 3: Update `server/src/consumer/index.ts`**

Update the imports at the top:
```ts
import type { SyncMessage, EnrichedFileSummaryMessage } from "../rabbitmq/publisher";
import { publishEnrichedFileCreated } from "../rabbitmq/publisher";
import { EnrichedFile } from "@models";
import { enrichedFileSummaryHandler } from "./handlers";
```

In `processMessage`, replace the `tenderFile` and `specFile` cases with:
```ts
case RABBITMQ_CONFIG.queues.enrichedFile.name: {
  const efMsg: EnrichedFileSummaryMessage = JSON.parse(content);
  await enrichedFileSummaryHandler.handle(efMsg);
  break;
}
```

Replace `recoverStuckFiles()` with the simplified version:
```ts
async function recoverStuckFiles(): Promise<void> {
  const stuck = await EnrichedFile.find({ summaryStatus: "processing" }).lean();
  for (const ef of stuck) {
    await EnrichedFile.findByIdAndUpdate(ef._id, {
      $set: { summaryStatus: "pending" },
    });
    if (!ef.file) continue;
    await publishEnrichedFileCreated(ef._id.toString(), ef.file.toString());
    console.log(`[Consumer] Recovered stuck EnrichedFile ${ef._id}`);
  }
}
```

- [ ] **Step 4: Delete old handler files**

```bash
rm server/src/consumer/handlers/tenderFileSummaryHandler.ts
rm server/src/consumer/handlers/specFileSummaryHandler.ts
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | head -40
```
Expected: no errors (or only errors in files not yet migrated — those are addressed in later tasks)

- [ ] **Step 6: Commit**

```bash
git add server/src/consumer/
git commit -m "refactor: unify tender + spec file consumer handlers into enrichedFileSummaryHandler"
```

---

## Chunk 3: Tender + System Migration

### Task 5: Migrate Tender schema and resolver

**Files:**
- Modify: `server/src/models/Tender/schema/index.ts`
- Modify: `server/src/models/Tender/class/get.ts`
- Modify: `server/src/graphql/resolvers/tender/index.ts`

- [ ] **Step 1: Update Tender schema**

Replace the entire content of `server/src/models/Tender/schema/index.ts`:

```ts
import { EnrichedFileClass } from "../../EnrichedFile/class";
import { JobsiteClass } from "../../Jobsite/class";
import { UserClass } from "../../User/class";
import { TenderStatus } from "@typescript/tender";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class TenderSchema {
  @Field(() => ID) public _id!: Types.ObjectId;

  @Field()
  @prop({ required: true, trim: true })
  public name!: string;

  @Field()
  @prop({ required: true, trim: true, unique: true })
  public jobcode!: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field()
  @prop({ required: true, enum: ["bidding", "won", "lost"], default: "bidding" })
  public status!: TenderStatus;

  @Field(() => JobsiteClass, { nullable: true })
  @prop({ ref: () => JobsiteClass })
  public jobsite?: Ref<JobsiteClass>;

  @Field(() => [EnrichedFileClass])
  @prop({ ref: () => EnrichedFileClass, default: [] })
  public files!: Ref<EnrichedFileClass>[];

  @Field(() => UserClass)
  @prop({ ref: () => UserClass, required: true })
  public createdBy!: Ref<UserClass>;

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
```

Note: The `EnrichedFileSummaryChunkClass`, `EnrichedFileSummaryClass`, and `EnrichedFileClass` embedded classes are fully removed from this file.

- [ ] **Step 2: Update Tender.getById to use nested populate**

In `server/src/models/Tender/class/get.ts`, replace `.populate("files.file")` with:

```ts
.populate({ path: "files", populate: { path: "file" } })
```

Both `byId` occurrences.

- [ ] **Step 3: Update the TenderResolver file mutations**

In `server/src/graphql/resolvers/tender/index.ts`:

Update import:
```ts
import { EnrichedFile } from "@models";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";
```

Replace `tenderAddFile`:
```ts
@Authorized(["ADMIN", "PM"])
@Mutation(() => TenderClass)
async tenderAddFile(@Arg("id", () => ID) id: Id, @Arg("data") data: TenderAddFileData) {
  const tender = await Tender.getById(id, { throwError: true });
  const file = await File.getById(data.fileId, { throwError: true });

  // Create the standalone EnrichedFile document
  const enrichedFile = await EnrichedFile.createDocument(
    file!._id.toString(),
    data.documentType
  );
  await enrichedFile.save();

  // Push the ref onto the tender
  tender!.files.push(enrichedFile._id as any);
  await tender!.save();

  await publishEnrichedFileCreated(
    enrichedFile._id.toString(),
    file!._id.toString()
  );

  return Tender.getById(tender!._id.toString());
}
```

Replace `tenderRemoveFile`:
```ts
@Authorized(["ADMIN", "PM"])
@Mutation(() => TenderClass)
async tenderRemoveFile(@Arg("id", () => ID) id: Id, @Arg("fileObjectId", () => ID) fileObjectId: Id) {
  const tender = await Tender.getById(id, { throwError: true });
  tender!.files = tender!.files.filter(
    (f) => f!.toString() !== fileObjectId.toString()
  ) as any;
  await tender!.save();
  // Note: EnrichedFile document is intentionally not deleted here —
  // it may be referenced by a Jobsite after bid-win. Delete separately if needed.
  return Tender.getById(id);
}
```

Replace `tenderRetrySummary`:
```ts
@Authorized(["ADMIN", "PM"])
@Mutation(() => TenderClass)
async tenderRetrySummary(@Arg("id", () => ID) id: Id, @Arg("fileObjectId", () => ID) fileObjectId: Id) {
  // fileObjectId is now the EnrichedFile _id
  const enrichedFile = await EnrichedFile.getById(fileObjectId, { throwError: true });

  await EnrichedFile.findByIdAndUpdate(fileObjectId, {
    $set: { summaryStatus: "pending" },
    $unset: { summaryError: "" },
  });

  const fileId =
    enrichedFile!.file && typeof (enrichedFile!.file as any)._id !== "undefined"
      ? (enrichedFile!.file as any)._id.toString()
      : enrichedFile!.file!.toString();

  await publishEnrichedFileCreated(fileObjectId.toString(), fileId);

  return Tender.getById(id);
}
```

- [ ] **Step 4: Verify TypeScript compiles for tender resolver**

```bash
cd server && npx tsc --noEmit 2>&1 | grep -i tender
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add server/src/models/Tender/ server/src/graphql/resolvers/tender/
git commit -m "refactor: migrate Tender.files[] from embedded to Ref<EnrichedFile>[]"
```

---

### Task 6: Migrate System schema and resolver

**Files:**
- Modify: `server/src/models/System/schema/index.ts`
- Modify: `server/src/models/System/class/get.ts`
- Modify: `server/src/graphql/resolvers/system/index.ts`

- [ ] **Step 1: Update System schema**

In `server/src/models/System/schema/index.ts`, update the import and the `specFiles` field:

```ts
// Replace:
import { EnrichedFileClass } from "../../Tender/schema";
// With:
import { EnrichedFileClass } from "../../EnrichedFile/class";
```

Change the field declaration:
```ts
// Replace:
@Field(() => [EnrichedFileClass], { nullable: false })
@prop({ type: () => [EnrichedFileClass], default: [] })
public specFiles!: EnrichedFileClass[];

// With:
@Field(() => [EnrichedFileClass], { nullable: false })
@prop({ ref: () => EnrichedFileClass, default: [] })
public specFiles!: Ref<EnrichedFileClass>[];
```

Add `Ref` to the typegoose import.

- [ ] **Step 2: Update System.getSystem() to populate specFiles**

Find `server/src/models/System/class/get.ts` (or wherever `getSystem` is defined). Add populate:

```ts
// Wherever getSystem does its query, add:
.populate({ path: "specFiles", populate: { path: "file" } })
```

- [ ] **Step 3: Update SystemResolver spec file mutations**

In `server/src/graphql/resolvers/system/index.ts`:

Update imports:
```ts
import { EnrichedFile } from "@models";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";
```

Replace `systemAddSpecFile`:
```ts
@Authorized(["ADMIN"])
@Mutation(() => SystemClass)
async systemAddSpecFile(@Arg("fileId", () => ID) fileId: Id) {
  const system = await System.getSystem();
  const file = await File.getById(fileId, { throwError: true });

  const enrichedFile = await EnrichedFile.createDocument(file!._id.toString());
  await enrichedFile.save();

  system.specFiles.push(enrichedFile._id as any);
  await system.save();

  await publishEnrichedFileCreated(enrichedFile._id.toString(), file!._id.toString());

  return System.getSystem();
}
```

Replace `systemRemoveSpecFile`:
```ts
@Authorized(["ADMIN"])
@Mutation(() => SystemClass)
async systemRemoveSpecFile(@Arg("fileObjectId", () => ID) fileObjectId: Id) {
  const system = await System.getSystem();
  system.specFiles = system.specFiles.filter(
    (f) => f!.toString() !== fileObjectId.toString()
  ) as any;
  await system.save();
  return system;
}
```

Replace `systemRetrySpecFile`:
```ts
@Authorized(["ADMIN"])
@Mutation(() => SystemClass)
async systemRetrySpecFile(@Arg("fileObjectId", () => ID) fileObjectId: Id) {
  const enrichedFile = await EnrichedFile.getById(fileObjectId, { throwError: true });

  await EnrichedFile.findByIdAndUpdate(fileObjectId, {
    $set: { summaryStatus: "pending" },
    $unset: { summaryError: "" },
  });

  const fileId =
    enrichedFile!.file && typeof (enrichedFile!.file as any)._id !== "undefined"
      ? (enrichedFile!.file as any)._id.toString()
      : enrichedFile!.file!.toString();

  await publishEnrichedFileCreated(fileObjectId.toString(), fileId);
  return System.getSystem();
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | grep -i system
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add server/src/models/System/ server/src/graphql/resolvers/system/
git commit -m "refactor: migrate System.specFiles[] from embedded to Ref<EnrichedFile>[]"
```

---

### Task 7: Update the tender-chat router

**Files:**
- Modify: `server/src/router/tender-chat.ts`

The router currently accesses `tender.files[]` as embedded objects. After migration, `tender.files[]` is an array of populated `EnrichedFileDocument` objects. The field access changes slightly.

- [ ] **Step 1: Review all `tender.files` usages in tender-chat.ts**

Search for `tender.files`, `fileObj.file`, `fileObj.summary`, `fileObj.summaryStatus`, `fileObj._id`, etc. — anywhere the embedded shape is accessed. There will be a `buildFileEntry` function and the file-index builder that does this.

- [ ] **Step 2: Update file access patterns**

Before migration, each element was `EnrichedFileClass` with `.file` being a populated `FileClass`. After migration, each element IS the `EnrichedFileDocument` and still has `.file` as a populated `FileClass`. The shape is identical — but the populate path changed in `Tender.getById` (Step 2 of Task 5 handles this). No changes should be needed in `tender-chat.ts` itself unless the router calls `.populate()` directly — check if it does, and if so update to the nested form.

- [ ] **Step 3: Commit if any changes were needed**

```bash
git add server/src/router/tender-chat.ts
git commit -m "fix: update tender-chat router for Ref<EnrichedFile> populate path"
```

---

### Task 8: Replace tender-files and spec-files routes with enriched-files

**Files:**
- Create: `server/src/router/enriched-files.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create `server/src/router/enriched-files.ts`**

```ts
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { EnrichedFile } from "@models";
import { getFileSignedUrl } from "@utils/fileStorage";
import { isDocument } from "@typegoose/typegoose";

const router = Router();

// GET /api/enriched-files/:enrichedFileId?token=JWT&page=N
//
// Accepts JWT via Authorization header OR ?token= query param.
// Generates a fresh signed URL and redirects — links never go stale.
// Works for any EnrichedFile regardless of whether it's on a Tender,
// System, or Jobsite.

router.get("/:enrichedFileId", async (req, res) => {
  const token =
    (req.headers.authorization as string | undefined) ||
    (req.query.token as string | undefined);

  if (!token || !process.env.JWT_SECRET) {
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).send("Invalid token");
    return;
  }

  const { enrichedFileId } = req.params;
  if (!mongoose.isValidObjectId(enrichedFileId)) {
    res.status(400).send("Invalid ID");
    return;
  }

  const enrichedFile = await EnrichedFile.getById(enrichedFileId);
  if (!enrichedFile?.file) {
    res.status(404).send("EnrichedFile not found");
    return;
  }

  const fileId = isDocument(enrichedFile.file)
    ? enrichedFile.file._id.toString()
    : enrichedFile.file.toString();

  const signedUrl = (await getFileSignedUrl(fileId)) as string;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
  const redirectUrl = page && !isNaN(page) ? `${signedUrl}#page=${page}` : signedUrl;

  res.redirect(302, redirectUrl);
});

export default router;
```

- [ ] **Step 2: Update `server/src/app.ts`**

Add the new route and remove the old ones:
```ts
// Remove:
import tenderFilesRouter from "./router/tender-files";
import specFilesRouter from "./router/spec-files";
app.use("/api/tender-files", tenderFilesRouter);
app.use("/api/spec-files", specFilesRouter);

// Add:
import enrichedFilesRouter from "./router/enriched-files";
app.use("/api/enriched-files", enrichedFilesRouter);
```

- [ ] **Step 3: Update citation URLs in tender-chat.ts**

Search for any URL construction that uses `/api/tender-files/` or `/api/spec-files/` and update them to `/api/enriched-files/`. These appear in the system prompt that builds file citations.

- [ ] **Step 4: Commit**

```bash
git add server/src/router/enriched-files.ts server/src/router/ server/src/app.ts
git commit -m "feat: add unified enriched-files route; remove tender-files and spec-files routes"
```

---

### Task 9: Dev data migration script

**Files:**
- Create: `server/src/scripts/migrate-enriched-files.ts`

This script runs once against the running dev MongoDB to extract embedded subdocs into the new collection. Run it after seeding the dev database (after `restore-mongo` in Tilt), before starting the server.

- [ ] **Step 1: Create the migration script**

```ts
// server/src/scripts/migrate-enriched-files.ts
//
// One-off migration: extracts Tender.files[] and System.specFiles[] from
// embedded subdocuments into standalone EnrichedFile documents, then
// replaces the arrays with ObjectId references.
//
// Run: npx ts-node -r tsconfig-paths/register src/scripts/migrate-enriched-files.ts

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env.development") });

import mongoose from "mongoose";
import { EnrichedFile, Tender, System } from "@models";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });
  console.log("Connected to MongoDB");

  // ── Tender files ────────────────────────────────────────────────────────────
  // Use .lean() on a raw collection query to get the raw embedded docs
  // (before Mongoose tries to validate them against the new schema)
  const tenderCol = mongoose.connection.collection("tenders");
  const tenders = await tenderCol.find({ "files.0": { $exists: true } }).toArray();

  let tenderFileCount = 0;
  for (const tender of tenders) {
    const newFileIds: mongoose.Types.ObjectId[] = [];

    for (const embeddedFile of tender.files) {
      // Check if already migrated (it's already an ObjectId ref, not an object)
      if (!embeddedFile.file && mongoose.isValidObjectId(embeddedFile)) {
        newFileIds.push(embeddedFile);
        continue;
      }

      const ef = new EnrichedFile({
        _id: embeddedFile._id,
        file: embeddedFile.file,
        documentType: embeddedFile.documentType,
        summary: embeddedFile.summary,
        summaryStatus: embeddedFile.summaryStatus ?? "pending",
        pageCount: embeddedFile.pageCount,
        summaryError: embeddedFile.summaryError,
        createdAt: new Date(),
      });
      await ef.save();
      newFileIds.push(ef._id);
      tenderFileCount++;
    }

    await tenderCol.updateOne(
      { _id: tender._id },
      { $set: { files: newFileIds } }
    );
  }
  console.log(`Migrated ${tenderFileCount} tender file(s) from ${tenders.length} tender(s)`);

  // ── System specFiles ─────────────────────────────────────────────────────────
  const systemCol = mongoose.connection.collection("systems");
  const system = await systemCol.findOne({});

  if (system?.specFiles?.length) {
    const newSpecFileIds: mongoose.Types.ObjectId[] = [];

    for (const embeddedFile of system.specFiles) {
      if (!embeddedFile.file && mongoose.isValidObjectId(embeddedFile)) {
        newSpecFileIds.push(embeddedFile);
        continue;
      }

      const ef = new EnrichedFile({
        _id: embeddedFile._id,
        file: embeddedFile.file,
        summary: embeddedFile.summary,
        summaryStatus: embeddedFile.summaryStatus ?? "pending",
        pageCount: embeddedFile.pageCount,
        summaryError: embeddedFile.summaryError,
        createdAt: new Date(),
      });
      await ef.save();
      newSpecFileIds.push(ef._id);
    }

    await systemCol.updateOne(
      { _id: system._id },
      { $set: { specFiles: newSpecFileIds } }
    );
    console.log(`Migrated ${newSpecFileIds.length} spec file(s)`);
  } else {
    console.log("No spec files to migrate");
  }

  await mongoose.disconnect();
  console.log("Migration complete");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

In `server/package.json`, add under `scripts`:
```json
"migrate:enriched-files": "ts-node -r tsconfig-paths/register src/scripts/migrate-enriched-files.ts"
```

- [ ] **Step 3: Run the migration against dev data**

```bash
cd server && npm run migrate:enriched-files
```
Expected: output showing migrated counts, "Migration complete"

- [ ] **Step 4: Verify via MongoDB**

```bash
kubectl exec <mongo-pod> -- mongosh --quiet --eval '
  db = db.getSiblingDB("paving");
  print("enrichedfiles count: " + db.enrichedfiles.countDocuments({}));
  print("sample tender files[0]: " + JSON.stringify(db.tenders.findOne({"files.0": {$exists:true}})?.files?.[0]));
'
```
Expected: `enrichedfiles count` > 0, `tender files[0]` is an ObjectId string (not an embedded object)

- [ ] **Step 5: Save the updated dev db state**

```bash
# From the project root
./scripts/save-db-state.sh
```

- [ ] **Step 6: Commit**

```bash
git add server/src/scripts/migrate-enriched-files.ts server/package.json dev-data/
git commit -m "feat: add EnrichedFile migration script + update dev data dump"
```

---

## Chunk 3b: Conversation Model Unification + Router Factory

### Background: production migration considerations

`chatconversations` has real user data in production. The migration must be safe to run against a live database with zero data loss. The chosen approach is an **in-place migration**:

1. `$set { "context.type": "general" }` on all existing `chatconversations` documents (fast, non-destructive)
2. Rename collection `chatconversations` → `conversations` (atomic in MongoDB)
3. Deploy new code that uses the `Conversation` model pointed at `conversations`

`tenderconversations` exists only in dev (the Tender feature has never been deployed to production), so it requires no production migration — the script handles it in dev only.

**Production deployment order** (added to CI/CD deploy workflow):
1. Run `migrate-conversations` as a k8s Job with `initContainer` semantics — completes before new server pods start
2. New server pods start, pointing to `conversations` collection
3. Verify, then optionally drop the now-empty `chatconversations` collection (or leave it as a safety net for a sprint)

The migration script is **idempotent**: it checks whether documents already have `context.type` set before acting, and skips the rename if the `conversations` collection already exists.

---

### Task 10a: Unified Conversation model

**Files:**
- Create: `server/src/models/Conversation.ts`
- Modify: `server/src/models/index.ts` (add export, keep `ChatConversation` + `TenderConversation` exports temporarily)

- [ ] **Step 1: Create `server/src/models/Conversation.ts`**

The message and tool result sub-schemas are defined once here and will be imported by both the new model and (temporarily) the old ones to eliminate the redefinition.

```ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IToolResult {
  toolName: string;
  result: string;
}

export interface IConversationMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  toolResults?: IToolResult[];
}

export type ConversationContextType = "general" | "tender" | "jobsite" | "daily_report";

export interface IConversationContext {
  type: ConversationContextType;
  refId?: mongoose.Types.ObjectId; // the Tender/Jobsite/DailyReport _id; absent for "general"
}

export interface IConversation extends Document {
  user: mongoose.Types.ObjectId;
  context: IConversationContext;
  title: string;
  aiModel: string;
  messages: IConversationMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const ToolResultSchema = new Schema<IToolResult>(
  { toolName: { type: String, required: true }, result: { type: String, required: true } },
  { _id: false }
);

export const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    model: { type: String },
    inputTokens: { type: Number },
    outputTokens: { type: Number },
    toolResults: { type: [ToolResultSchema], default: undefined },
  },
  { _id: false }
);

const ConversationContextSchema = new Schema<IConversationContext>(
  {
    type: {
      type: String,
      enum: ["general", "tender", "jobsite", "daily_report"],
      required: true,
    },
    refId: { type: Schema.Types.ObjectId },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    context: { type: ConversationContextSchema, required: true },
    title: { type: String, required: true, default: "New conversation" },
    aiModel: { type: String, required: true },
    messages: { type: [ConversationMessageSchema], default: [] },
    totalInputTokens: { type: Number, default: 0 },
    totalOutputTokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index covers: "all conversations for tender X", "all conversations for jobsite Y", etc.
ConversationSchema.index({ "context.type": 1, "context.refId": 1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema, "conversations");
```

- [ ] **Step 2: Export from `server/src/models/index.ts`**

Add at the bottom (alongside the existing `ChatConversation` and `TenderConversation` exports, which stay temporarily):
```ts
export * from "./Conversation";
```

- [ ] **Step 3: Compile check**

```bash
cd server && npx tsc --noEmit 2>&1 | grep -i conversation
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add server/src/models/Conversation.ts server/src/models/index.ts
git commit -m "feat: add unified Conversation model (conversations collection)"
```

---

### Task 10b: Conversation migration script

**Files:**
- Create: `server/src/scripts/migrate-conversations.ts`

- [ ] **Step 1: Create the migration script**

```ts
// server/src/scripts/migrate-conversations.ts
//
// Migrates chatconversations and tenderconversations → conversations.
//
// Safe to run against production:
//   - Idempotent: skips already-migrated documents
//   - In-place: adds context field then renames — no data is deleted
//   - Run BEFORE deploying new server code
//
// Run: npx ts-node -r tsconfig-paths/register src/scripts/migrate-conversations.ts

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env.development") });

import mongoose from "mongoose";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });
  console.log("Connected:", process.env.MONGO_URI!.replace(/:\/\/.*@/, "://***@"));

  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map((c) => c.name);

  // ── Guard: if conversations already exists and is populated, skip ────────────
  if (collections.includes("conversations")) {
    const count = await db.collection("conversations").countDocuments();
    console.log(`conversations collection already exists with ${count} docs — skipping migration`);
    await mongoose.disconnect();
    return;
  }

  // ── Step 1: Migrate chatconversations ────────────────────────────────────────
  if (collections.includes("chatconversations")) {
    const chatCol = db.collection("chatconversations");
    const total = await chatCol.countDocuments();
    console.log(`Migrating ${total} chatconversation(s)...`);

    // Add context field to all docs that don't have it yet
    await chatCol.updateMany(
      { context: { $exists: false } },
      { $set: { context: { type: "general" } } }
    );

    // Rename chatconversations → conversations
    await chatCol.rename("conversations");
    console.log(`Renamed chatconversations → conversations`);
  } else {
    console.log("No chatconversations collection found — creating empty conversations collection");
    await db.createCollection("conversations");
  }

  // ── Step 2: Migrate tenderconversations (dev only — won't exist in prod) ─────
  if (collections.includes("tenderconversations")) {
    const tenderCol = db.collection("tenderconversations");
    const tenderDocs = await tenderCol.find({}).toArray();
    console.log(`Migrating ${tenderDocs.length} tenderconversation(s)...`);

    if (tenderDocs.length > 0) {
      const convCol = db.collection("conversations");
      const toInsert = tenderDocs.map((doc) => ({
        ...doc,
        context: { type: "tender", refId: doc.tender },
        // Remove the old tender field — context.refId replaces it
        tender: undefined,
      }));
      // Strip undefined keys
      const clean = toInsert.map((doc) => {
        const { tender, ...rest } = doc;
        return rest;
      });
      await convCol.insertMany(clean);
      console.log(`Inserted ${clean.length} tender conversation(s) into conversations`);
    }

    // Don't drop tenderconversations here — leave for manual cleanup after verification
    console.log("tenderconversations left in place for manual verification and cleanup");
  }

  // ── Step 3: Create indexes ───────────────────────────────────────────────────
  const convCol = db.collection("conversations");
  await convCol.createIndex({ user: 1 });
  await convCol.createIndex({ "context.type": 1, "context.refId": 1 });
  console.log("Indexes created");

  await mongoose.disconnect();
  console.log("Migration complete");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script in `server/package.json`**

```json
"migrate:conversations": "ts-node -r tsconfig-paths/register src/scripts/migrate-conversations.ts"
```

- [ ] **Step 3: Run against dev data**

```bash
cd server && npm run migrate:conversations
```
Expected output:
```
Connected: mongodb://***@localhost:27017/paving
Migrating N chatconversation(s)...
Renamed chatconversations → conversations
Migrating N tenderconversation(s)...
Indexes created
Migration complete
```

- [ ] **Step 4: Verify**

```bash
kubectl exec <mongo-pod> -- mongosh --quiet --eval '
  db = db.getSiblingDB("paving");
  print("conversations: " + db.conversations.countDocuments({}));
  print("chatconversations: " + db.chatconversations.countDocuments({}));
  print("sample: " + JSON.stringify(db.conversations.findOne({}, { messages: 0 })));
'
```
Expected: `conversations` has docs, each with a `context: { type: "general" }` field.

- [ ] **Step 5: Update dev data dump**

```bash
./scripts/save-db-state.sh
```

- [ ] **Step 6: Commit**

```bash
git add server/src/scripts/migrate-conversations.ts server/package.json dev-data/
git commit -m "feat: add conversation migration script + update dev data dump"
```

---

### Task 10c: Add conversation migration to CI/CD deploy workflow

**Files:**
- Modify: `.github/workflows/build-deploy.yml`

The migration must run before the new server pods start. In the existing workflow, the deploy step uses `kubectl set image` to roll out new pods. We add a k8s Job that runs the migration first and must complete successfully before the rollout proceeds.

- [ ] **Step 1: Add a migration k8s Job to the deploy workflow**

In `.github/workflows/build-deploy.yml`, after the `kubectl` context is set up and before the `kubectl set image` deploy step, add:

```yaml
- name: Run conversation migration
  run: |
    # Apply the migration job, wait for completion, then clean up
    cat <<EOF | kubectl apply -f -
    apiVersion: batch/v1
    kind: Job
    metadata:
      name: migrate-conversations-${{ env.COMMIT_SHA1 }}
    spec:
      ttlSecondsAfterFinished: 300
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: migrate
              image: itsdevin/bow-mark-server:${{ env.COMMIT_SHA1 }}
              command: ["npm", "run", "migrate:conversations"]
              envFrom:
                - configMapRef:
                    name: app-config
              env:
                - name: NODE_ENV
                  value: production
    EOF
    kubectl wait --for=condition=complete \
      job/migrate-conversations-${{ env.COMMIT_SHA1 }} \
      --timeout=120s
```

This pattern (job per deploy SHA) is idempotent — if the migration has already run, the script exits cleanly in seconds.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build-deploy.yml
git commit -m "ci: run conversation migration job before server rollout"
```

---

### Task 10d: Router factory — `createChatRouter`

**Files:**
- Create: `server/src/router/chat/createChatRouter.ts`

This is the core infrastructure extract. The factory accepts a config object and returns a fully-wired Express Router. It owns: auth, SSE setup, keepalive, conversation load/create, the agentic streaming loop, conversation save, title generation, and error handling.

- [ ] **Step 1: Define the config interface and create the factory**

```ts
// server/src/router/chat/createChatRouter.ts
import Anthropic from "@anthropic-ai/sdk";
import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Conversation, IConversationMessage, IConversationContext } from "@models/Conversation";
import { User } from "@models";
import { ConversationContextType } from "@models/Conversation";

const MODEL = "claude-opus-4-6";

// ── Config interface ─────────────────────────────────────────────────────────

export interface ChatContext {
  // The conversation context to store (type + optional refId)
  conversationContext: IConversationContext;
  // Any extra data the tool handler and system prompt builder need
  // e.g. the loaded Tender doc, role-filtered file list, MCP client, etc.
  [key: string]: unknown;
}

export interface ChatRouterConfig {
  /**
   * Parse the request body, validate the context object (e.g. load the
   * Tender doc, the Jobsite with role-filtered files, set up MCP client),
   * and return a ChatContext. Throw to reject the request with 400/404.
   */
  loadContext: (body: Record<string, unknown>, userId: string, userRole: string) => Promise<ChatContext>;

  /**
   * Build the system prompt string given the loaded context.
   */
  buildSystemPrompt: (ctx: ChatContext) => Promise<string>;

  /**
   * The Anthropic tool definitions Claude can call.
   */
  tools: Anthropic.Tool[];

  /**
   * Handle a tool call. Return the string result to send back to Claude.
   */
  handleToolCall: (
    toolName: string,
    toolInput: Record<string, unknown>,
    ctx: ChatContext
  ) => Promise<string>;

  /**
   * Optional cleanup after the stream ends (e.g. close MCP client).
   */
  cleanup?: (ctx: ChatContext) => Promise<void>;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createChatRouter(config: ChatRouterConfig): Router {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const router = Router();

  router.post("/message", async (req: Request, res: Response) => {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = req.headers.authorization;
    if (!token || !process.env.JWT_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let userId: string;
    let userRole: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
      userId = decoded?.userId;
      userRole = decoded?.role ?? "USER";
      if (!userId) { res.status(401).json({ error: "Invalid token payload" }); return; }
    } catch {
      res.status(401).json({ error: "Invalid token" }); return;
    }

    const { messages, conversationId } = req.body as {
      messages: Anthropic.MessageParam[];
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array required" }); return;
    }

    // ── Load context (chatbot-specific) ──────────────────────────────────────
    let ctx: ChatContext;
    try {
      ctx = await config.loadContext(req.body, userId, userRole);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid request";
      res.status(400).json({ error: msg }); return;
    }

    // ── SSE setup ────────────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const keepalive = setInterval(() => res.write(": ping\n\n"), 20000);

    // ── Load or create conversation ──────────────────────────────────────────
    let convo = conversationId
      ? await Conversation.findById(conversationId)
      : null;

    if (!convo) {
      convo = new Conversation({
        user: userId,
        context: ctx.conversationContext,
        aiModel: MODEL,
      });
    }

    if (conversationId && !convo) {
      sendEvent({ type: "error", message: "Conversation not found" });
      clearInterval(keepalive); res.end(); return;
    }

    if (!conversationId) {
      await convo!.save();
      sendEvent({ type: "conversation_id", id: convo!._id.toString() });
    }

    const tokensBefore = {
      input: convo!.totalInputTokens,
      output: convo!.totalOutputTokens,
    };

    // ── Build system prompt ──────────────────────────────────────────────────
    const systemPrompt = await config.buildSystemPrompt(ctx);

    // ── Agentic streaming loop ───────────────────────────────────────────────
    const conversationMessages: Anthropic.MessageParam[] = [...messages];
    let streamedText = "";
    let finalModel = MODEL;

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 5 * 60 * 1000);

    try {
      let continueLoop = true;
      while (continueLoop) {
        const stream = anthropic.messages.stream(
          {
            model: MODEL,
            max_tokens: 8192,
            system: systemPrompt,
            tools: config.tools,
            messages: conversationMessages,
          },
          { signal: abort.signal }
        );

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            streamedText += event.delta.text;
            sendEvent({ type: "text_delta", delta: event.delta.text });
          } else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
            sendEvent({ type: "tool_call", toolName: event.content_block.name });
          }
        }

        const final = await stream.finalMessage();
        finalModel = final.model;

        convo!.totalInputTokens += final.usage.input_tokens;
        convo!.totalOutputTokens += final.usage.output_tokens;
        sendEvent({
          type: "usage",
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
          model: final.model,
        });

        if (final.stop_reason === "tool_use") {
          const assistantMsg: Anthropic.MessageParam = {
            role: "assistant",
            content: final.content,
          };
          conversationMessages.push(assistantMsg);

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== "tool_use") continue;
            let result: string;
            try {
              result = await config.handleToolCall(
                block.name,
                block.input as Record<string, unknown>,
                ctx
              );
            } catch (err) {
              result = `Error: ${err instanceof Error ? err.message : String(err)}`;
            }
            sendEvent({ type: "tool_result", toolName: block.name, result });
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }

          conversationMessages.push({ role: "user", content: toolResults });
        } else {
          // end_turn, max_tokens, or stop_sequence
          conversationMessages.push({ role: "assistant", content: final.content });
          continueLoop = false;
        }
      }

      // ── Save conversation ────────────────────────────────────────────────────
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg?.role === "user" && typeof lastUserMsg.content === "string") {
        convo!.messages.push({ role: "user", content: lastUserMsg.content });
      }
      const assistantText = conversationMessages
        .filter((m) => m.role === "assistant")
        .map((m) => (typeof m.content === "string" ? m.content : ""))
        .join("")
        || streamedText;

      convo!.messages.push({
        role: "assistant",
        content: assistantText,
        model: finalModel,
        inputTokens: convo!.totalInputTokens - tokensBefore.input,
        outputTokens: convo!.totalOutputTokens - tokensBefore.output,
      });
      await convo!.save();

      sendEvent({ type: "done" });

      // ── Title generation (non-fatal) ─────────────────────────────────────────
      if (convo!.messages.length <= 2 && convo!.title === "New conversation") {
        try {
          const titleRes = await anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 30,
            messages: [
              {
                role: "user",
                content: `Generate a short 3-6 word title for a conversation that starts with: "${messages[messages.length - 1]?.content}". Return only the title, no punctuation.`,
              },
            ],
          });
          const title =
            titleRes.content[0]?.type === "text" ? titleRes.content[0].text.trim() : "";
          if (title) {
            convo!.title = title;
            await convo!.save();
            sendEvent({ type: "title", title });
          }
        } catch (err) {
          console.error("Title generation failed:", err);
        }
      }
    } catch (err) {
      console.error("[Chat] Stream error:", err);

      // Friendly error messages for known Anthropic API errors
      let userMessage = err instanceof Error ? err.message : "Unknown error";
      if (err instanceof Anthropic.APIError) {
        const body = err.error as { error?: { type?: string } } | undefined;
        if (body?.error?.type === "overloaded_error") {
          userMessage = "Claude is currently overloaded. Please try again in a moment.";
        } else if (err instanceof Anthropic.BadRequestError) {
          if (err.message.toLowerCase().includes("too long")) {
            userMessage = "The request exceeded the context limit. Try starting a new conversation.";
          }
        }
      }

      // Partial save — preserve any streamed text rather than losing the whole turn
      if (streamedText && convo) {
        try {
          const lastUserMsg = messages[messages.length - 1];
          if (lastUserMsg?.role === "user" && typeof lastUserMsg.content === "string") {
            convo.messages.push({ role: "user", content: lastUserMsg.content });
          }
          convo.messages.push({
            role: "assistant",
            content: streamedText + "\n\n*(response interrupted)*",
            model: finalModel,
            inputTokens: convo.totalInputTokens - tokensBefore.input,
            outputTokens: convo.totalOutputTokens - tokensBefore.output,
          });
          await convo.save();
        } catch (saveErr) {
          console.error("[Chat] Failed to save partial response:", saveErr);
        }
      }

      sendEvent({ type: "error", message: userMessage });
    } finally {
      clearTimeout(timeout);
      clearInterval(keepalive);
      if (config.cleanup) await config.cleanup(ctx).catch(() => {});
      res.end();
    }
  });

  // ── Conversation CRUD endpoints ──────────────────────────────────────────────
  // GET /conversations — list conversations for this context type
  // GET /conversations/:id — load a specific conversation
  // PATCH /conversations/:id/title — rename
  // DELETE /conversations/:id — delete
  // DELETE /conversations/:id/last-exchange — remove last user+assistant pair (for regenerate)
  //
  // These are identical across all chatbot types and are wired below.
  // The `contextType` is used to scope the list to the right conversations.

  const getAuth = (req: Request): { userId: string } | null => {
    try {
      const token = req.headers.authorization;
      if (!token || !process.env.JWT_SECRET) return null;
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
      return decoded?.userId ? { userId: decoded.userId } : null;
    } catch { return null; }
  };

  router.get("/conversations", async (req, res) => {
    const auth = getAuth(req);
    if (!auth) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { contextType, refId } = req.query as { contextType?: string; refId?: string };
    const query: Record<string, unknown> = { user: auth.userId };
    if (contextType) query["context.type"] = contextType;
    if (refId && mongoose.isValidObjectId(refId)) query["context.refId"] = refId;
    const convos = await Conversation.find(query)
      .select("-messages")
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json(convos.map((c) => ({
      id: c._id, title: c.title, model: c.aiModel,
      totalInputTokens: c.totalInputTokens, totalOutputTokens: c.totalOutputTokens,
      updatedAt: c.updatedAt,
    })));
  });

  router.get("/conversations/:id", async (req, res) => {
    const auth = getAuth(req);
    if (!auth) { res.status(401).json({ error: "Unauthorized" }); return; }
    const convo = await Conversation.findOne({ _id: req.params.id, user: auth.userId });
    if (!convo) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      id: convo._id, title: convo.title, model: convo.aiModel,
      totalInputTokens: convo.totalInputTokens, totalOutputTokens: convo.totalOutputTokens,
      messages: convo.messages,
    });
  });

  router.patch("/conversations/:id/title", async (req, res) => {
    const auth = getAuth(req);
    if (!auth) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { title } = req.body as { title?: string };
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    await Conversation.updateOne({ _id: req.params.id, user: auth.userId }, { title });
    res.json({ ok: true });
  });

  router.delete("/conversations/:id", async (req, res) => {
    const auth = getAuth(req);
    if (!auth) { res.status(401).json({ error: "Unauthorized" }); return; }
    await Conversation.deleteOne({ _id: req.params.id, user: auth.userId });
    res.json({ ok: true });
  });

  router.delete("/conversations/:id/last-exchange", async (req, res) => {
    const auth = getAuth(req);
    if (!auth) { res.status(401).json({ error: "Unauthorized" }); return; }
    const convo = await Conversation.findOne({ _id: req.params.id, user: auth.userId });
    if (!convo) { res.status(404).json({ error: "Not found" }); return; }
    // Remove last assistant message, then last user message
    for (const role of ["assistant", "user"] as const) {
      const idx = convo.messages.map((m) => m.role).lastIndexOf(role);
      if (idx !== -1) convo.messages.splice(idx, 1);
    }
    await convo.save();
    res.json({ ok: true });
  });

  return router;
}
```

- [ ] **Step 2: Compile check**

```bash
cd server && npx tsc --noEmit 2>&1 | grep -i "createChatRouter\|chat/"
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/router/chat/createChatRouter.ts
git commit -m "feat: add createChatRouter factory — shared SSE streaming infrastructure"
```

---

### Task 10e: Refactor analytics chat router to use factory

**Files:**
- Create: `server/src/router/chat/analyticsChatConfig.ts`
- Modify: `server/src/router/chat.ts`

- [ ] **Step 1: Extract the analytics chatbot config**

Move the MCP client setup, system prompt, and tool handling logic from `chat.ts` into `server/src/router/chat/analyticsChatConfig.ts`. The config's `loadContext` sets up the MCP client; `cleanup` closes it. The `buildSystemPrompt` returns the existing analytics prompt. `handleToolCall` delegates to the MCP client.

This is an extraction of existing logic — no behaviour changes.

- [ ] **Step 2: Update `server/src/router/chat.ts`**

Replace the entire file body with:
```ts
import { createChatRouter } from "./chat/createChatRouter";
import { analyticsChatConfig } from "./chat/analyticsChatConfig";
export default createChatRouter(analyticsChatConfig);
```

Update the conversations endpoint used in `chat.ts` to point to the factory's built-in conversation routes (the factory now handles `/conversations` and `/conversations/:id`).

- [ ] **Step 3: Verify analytics chatbot still works end-to-end in dev**

Open the analytics chat page, send a message, verify the response streams correctly and the conversation saves.

- [ ] **Step 4: Commit**

```bash
git add server/src/router/chat.ts server/src/router/chat/analyticsChatConfig.ts
git commit -m "refactor: analytics chat router now uses createChatRouter factory"
```

---

### Task 10f: Refactor tender chat router to use factory

**Files:**
- Create: `server/src/router/chat/tenderChatConfig.ts`
- Modify: `server/src/router/tender-chat.ts`
- Delete: `server/src/models/TenderConversation.ts`

- [ ] **Step 1: Extract the tender chatbot config**

Move the file index builder, system prompt builder, and `read_document` tool handler from `tender-chat.ts` into `server/src/router/chat/tenderChatConfig.ts`. The `loadContext` loads the Tender and System spec files; `buildSystemPrompt` returns the existing tender system prompt string with the file index embedded; `handleToolCall` handles `read_document`.

Note: the `conversationContext` in the returned `ChatContext` should be `{ type: "tender", refId: tender._id }`.

- [ ] **Step 2: Update `server/src/router/tender-chat.ts`**

```ts
import { createChatRouter } from "./chat/createChatRouter";
import { tenderChatConfig } from "./chat/tenderChatConfig";
export default createChatRouter(tenderChatConfig);
```

- [ ] **Step 3: Update `server/src/router/tender-conversations.ts`**

The existing `tender-conversations.ts` router handles `GET/DELETE /tender-conversations/*`. With the factory in place, the conversation CRUD routes are now built into the router itself at `/api/tender-chat/conversations/*`. Check whether the client calls `/api/tender-conversations/...` or `/api/tender-chat/conversations/...` and update accordingly — consolidate to the factory's pattern.

- [ ] **Step 4: Delete `server/src/models/TenderConversation.ts`**

The `Conversation` model with `context.type: "tender"` fully replaces it.

```bash
rm server/src/models/TenderConversation.ts
```

Remove the export from `server/src/models/index.ts`.

- [ ] **Step 5: Verify tender chatbot works end-to-end in dev**

Open a Tender, send a message, verify response streams and saves correctly. Verify existing conversations still load (they were migrated to the `conversations` collection with `context.type: "tender"` in Task 10b).

- [ ] **Step 6: Compile check + commit**

```bash
cd server && npx tsc --noEmit
git add server/src/router/tender-chat.ts server/src/router/chat/tenderChatConfig.ts \
        server/src/models/TenderConversation.ts server/src/models/index.ts
git commit -m "refactor: tender chat router now uses createChatRouter factory; remove TenderConversation model"
```

---

## Chunk 4: Jobsite EnrichedFiles + Chat

### Task 10: Add enrichedFiles to Jobsite model

**Files:**
- Modify: `server/src/models/Jobsite/schema/subDocuments.ts`
- Modify: `server/src/models/Jobsite/schema/index.ts`

- [ ] **Step 1: Add `JobsiteEnrichedFileRefClass` to subDocuments.ts**

```ts
import { EnrichedFileClass } from "../../EnrichedFile/class";

@ObjectType()
export class JobsiteEnrichedFileRefClass {
  @Field(() => ID, { nullable: true })
  public _id?: Types.ObjectId;

  @Field(() => EnrichedFileClass)
  @prop({ ref: () => EnrichedFileClass, required: true })
  public enrichedFile!: Ref<EnrichedFileClass>;

  @Field(() => UserRoles)
  @prop({ enum: UserRoles, required: true, default: UserRoles.User })
  public minRole!: UserRoles;
}
```

- [ ] **Step 2: Add `enrichedFiles` field and deprecation comment to Jobsite schema**

In `server/src/models/Jobsite/schema/index.ts`:

```ts
import { JobsiteEnrichedFileRefClass } from "./subDocuments";

// In the class body, add:
@Field(() => [JobsiteEnrichedFileRefClass])
@prop({ type: () => [JobsiteEnrichedFileRefClass], default: [] })
public enrichedFiles!: JobsiteEnrichedFileRefClass[];

// Add deprecation comment above the existing fileObjects field:
/**
 * @deprecated Use enrichedFiles[] for new file additions.
 * Retained for backward compatibility — existing files are still displayed
 * on the Jobsite page but no new additions are made through this path.
 */
```

- [ ] **Step 3: Update Jobsite.getById to populate enrichedFiles**

Find the Jobsite `byId` query and add:
```ts
.populate({ path: "enrichedFiles.enrichedFile", populate: { path: "file" } })
```

- [ ] **Step 4: Commit**

```bash
git add server/src/models/Jobsite/
git commit -m "feat: add enrichedFiles[] with minRole to Jobsite model"
```

---

### Task 11: Jobsite GraphQL mutations for enriched files

**Files:**
- Modify: `server/src/graphql/resolvers/jobsite/index.ts`

- [ ] **Step 1: Add three mutations to the JobsiteResolver**

```ts
// Imports needed:
import { EnrichedFile, File } from "@models";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";
import { UserRoles } from "../../types/UserRoles"; // adjust path to match existing import

@Authorized(["ADMIN", "PM"])
@Mutation(() => JobsiteClass)
async jobsiteAddEnrichedFile(
  @Arg("id", () => ID) id: Id,
  @Arg("fileId", () => ID) fileId: Id,
  @Arg("minRole", () => String, { defaultValue: "USER" }) minRole: string
) {
  const jobsite = await Jobsite.getById(id, { throwError: true });
  const file = await File.getById(fileId, { throwError: true });

  const enrichedFile = await EnrichedFile.createDocument(file!._id.toString());
  await enrichedFile.save();

  jobsite!.enrichedFiles.push({
    enrichedFile: enrichedFile._id,
    minRole: minRole as UserRoles,
  } as any);
  await jobsite!.save();

  await publishEnrichedFileCreated(enrichedFile._id.toString(), file!._id.toString());

  return Jobsite.getById(id);
}

@Authorized(["ADMIN", "PM"])
@Mutation(() => JobsiteClass)
async jobsiteRemoveEnrichedFile(
  @Arg("id", () => ID) id: Id,
  @Arg("enrichedFileId", () => ID) enrichedFileId: Id
) {
  const jobsite = await Jobsite.getById(id, { throwError: true });
  jobsite!.enrichedFiles = jobsite!.enrichedFiles.filter(
    (ref) => ref.enrichedFile!.toString() !== enrichedFileId.toString()
  ) as any;
  await jobsite!.save();
  return Jobsite.getById(id);
}

@Authorized(["ADMIN", "PM"])
@Mutation(() => JobsiteClass)
async jobsiteRetryEnrichedFile(
  @Arg("id", () => ID) id: Id,
  @Arg("enrichedFileId", () => ID) enrichedFileId: Id
) {
  const enrichedFile = await EnrichedFile.getById(enrichedFileId, { throwError: true });

  await EnrichedFile.findByIdAndUpdate(enrichedFileId, {
    $set: { summaryStatus: "pending" },
    $unset: { summaryError: "" },
  });

  const fileId = enrichedFile!.file && typeof (enrichedFile!.file as any)._id !== "undefined"
    ? (enrichedFile!.file as any)._id.toString()
    : enrichedFile!.file!.toString();

  await publishEnrichedFileCreated(enrichedFileId.toString(), fileId);
  return Jobsite.getById(id);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | grep -i jobsite
```

- [ ] **Step 3: Commit**

```bash
git add server/src/graphql/resolvers/jobsite/
git commit -m "feat: add jobsite enriched file mutations (add, remove, retry)"
```

---

### Task 12: Jobsite chat config + router

**Files:**
- Create: `server/src/router/chat/jobsiteChatConfig.ts`
- Create: `server/src/router/jobsite-chat.ts`
- Modify: `server/src/app.ts`

With the factory in place from Chunk 3b, this task is just writing the config. The SSE loop, auth, keepalive, conversation save, error handling — all handled by the factory.

The role comparison for file filtering:

```ts
const ROLE_ORDER: Record<string, number> = { USER: 0, PROJECT_MANAGER: 1, ADMIN: 2 };
const visibleFiles = jobsite.enrichedFiles.filter(
  (ref) => ROLE_ORDER[ref.minRole] <= ROLE_ORDER[userRole]
);
```

- [ ] **Step 1: Create `server/src/router/chat/jobsiteChatConfig.ts`**

Implement `ChatRouterConfig` with:
- `loadContext`: loads the Jobsite (populating `enrichedFiles` with nested `file`), filters by `minRole <= userRole`, loads System spec files, returns `{ conversationContext: { type: "jobsite", refId: jobsite._id }, jobsite, visibleFiles, specFiles }`
- `buildSystemPrompt`: operations-focused prompt — "you are helping a field crew foreman understand job requirements, specs, and drawings". Lists visible files with their summaries and page sections (same format as the tender chatbot)
- `tools`: same `READ_DOCUMENT_TOOL` definition from the tender chatbot
- `handleToolCall`: same `read_document` implementation, fetching from `enrichedFile.file` S3 key, using citation URL `/api/enriched-files/:enrichedFileId`

- [ ] **Step 2: Create `server/src/router/jobsite-chat.ts`**

```ts
import { createChatRouter } from "./chat/createChatRouter";
import { jobsiteChatConfig } from "./chat/jobsiteChatConfig";
export default createChatRouter(jobsiteChatConfig);
```

- [ ] **Step 3: Register in `server/src/app.ts`**

```ts
import jobsiteChatRouter from "./router/jobsite-chat";
app.use("/api/jobsite-chat", jobsiteChatRouter);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add server/src/router/chat/jobsiteChatConfig.ts server/src/router/jobsite-chat.ts server/src/app.ts
git commit -m "feat: add jobsite chat router via createChatRouter factory"
```

---

## Chunk 5: Client Updates

### Task 13: Regenerate GraphQL types and update client fragments

**Files:**
- Modify: `client/src/graphql/fragments/System.graphql` (ensure it references `enrichedFiles` fields if needed)
- Modify: `client/src/graphql/mutations/` — add three Jobsite enriched file mutations
- Run codegen

- [ ] **Step 1: Add Jobsite enriched file mutation GraphQL files**

`client/src/graphql/mutations/JobsiteAddEnrichedFile.graphql`:
```graphql
mutation JobsiteAddEnrichedFile($id: ID!, $fileId: ID!, $minRole: String) {
  jobsiteAddEnrichedFile(id: $id, fileId: $fileId, minRole: $minRole) {
    _id
    enrichedFiles {
      _id
      minRole
      enrichedFile {
        _id
        summaryStatus
        documentType
        pageCount
        summaryError
        file {
          _id
          mimetype
          filename
        }
        summary {
          overview
          documentType
          keyTopics
          chunks {
            startPage
            endPage
            overview
            keyTopics
          }
        }
      }
    }
  }
}
```

Create equivalent `JobsiteRemoveEnrichedFile.graphql` and `JobsiteRetryEnrichedFile.graphql` following the same pattern.

- [ ] **Step 2: Run codegen**

```bash
cd client && npm run codegen
```
Expected: `client/src/generated/graphql.tsx` and `client/src/generated/page.tsx` regenerated without errors

- [ ] **Step 3: Fix any type errors in existing client components**

The Tender and System components reference `tender.files[].summary`, `tender.files[].summaryStatus`, etc. Since the GraphQL shape is the same (just served from a populated ref now rather than an embedded doc), these should be type-compatible. Run:

```bash
cd client && npm run type-check 2>&1 | head -40
```

Fix any type errors that appear.

- [ ] **Step 4: Commit**

```bash
git add client/src/graphql/mutations/ client/src/generated/
git commit -m "feat: add jobsite enriched file GraphQL mutations + regenerate types"
```

---

### Task 14: Jobsite enriched files UI component

**Files:**
- Create: `client/src/components/Common/EnrichedFiles/EnrichedFileList.tsx`

This component is a shared file-list display used by the Tender documents page, System spec files settings, and the new Jobsite files section. It shows the file list with summary status badges, document type, and retry/remove actions.

The Tender documents page already has `TenderDocuments.tsx` which does this for Tender. Extract the common display logic into `EnrichedFileList.tsx` and refactor `TenderDocuments.tsx` to use it. The Jobsite page and System settings page then also use `EnrichedFileList.tsx`.

Props:
```tsx
interface EnrichedFileListProps {
  files: EnrichedFileEntry[];         // the enrichedFiles or specFiles list
  canManage: boolean;                  // whether to show add/remove/retry buttons
  onAdd?: (fileId: string, minRole?: string) => Promise<void>;
  onRemove?: (enrichedFileId: string) => Promise<void>;
  onRetry?: (enrichedFileId: string) => Promise<void>;
  showMinRole?: boolean;               // only true for Jobsite (not Tender/System)
}
```

- [ ] **Step 1: Create the component**

Follow the existing style in `TenderDocuments.tsx` — status badge colours, document type display, page count, error message display, retry button. This is a UI extraction/refactor task.

- [ ] **Step 2: Add enrichedFiles section to the Jobsite page**

Find the Jobsite detail page (`client/src/pages/jobsite/[id].tsx` or equivalent). Add an `EnrichedFileList` section for `jobsite.enrichedFiles`. PM/Admin users see the manage (add/remove/retry) controls and the minRole selector; User-role users see a read-only list of files they have access to.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Common/EnrichedFiles/ client/src/pages/jobsite/ client/src/components/Tender/
git commit -m "feat: add shared EnrichedFileList component; add to Jobsite page"
```

---

### Task 15: Jobsite chat page

**Files:**
- Create or modify: `client/src/pages/jobsite/[id]/chat.tsx` (or add chat tab to existing Jobsite page)

The Jobsite chatbot reuses the existing `ChatPage` component (`client/src/components/Chat/ChatPage.tsx`) with different props:

```tsx
<ChatPage
  messageEndpoint="/api/jobsite-chat/message"
  conversationsEndpoint="/api/jobsite-conversations"
  extraPayload={{ jobsiteId: router.query.id }}
  disableRouting={true}
  suggestions={[
    "What are the concrete placement requirements?",
    "What inspection hold points apply to this job?",
    "What are the compaction requirements for subbase?",
    "What specifications apply to the drainage work?",
  ]}
/>
```

- [ ] **Step 1: Create the Jobsite chat page**

Follow the pattern of `client/src/pages/tender/[id].tsx` which embeds the tender chat. Add a "Chat" tab or button to the Jobsite detail page that routes to the chat view. The `ChatPage` component handles everything — just pass the right `messageEndpoint` and `extraPayload`.

- [ ] **Step 2: Gate by role**

Wrap in the existing `Permission` component with `minRole={UserRoles.User}` — all authenticated users can access the Jobsite chatbot (the server-side file filtering handles what each user can actually ask about).

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/jobsite/
git commit -m "feat: add Jobsite chat page using role-filtered enriched files"
```

---

## Final Verification

- [ ] **Full TypeScript compile (server)**

```bash
cd server && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Full TypeScript check (client)**

```bash
cd client && npm run type-check
```
Expected: 0 errors

- [ ] **Start dev environment and verify end-to-end**

```bash
tilt up
```

1. Open a Tender — documents should still display with summaries ✓
2. Add a new file to a Tender — consumer should pick it up and summarise it ✓
3. Open System Settings → Spec Files — existing spec files should display ✓
4. Open a Jobsite — enrichedFiles section should appear (empty for new jobsites) ✓
5. Add a file to a Jobsite as PM — consumer summarises it ✓
6. Open Jobsite chat as PM — all files visible in index ✓
7. Open Jobsite chat as User-role — only `minRole: USER` files visible ✓
8. Tender chat still works for existing tenders ✓
9. Analytics chat still works; existing conversations still load ✓
10. MongoDB `conversations` collection has all migrated docs with correct `context.type` ✓
11. `chatconversations` and `tenderconversations` collections are empty or absent ✓

- [ ] **Check consumer logs for errors**

```bash
kubectl logs -f $(kubectl get pods -l component=consumer -o jsonpath='{.items[0].metadata.name}')
```
Expected: clean startup, `[Consumer] Listening on queue: enriched.file_summary`

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete EnrichedFile refactor + conversation unification + Jobsite chat"
```
