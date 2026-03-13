# Tender Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Tender management feature with AI-powered document chat — users upload tender documents (specs, drawings, schedules of quantities), Claude summarizes each file in the background, and a scoped chat lets users ask questions across all documents with source citations.

**Architecture:** Pre-processed document summaries (Claude Haiku at upload time) injected into a system prompt; Claude uses a `read_document` tool to load full files from DO Spaces on demand and answer with `[Filename, p.X]` citations. TenderConversations are stored in MongoDB, scoped to a Tender. ChatPage is made configurable via props so both chat features share one component.

**Tech Stack:** Typegoose/Mongoose (Tender model), Type-GraphQL (GraphQL API), Express + SSE (tender-chat router), RabbitMQ (file summarization queue), Anthropic SDK (Haiku for summaries, Sonnet/Opus for chat), DO Spaces / AWS SDK (file storage), `xlsx` (Excel parsing), Next.js + Chakra UI (frontend).

**Design doc:** `docs/plans/2026-03-10-tender-design.md`

---

## Phase 1: Data Models

### Task 1: Install xlsx dependency

**Files:**
- Modify: `server/package.json`

**Step 1: Install xlsx**

```bash
cd server && npm install xlsx
```

Expected: `xlsx` appears in `server/package.json` dependencies.

**Step 2: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "feat(tender): add xlsx dependency for Excel parsing"
```

---

### Task 2: TenderConversation model

Follows the same plain Mongoose pattern as `server/src/models/ChatConversation.ts` — not Typegoose, just a simple mongoose model. Scoped to a Tender instead of being user-global.

**Files:**
- Create: `server/src/models/TenderConversation.ts`

**Step 1: Create the model**

```typescript
// server/src/models/TenderConversation.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenderConversation extends Document {
  tender: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  title: string;
  aiModel: string;
  messages: import("./ChatConversation").IChatMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

// Reuse the IChatMessage + sub-schemas from ChatConversation
import { ChatConversation } from "./ChatConversation";

// Access the message sub-schema from ChatConversation's schema
const existingSchema = (ChatConversation.schema as any).path("messages").schema;

const TenderConversationSchema = new Schema<ITenderConversation>(
  {
    tender: {
      type: Schema.Types.ObjectId,
      ref: "Tender",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, default: "New conversation" },
    aiModel: { type: String, required: true },
    messages: { type: [existingSchema], default: [] },
    totalInputTokens: { type: Number, default: 0 },
    totalOutputTokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const TenderConversation: Model<ITenderConversation> =
  mongoose.models.TenderConversation ||
  mongoose.model<ITenderConversation>(
    "TenderConversation",
    TenderConversationSchema
  );
```

**Step 2: Commit**

```bash
git add server/src/models/TenderConversation.ts
git commit -m "feat(tender): add TenderConversation model"
```

---

### Task 3: Tender TypeScript types

**Files:**
- Create: `server/src/typescript/tender.ts`

**Step 1: Create types file**

```typescript
// server/src/typescript/tender.ts
import { Types } from "mongoose";

export type TenderStatus = "bidding" | "won" | "lost";
export type SummaryStatus = "pending" | "processing" | "ready" | "failed";

export interface IEnrichedFileSummary {
  overview: string;
  documentType: string;
  keyTopics: string[];
}

export interface IEnrichedFileCreate {
  fileId: Types.ObjectId | string;
  documentType: string;
}

export interface ITenderCreate {
  name: string;
  jobcode: string;
  description?: string;
  createdBy: Types.ObjectId | string;
}

export interface ITenderUpdate {
  name?: string;
  description?: string;
  status?: TenderStatus;
  jobsiteId?: string | null;
}
```

**Step 2: Commit**

```bash
git add server/src/typescript/tender.ts
git commit -m "feat(tender): add Tender TypeScript types"
```

---

### Task 4: Tender Typegoose schema

**Files:**
- Create: `server/src/models/Tender/schema/index.ts`

**Step 1: Create schema**

```typescript
// server/src/models/Tender/schema/index.ts
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { FileClass } from "../../File/class";
import { JobsiteClass } from "../../Jobsite/class";
import { UserClass } from "../../User/class";
import {
  IEnrichedFileSummary,
  SummaryStatus,
  TenderStatus,
} from "@typescript/tender";

@ObjectType()
export class EnrichedFileSummaryClass {
  @Field()
  public overview!: string;

  @Field()
  public documentType!: string;

  @Field(() => [String])
  public keyTopics!: string[];
}

@ObjectType()
export class EnrichedFileClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => FileClass)
  @prop({ ref: () => FileClass, required: true })
  public file!: Ref<FileClass>;

  @Field()
  @prop({ required: true, trim: true })
  public documentType!: string;

  @Field(() => EnrichedFileSummaryClass, { nullable: true })
  @prop({ type: () => Object, required: false })
  public summary?: IEnrichedFileSummary;

  @Field()
  @prop({
    required: true,
    enum: ["pending", "processing", "ready", "failed"],
    default: "pending",
  })
  public summaryStatus!: SummaryStatus;

  @Field({ nullable: true })
  @prop({ required: false })
  public pageCount?: number;
}

@ObjectType()
export class TenderSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

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
  @prop({ type: () => [EnrichedFileClass], default: [] })
  public files!: EnrichedFileClass[];

  @Field(() => UserClass)
  @prop({ ref: () => UserClass, required: true })
  public createdBy!: Ref<UserClass>;

  @Field(() => Date)
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field(() => Date)
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
```

**Step 2: Commit**

```bash
git add server/src/models/Tender/schema/index.ts
git commit -m "feat(tender): add Tender Typegoose schema"
```

---

### Task 5: Tender class methods

**Files:**
- Create: `server/src/models/Tender/class/create.ts`
- Create: `server/src/models/Tender/class/get.ts`
- Create: `server/src/models/Tender/class/update.ts`
- Create: `server/src/models/Tender/class/index.ts`
- Create: `server/src/models/Tender/index.ts`

**Step 1: create.ts**

```typescript
// server/src/models/Tender/class/create.ts
import { TenderModel, TenderDocument } from "@models";
import { ITenderCreate } from "@typescript/tender";

const document = async (
  Tender: TenderModel,
  data: ITenderCreate
): Promise<TenderDocument> => {
  return new Tender({
    name: data.name,
    jobcode: data.jobcode,
    description: data.description,
    createdBy: data.createdBy,
    status: "bidding",
    files: [],
  });
};

export default { document };
```

**Step 2: get.ts**

```typescript
// server/src/models/Tender/class/get.ts
import { TenderModel, TenderDocument } from "@models";
import { Id } from "@typescript/models";
import { GetByIDOptions } from "@typescript/models";

const byId = async (
  Tender: TenderModel,
  id: Id,
  options?: GetByIDOptions
): Promise<TenderDocument | null> => {
  if (options?.throwError) {
    const tender = await Tender.findById(id);
    if (!tender) throw new Error(`Tender ${id} not found`);
    return tender;
  }
  return Tender.findById(id);
};

const list = async (Tender: TenderModel): Promise<TenderDocument[]> => {
  return Tender.find().sort({ createdAt: -1 });
};

export default { byId, list };
```

**Step 3: update.ts**

```typescript
// server/src/models/Tender/class/update.ts
import { TenderDocument } from "@models";
import { ITenderUpdate } from "@typescript/tender";

const fields = async (
  tender: TenderDocument,
  data: ITenderUpdate
): Promise<TenderDocument> => {
  if (data.name !== undefined) tender.name = data.name;
  if (data.description !== undefined) tender.description = data.description;
  if (data.status !== undefined) tender.status = data.status;
  if (data.jobsiteId !== undefined) {
    tender.jobsite = data.jobsiteId ? (data.jobsiteId as any) : undefined;
  }
  return tender;
};

export default { fields };
```

**Step 4: class/index.ts**

```typescript
// server/src/models/Tender/class/index.ts
import { ObjectType } from "type-graphql";
import { TenderModel, TenderDocument } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";
import { ITenderCreate, ITenderUpdate } from "@typescript/tender";
import { TenderSchema } from "../schema";
import create from "./create";
import get from "./get";
import update from "./update";

@ObjectType()
export class TenderClass extends TenderSchema {
  public static async getById(
    this: TenderModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getList(this: TenderModel) {
    return get.list(this);
  }

  public static async createDocument(
    this: TenderModel,
    data: ITenderCreate
  ) {
    return create.document(this, data);
  }

  public async updateFields(
    this: TenderDocument,
    data: ITenderUpdate
  ) {
    return update.fields(this, data);
  }
}
```

**Step 5: model index**

```typescript
// server/src/models/Tender/index.ts
export * from "./schema";
export * from "./class";
```

**Step 6: Commit**

```bash
git add server/src/models/Tender/
git commit -m "feat(tender): add Tender class methods"
```

---

### Task 6: Register models in models/index.ts

**Files:**
- Modify: `server/src/models/index.ts`

**Step 1: Add Tender exports and model registration**

At the top with other exports, add:
```typescript
export * from "./Tender";
```

After the User model registration block, add:
```typescript
/**
 * ----- Tender -----
 */

import { TenderClass } from "./Tender/class";

export type TenderDocument = DocumentType<TenderClass>;

export type TenderModel = ReturnModelType<typeof TenderClass>;

export const Tender = getModelForClass(TenderClass, {
  schemaOptions: { collection: "tenders" },
});
```

Also add at the bottom:
```typescript
export * from "./TenderConversation";
```

**Step 2: Verify TypeScript compiles**

```bash
cd server && npm run build 2>&1 | head -40
```

Expected: No TypeScript errors. Fix any import issues before proceeding.

**Step 3: Commit**

```bash
git add server/src/models/index.ts
git commit -m "feat(tender): register Tender and TenderConversation models"
```

---

## Phase 2: RabbitMQ — File Summarization

### Task 7: Add tender queue to RabbitMQ config

**Files:**
- Modify: `server/src/rabbitmq/config.ts`

**Step 1: Add tender queue and routing keys**

In `RABBITMQ_CONFIG.queues`, add after the `invoice` entry:

```typescript
tenderFile: {
  name: "tender.file_summary",
  bindings: ["tender_file.*"],
  options: {
    durable: true,
  },
},
```

In `ROUTING_KEYS`, add:

```typescript
tenderFile: {
  created: "tender_file.created",
  updated: "tender_file.updated",
  deleted: "tender_file.deleted",
},
```

**Step 2: Commit**

```bash
git add server/src/rabbitmq/config.ts
git commit -m "feat(tender): add tender file summarization queue to RabbitMQ config"
```

---

### Task 8: Add tender file publisher

**Files:**
- Modify: `server/src/rabbitmq/publisher.ts`

**Step 1: Add message type and publisher**

After the existing imports, add a new message interface and publisher. Because tender file summarization needs more fields than `SyncMessage`, we use a separate interface:

At the top of the file, add:
```typescript
export interface TenderFileSummaryMessage {
  tenderId: string;
  fileObjectId: string;
  fileId: string;
  timestamp: string;
}

async function publishTenderFileRaw(
  routingKey: string,
  message: TenderFileSummaryMessage
): Promise<boolean> {
  try {
    const channel = await getChannel();
    await setupTopology();
    const success = channel.publish(
      RABBITMQ_CONFIG.exchange.name,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true, contentType: "application/json" }
    );
    if (success) {
      console.log(`[RabbitMQ] Published ${routingKey}:`, message.fileId);
    }
    return success;
  } catch (error) {
    console.error(`[RabbitMQ] Failed to publish ${routingKey}:`, error);
    return false;
  }
}

export const publishTenderFileCreated = (
  tenderId: string,
  fileObjectId: string,
  fileId: string
): Promise<boolean> => {
  return publishTenderFileRaw(ROUTING_KEYS.tenderFile.created, {
    tenderId,
    fileObjectId,
    fileId,
    timestamp: new Date().toISOString(),
  });
};
```

**Step 2: Commit**

```bash
git add server/src/rabbitmq/publisher.ts
git commit -m "feat(tender): add publishTenderFileCreated publisher"
```

---

### Task 9: Create tender file summary consumer handler

This handler picks up a message, fetches the file from DO Spaces, sends it to Claude Haiku, and updates the TenderDocument with the generated summary.

**Files:**
- Create: `server/src/consumer/handlers/tenderFileSummaryHandler.ts`

**Step 1: Create handler**

```typescript
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

    // Mark as processing
    await Tender.findOneAndUpdate(
      { _id: tenderId, "files._id": fileObjectId },
      { $set: { "files.$.summaryStatus": "processing" } }
    );

    try {
      // Fetch file from DO Spaces
      const s3Object = await getFile(fileId);
      if (!s3Object?.Body) {
        throw new Error("File body is empty");
      }

      const buffer = s3Object.Body as Buffer;
      const base64 = buffer.toString("base64");

      // Determine content type — default to PDF for unknown types
      const contentType = (s3Object.ContentType || "application/pdf") as string;

      let messageContent: Anthropic.MessageParam["content"];

      if (
        contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        contentType === "application/vnd.ms-excel"
      ) {
        // Excel: parse to text
        const xlsx = await import("xlsx");
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheets = workbook.SheetNames.map((name) => {
          const ws = workbook.Sheets[name];
          return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
        }).join("\n\n");
        messageContent = `${SUMMARY_PROMPT}\n\nDocument content:\n${sheets}`;
      } else {
        // PDF or image: send natively
        const mediaType = contentType.startsWith("image/")
          ? (contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif")
          : "application/pdf";

        if (contentType.startsWith("image/")) {
          messageContent = [
            { type: "text", text: SUMMARY_PROMPT },
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as any, data: base64 },
            },
          ];
        } else {
          messageContent = [
            { type: "text", text: SUMMARY_PROMPT },
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            } as any,
          ];
        }
      }

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        messages: [{ role: "user", content: messageContent }],
      });

      const text =
        response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

      let summary: { overview: string; documentType: string; keyTopics: string[] };
      try {
        summary = JSON.parse(text);
      } catch {
        throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
      }

      // Update the file subdocument
      await Tender.findOneAndUpdate(
        { _id: tenderId, "files._id": fileObjectId },
        {
          $set: {
            "files.$.summary": summary,
            "files.$.summaryStatus": "ready",
          },
        }
      );

      console.log(`[TenderSummary] Done for file ${fileId}`);
    } catch (error) {
      console.error(`[TenderSummary] Failed for file ${fileId}:`, error);
      await Tender.findOneAndUpdate(
        { _id: tenderId, "files._id": fileObjectId },
        { $set: { "files.$.summaryStatus": "failed" } }
      );
      throw error; // re-throw so consumer can nack
    }
  },
};
```

**Step 2: Export from handlers index**

Check `server/src/consumer/handlers/index.ts` and add:
```typescript
export { tenderFileSummaryHandler } from "./tenderFileSummaryHandler";
```

**Step 3: Commit**

```bash
git add server/src/consumer/handlers/tenderFileSummaryHandler.ts server/src/consumer/handlers/index.ts
git commit -m "feat(tender): add tender file summary consumer handler"
```

---

### Task 10: Wire tender handler into consumer

**Files:**
- Modify: `server/src/consumer/index.ts`

**Step 1: Import the handler and message type**

At the top, add to existing imports:
```typescript
import { tenderFileSummaryHandler } from "./handlers";
import type { TenderFileSummaryMessage } from "../rabbitmq/publisher";
```

**Step 2: Add case to processMessage switch**

In the `switch (queueName)` block, add before `default`:
```typescript
case RABBITMQ_CONFIG.queues.tenderFile.name: {
  const tenderMsg: TenderFileSummaryMessage = JSON.parse(content);
  await tenderFileSummaryHandler.handle(tenderMsg);
  break;
}
```

Note: The `content` variable is already the raw string from `msg.content.toString()`. The `message` variable (SyncMessage) is parsed from it — for the tender queue we parse separately since it has a different shape.

**Step 3: Verify consumer compiles**

```bash
cd server && npm run build 2>&1 | head -40
```

Expected: No errors.

**Step 4: Commit**

```bash
git add server/src/consumer/index.ts
git commit -m "feat(tender): wire tender file summary handler into consumer"
```

---

## Phase 3: GraphQL API

### Task 11: Tender GraphQL resolver

**Files:**
- Create: `server/src/graphql/resolvers/tender/mutations.ts`
- Create: `server/src/graphql/resolvers/tender/index.ts`

**Step 1: mutations.ts**

```typescript
// server/src/graphql/resolvers/tender/mutations.ts
import { Field, InputType } from "type-graphql";
import { TenderStatus } from "@typescript/tender";

@InputType()
export class TenderCreateData {
  @Field()
  public name!: string;

  @Field()
  public jobcode!: string;

  @Field({ nullable: true })
  public description?: string;
}

@InputType()
export class TenderUpdateData {
  @Field({ nullable: true })
  public name?: string;

  @Field({ nullable: true })
  public description?: string;

  @Field({ nullable: true })
  public status?: string; // "bidding" | "won" | "lost"

  @Field({ nullable: true })
  public jobsiteId?: string;
}

@InputType()
export class TenderAddFileData {
  @Field()
  public fileId!: string;

  @Field()
  public documentType!: string;
}
```

**Step 2: resolver index.ts**

```typescript
// server/src/graphql/resolvers/tender/index.ts
import {
  Tender,
  TenderClass,
  TenderDocument,
  File,
  FileClass,
  JobsiteClass,
  Jobsite,
} from "@models";
import { IContext } from "@typescript/graphql";
import { Id } from "@typescript/models";
import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { Types } from "mongoose";
import { TenderCreateData, TenderUpdateData, TenderAddFileData } from "./mutations";
import { publishTenderFileCreated } from "../../../rabbitmq/publisher";

@Resolver(() => TenderClass)
export default class TenderResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => JobsiteClass, { nullable: true })
  async jobsite(@Root() tender: TenderDocument) {
    if (!tender.jobsite) return null;
    return Jobsite.getById(tender.jobsite.toString());
  }

  /**
   * ----- Queries -----
   */

  @Authorized(["ADMIN", "PM"])
  @Query(() => TenderClass, { nullable: true })
  async tender(@Arg("id", () => ID) id: Id) {
    return Tender.getById(id);
  }

  @Authorized(["ADMIN", "PM"])
  @Query(() => [TenderClass])
  async tenders() {
    return Tender.getList();
  }

  /**
   * ----- Mutations -----
   */

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderCreate(
    @Arg("data") data: TenderCreateData,
    @Ctx() context: IContext
  ) {
    const tender = await Tender.createDocument({
      ...data,
      createdBy: context.user!._id,
    });
    await tender.save();
    return tender;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderUpdate(
    @Arg("id", () => ID) id: Id,
    @Arg("data") data: TenderUpdateData
  ) {
    const tender = await Tender.getById(id, { throwError: true });
    await tender!.updateFields(data as any);
    tender!.updatedAt = new Date();
    await tender!.save();
    return tender;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderAddFile(
    @Arg("id", () => ID) id: Id,
    @Arg("data") data: TenderAddFileData
  ) {
    const tender = await Tender.getById(id, { throwError: true });
    const file = await File.getById(data.fileId, { throwError: true });

    const fileObjectId = new Types.ObjectId();
    tender!.files.push({
      _id: fileObjectId,
      file: file!._id,
      documentType: data.documentType,
      summaryStatus: "pending",
    } as any);

    tender!.updatedAt = new Date();
    await tender!.save();

    // Publish to RabbitMQ for background summarization
    await publishTenderFileCreated(
      tender!._id.toString(),
      fileObjectId.toString(),
      file!._id.toString()
    );

    return tender;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderRemoveFile(
    @Arg("id", () => ID) id: Id,
    @Arg("fileObjectId", () => ID) fileObjectId: Id
  ) {
    const tender = await Tender.getById(id, { throwError: true });
    tender!.files = tender!.files.filter(
      (f) => f._id.toString() !== fileObjectId.toString()
    ) as any;
    tender!.updatedAt = new Date();
    await tender!.save();
    return tender;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderRetrySummary(
    @Arg("id", () => ID) id: Id,
    @Arg("fileObjectId", () => ID) fileObjectId: Id
  ) {
    const tender = await Tender.getById(id, { throwError: true });
    const fileObj = tender!.files.find(
      (f) => f._id.toString() === fileObjectId.toString()
    );
    if (!fileObj) throw new Error("File not found on tender");

    // Reset to pending
    await (Tender as any).findOneAndUpdate(
      { _id: id, "files._id": fileObjectId },
      { $set: { "files.$.summaryStatus": "pending" } }
    );

    // Re-publish
    await publishTenderFileCreated(
      tender!._id.toString(),
      fileObjectId.toString(),
      fileObj.file.toString()
    );

    return Tender.getById(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => Boolean)
  async tenderRemove(@Arg("id", () => ID) id: Id) {
    const tender = await Tender.getById(id, { throwError: true });
    await tender!.deleteOne();
    return true;
  }
}
```

**Step 3: Commit**

```bash
git add server/src/graphql/resolvers/tender/
git commit -m "feat(tender): add Tender GraphQL resolver"
```

---

### Task 12: Register resolver in app.ts and run codegen

**Files:**
- Modify: `server/src/app.ts`
- Modify: `client/` (codegen output)

**Step 1: Import and register TenderResolver in app.ts**

Add import near other resolver imports:
```typescript
import TenderResolver from "@graphql/resolvers/tender";
```

Add `TenderResolver` to the `resolvers` array in `buildTypeDefsAndResolvers`.

**Step 2: Verify server compiles and starts**

```bash
cd server && npm run build 2>&1 | head -40
```

Expected: No errors.

**Step 3: Run GraphQL codegen**

```bash
cd client && npm run codegen
```

Expected: `src/generated/graphql.ts` updated with Tender types.

**Step 4: Commit**

```bash
git add server/src/app.ts client/src/generated/
git commit -m "feat(tender): register Tender resolver and regenerate GraphQL types"
```

---

## Phase 4: REST Endpoints

### Task 13: Tender conversations router

Mirrors `server/src/router/conversations.ts` but scoped to a Tender.

**Files:**
- Create: `server/src/router/tender-conversations.ts`

**Step 1: Create router**

```typescript
// server/src/router/tender-conversations.ts
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { TenderConversation } from "../models/TenderConversation";

const router = Router();

const auth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    req.userId = decoded?.userId;
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// GET /tender-conversations/:tenderId — list conversations for a tender
router.get("/:tenderId", auth, async (req: any, res) => {
  try {
    const { tenderId } = req.params;
    if (!mongoose.isValidObjectId(tenderId)) {
      res.status(400).json({ error: "Invalid tenderId" });
      return;
    }
    const convos = await TenderConversation.find(
      { tender: tenderId, user: req.userId },
      "title aiModel totalInputTokens totalOutputTokens updatedAt createdAt"
    )
      .sort({ updatedAt: -1 })
      .lean();

    res.json(
      convos.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        model: c.aiModel,
        totalInputTokens: c.totalInputTokens,
        totalOutputTokens: c.totalOutputTokens,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      }))
    );
  } catch (err) {
    console.error("GET /tender-conversations/:tenderId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /tender-conversations/:tenderId/:id — full conversation
router.get("/:tenderId/:id", auth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const convo = await TenderConversation.findById(id).lean();
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (convo.user.toString() !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json({
      id: convo._id.toString(),
      title: convo.title,
      model: convo.aiModel,
      messages: convo.messages,
      totalInputTokens: convo.totalInputTokens,
      totalOutputTokens: convo.totalOutputTokens,
      updatedAt: convo.updatedAt,
      createdAt: convo.createdAt,
    });
  } catch (err) {
    console.error("GET /tender-conversations/:tenderId/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /tender-conversations/:tenderId/:id/title
router.patch("/:tenderId/:id/title", auth, async (req: any, res) => {
  try {
    const { title } = req.body as { title: string };
    if (!title?.trim() || title.trim().length > 200) {
      res.status(400).json({ error: "Valid title required (max 200 chars)" });
      return;
    }
    const convo = await TenderConversation.findById(req.params.id);
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (convo.user.toString() !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    convo.title = title.trim();
    await convo.save();
    res.json({ id: convo._id.toString(), title: convo.title });
  } catch (err) {
    console.error("PATCH /tender-conversations title error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /tender-conversations/:tenderId/:id
router.delete("/:tenderId/:id", auth, async (req: any, res) => {
  try {
    const convo = await TenderConversation.findById(req.params.id);
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (convo.user.toString() !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await convo.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /tender-conversations error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
```

**Step 2: Commit**

```bash
git add server/src/router/tender-conversations.ts
git commit -m "feat(tender): add tender conversations REST router"
```

---

### Task 14: Tender chat router

This is the core AI endpoint. Mirrors `chat.ts` but uses a different system prompt and exposes a `read_document` tool instead of MCP tools.

**Files:**
- Create: `server/src/router/tender-chat.ts`

**Step 1: Create router**

```typescript
// server/src/router/tender-chat.ts
import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Tender } from "@models";
import { TenderConversation, IToolResult } from "../models/TenderConversation";
import { getFile } from "@utils/fileStorage";
import { User } from "@models";
import { isDocument } from "@typegoose/typegoose";

const router = Router();

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 5.0, output: 25.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

// The read_document tool definition
const READ_DOCUMENT_TOOL: Anthropic.Tool = {
  name: "read_document",
  description:
    "Load the full contents of a specific tender document. Use this when a document summary indicates it is relevant to the question and you need the actual content, including drawings, tables, and specifications.",
  input_schema: {
    type: "object" as const,
    properties: {
      file_object_id: {
        type: "string",
        description: "The _id of the file object from the document list",
      },
      start_page: {
        type: "number",
        description: "Optional: first page to load (1-indexed). Use for large documents.",
      },
      end_page: {
        type: "number",
        description: "Optional: last page to load (inclusive).",
      },
    },
    required: ["file_object_id"],
  },
};

router.post("/message", async (req, res) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    userId = decoded?.userId;
    if (!userId) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const { messages, conversationId, tenderId } = req.body as {
    messages: Anthropic.MessageParam[];
    conversationId?: string;
    tenderId: string;
  };

  if (!tenderId || !mongoose.isValidObjectId(tenderId)) {
    res.status(400).json({ error: "Valid tenderId required" });
    return;
  }

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  // ── Load tender ───────────────────────────────────────────────────────────
  const tender = await Tender.getById(tenderId);
  if (!tender) {
    res.status(404).json({ error: "Tender not found" });
    return;
  }

  // ── Build system prompt ───────────────────────────────────────────────────
  const readyFiles = tender.files.filter((f) => f.summaryStatus === "ready");
  const pendingFiles = tender.files.filter(
    (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  );

  const fileIndex = readyFiles
    .map((f) => {
      const summary = f.summary as any;
      return [
        `**File ID: ${f._id}**`,
        `Type: ${f.documentType}`,
        summary
          ? [
              `Overview: ${summary.overview}`,
              `Key Topics: ${(summary.keyTopics as string[]).join(", ")}`,
            ].join("\n")
          : "Summary: not yet available",
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const pendingNotice =
    pendingFiles.length > 0
      ? `\n\nNOTE: ${pendingFiles.length} document(s) are still being processed and are not yet available for reading. Mention this if your answer may be incomplete.`
      : "";

  const user = await User.findById(userId).populate("employee");
  const employee = isDocument(user?.employee) ? user!.employee : null;
  const userContext = [
    user?.name && `The user's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping to analyze tender documents for Bow-Mark, a paving and concrete company.

You are working on tender: **${tender.name}** (Job Code: ${tender.jobcode})${tender.description ? `\nTender description: ${tender.description}` : ""}

## Available Documents

${fileIndex || "No documents have been processed yet."}${pendingNotice}

## Instructions

- Use the read_document tool to load specific documents when you need their full content to answer a question.
- Prefer reading relevant documents over guessing from summaries alone.
- Always cite your sources inline using the format **[Filename, p.X]** where X is the page number. This allows the user to navigate directly to the source.
- If a document is a drawing, describe what you see in the drawing as part of your answer.
- Be accurate. If you are unsure, say so and recommend the user verify in the source document.
- For questions about specific requirements, clauses, or quantities, always read the relevant document rather than relying on the summary.`;

  // ── Load or create conversation ───────────────────────────────────────────
  let convo: Awaited<ReturnType<typeof TenderConversation.findById>> | null = null;
  let isNewConversation = false;

  if (conversationId) {
    if (!mongoose.isValidObjectId(conversationId)) {
      res.status(400).json({ error: "Invalid conversationId" });
      return;
    }
    convo = await TenderConversation.findById(conversationId);
    if (!convo || convo.user.toString() !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  } else {
    convo = await TenderConversation.create({
      tender: tenderId,
      user: userId,
      title: "New conversation",
      aiModel: "claude-opus-4-6",
      messages: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
    });
    isNewConversation = true;
  }

  // ── Model classification ──────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const lastUserContent = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;
  const queryText =
    typeof lastUserContent === "string" ? lastUserContent : null;

  const classificationPromise: Promise<"simple" | "complex"> = queryText
    ? anthropic.messages
        .create({
          model: "claude-haiku-4-5",
          max_tokens: 10,
          messages: [
            {
              role: "user",
              content: `Classify this construction tender question as SIMPLE or COMPLEX.
SIMPLE: A single direct lookup — one specific fact, clause, or requirement from one document.
COMPLEX: Synthesis across documents, comparisons, summaries, anything requiring reading multiple documents.
Err towards COMPLEX when uncertain.
Query: "${queryText}"
Reply with exactly one word: SIMPLE or COMPLEX`,
            },
          ],
        })
        .then((r) => {
          const text =
            r.content[0]?.type === "text"
              ? r.content[0].text.trim().toUpperCase()
              : "";
          return text === "SIMPLE" ? "simple" : "complex";
        })
        .catch(() => "complex" as const)
    : Promise.resolve("complex" as const);

  // ── Streaming setup ───────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Transfer-Encoding", "chunked");

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (isNewConversation) {
    sendEvent({ type: "conversation_id", id: convo!._id.toString() });
  }

  const complexity = await classificationPromise;
  const MODEL =
    complexity === "simple" ? "claude-sonnet-4-6" : "claude-opus-4-6";
  console.log(`[tender-chat] complexity=${complexity} → model=${MODEL}`);

  convo!.aiModel = MODEL;

  const conversationMessages: Anthropic.MessageParam[] = [...messages];
  const isFirstTurn = convo!.messages.length === 0;
  const firstUserMessage = messages.find((m) => m.role === "user")?.content;
  const tokensBefore = {
    input: convo!.totalInputTokens,
    output: convo!.totalOutputTokens,
  };

  // ── Agentic loop ──────────────────────────────────────────────────────────
  try {
    let continueLoop = true;
    const turnToolResults: IToolResult[] = [];

    while (continueLoop) {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: [READ_DOCUMENT_TOOL],
        messages: conversationMessages,
      });

      stream.on("text", (delta: string) => {
        sendEvent({ type: "text_delta", delta });
      });

      const message = await stream.finalMessage();

      sendEvent({
        type: "usage",
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: MODEL,
      });

      convo!.totalInputTokens += message.usage.input_tokens;
      convo!.totalOutputTokens += message.usage.output_tokens;

      if (message.stop_reason === "end_turn") {
        conversationMessages.push({ role: "assistant", content: message.content });
        sendEvent({ type: "done" });
        continueLoop = false;
      } else if (message.stop_reason === "tool_use") {
        conversationMessages.push({ role: "assistant", content: message.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of message.content) {
          if (block.type !== "tool_use") continue;

          const input = block.input as {
            file_object_id: string;
            start_page?: number;
            end_page?: number;
          };

          sendEvent({ type: "tool_call", toolName: "read_document", fileObjectId: input.file_object_id });

          try {
            const fileObj = tender.files.find(
              (f) => f._id.toString() === input.file_object_id
            );
            if (!fileObj) throw new Error(`File object ${input.file_object_id} not found on tender`);

            const fileId = fileObj.file.toString();
            const s3Object = await getFile(fileId);
            if (!s3Object?.Body) throw new Error("File body empty");

            const buffer = s3Object.Body as Buffer;
            const contentType = s3Object.ContentType || "application/pdf";
            const base64 = buffer.toString("base64");

            let toolResultContent: Anthropic.ToolResultBlockParam["content"];

            if (
              contentType.includes("spreadsheet") ||
              contentType.includes("excel") ||
              contentType.includes("ms-excel")
            ) {
              const xlsx = await import("xlsx");
              const workbook = xlsx.read(buffer, { type: "buffer" });
              const text = workbook.SheetNames.map((name) => {
                const ws = workbook.Sheets[name];
                return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
              }).join("\n\n");
              toolResultContent = `Document: ${fileObj.documentType}\n\n${text}`;
            } else if (contentType.startsWith("image/")) {
              toolResultContent = [
                { type: "text" as const, text: `Document: ${fileObj.documentType}` },
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
              // PDF — pass as document block
              toolResultContent = [
                { type: "text" as const, text: `Document: ${fileObj.documentType}\nWhen citing this document use the filename: "${fileObj.documentType}"` },
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

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: toolResultContent,
            });

            const resultSummary = `Loaded: ${fileObj.documentType}`;
            turnToolResults.push({ toolName: "read_document", result: resultSummary });
            sendEvent({ type: "tool_result", toolName: "read_document", result: resultSummary });
          } catch (toolErr) {
            const errorText = `Error loading document: ${
              toolErr instanceof Error ? toolErr.message : "Unknown error"
            }`;
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: errorText,
              is_error: true,
            });
            turnToolResults.push({ toolName: "read_document", result: errorText });
            sendEvent({ type: "tool_result", toolName: "read_document", result: errorText });
          }
        }

        conversationMessages.push({ role: "user", content: toolResults });
      } else {
        sendEvent({ type: "done" });
        continueLoop = false;
      }
    }

    // ── Persist ───────────────────────────────────────────────────────────
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user" && typeof lastUserMsg.content === "string") {
      convo!.messages.push({ role: "user", content: lastUserMsg.content });
    }

    const lastAssistantTurn = [...conversationMessages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistantTurn) {
      const content = lastAssistantTurn.content;
      const text =
        typeof content === "string"
          ? content
          : (content as Anthropic.ContentBlock[])
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("");
      if (text) {
        convo!.messages.push({
          role: "assistant",
          content: text,
          model: MODEL,
          inputTokens: convo!.totalInputTokens - tokensBefore.input,
          outputTokens: convo!.totalOutputTokens - tokensBefore.output,
          ...(turnToolResults.length > 0 ? { toolResults: turnToolResults } : {}),
        });
      }
    }

    await convo!.save();

    // ── Title generation ──────────────────────────────────────────────────
    if (isFirstTurn && firstUserMessage && typeof firstUserMessage === "string") {
      try {
        const titleResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 30,
          messages: [
            {
              role: "user",
              content: `Generate a concise 4-6 word title for a construction tender chat that starts with:\n\n"${firstUserMessage}"\n\nRespond with only the title. No quotes, no punctuation at the end.`,
            },
          ],
        });
        const title =
          titleResponse.content[0]?.type === "text"
            ? titleResponse.content[0].text.trim()
            : "New conversation";
        convo!.title = title;
        await convo!.save();
        sendEvent({ type: "title", title });
      } catch (err) {
        console.error("Title generation failed:", err);
      }
    }
  } catch (err) {
    console.error("Tender chat error:", err);
    let userMessage = err instanceof Error ? err.message : "Unknown error";
    if (
      err instanceof Anthropic.BadRequestError &&
      err.message.toLowerCase().includes("too long")
    ) {
      userMessage =
        "The document is too large to load in full. Try asking about a specific section or page range.";
    }
    sendEvent({ type: "error", message: userMessage });
  } finally {
    res.end();
  }
});

export default router;
```

**Step 2: Commit**

```bash
git add server/src/router/tender-chat.ts
git commit -m "feat(tender): add tender chat SSE router with read_document tool"
```

---

### Task 15: Register new routers in app.ts

**Files:**
- Modify: `server/src/app.ts`

**Step 1: Add imports**

```typescript
import tenderChatRouter from "./router/tender-chat";
import tenderConversationsRouter from "./router/tender-conversations";
```

**Step 2: Register routes** (after existing route registrations)

```typescript
app.use("/api/tender-chat", tenderChatRouter);
app.use("/tender-conversations", tenderConversationsRouter);
```

**Step 3: Verify server compiles**

```bash
cd server && npm run build 2>&1 | head -40
```

Expected: No errors.

**Step 4: Commit**

```bash
git add server/src/app.ts
git commit -m "feat(tender): register tender chat and conversations routers"
```

---

## Phase 5: ChatPage Refactor

### Task 16: Make ChatPage configurable

**Files:**
- Modify: `client/src/components/Chat/ChatPage.tsx`

The goal is to add props for `messageEndpoint`, `conversationsEndpoint`, `extraPayload`, and `suggestions` while keeping all defaults so existing `/chat` pages need zero changes.

**Step 1: Update the `ChatPageProps` interface**

Find the existing interface:
```typescript
interface ChatPageProps {
  initialConversationId?: string;
}
```

Replace with:
```typescript
interface ChatPageProps {
  initialConversationId?: string;
  messageEndpoint?: string;           // default: "/api/chat/message"
  conversationsEndpoint?: string;     // default: "/conversations"
  extraPayload?: Record<string, unknown>; // e.g. { tenderId: "..." }
  suggestions?: string[];             // overrides the default SUGGESTIONS
}
```

**Step 2: Destructure new props in the component**

Find:
```typescript
const ChatPage = ({ initialConversationId }: ChatPageProps) => {
```

Replace with:
```typescript
const ChatPage = ({
  initialConversationId,
  messageEndpoint = "/api/chat/message",
  conversationsEndpoint = "/conversations",
  extraPayload,
  suggestions: suggestionsProp,
}: ChatPageProps) => {
```

**Step 3: Use configurable suggestions**

Find the `SUGGESTIONS` constant usage in the JSX (where suggestion chips are rendered) and replace `SUGGESTIONS` with `suggestionsProp ?? SUGGESTIONS`.

**Step 4: Use configurable endpoints**

Find every fetch call that hardcodes `/conversations` or `/api/chat/message` and replace with the prop values:

- `${serverBase}/conversations` → `${serverBase}${conversationsEndpoint}`
- `${serverBase}/conversations/${id}` → `${serverBase}${conversationsEndpoint}/${id}`
- `${serverBase}/conversations/${id}/title` → `${serverBase}${conversationsEndpoint}/${id}/title`
- `/api/chat/message` → `messageEndpoint`

**Step 5: Merge extraPayload into the message POST body**

Find the fetch call that posts to the chat endpoint. Find where the body is set and add `...extraPayload`:

```typescript
body: JSON.stringify({
  messages: apiMessages,
  conversationId: currentConversationId,
  ...extraPayload,  // adds tenderId etc.
}),
```

**Step 6: Verify TypeScript**

```bash
cd client && npm run type-check 2>&1 | head -40
```

Expected: No errors.

**Step 7: Commit**

```bash
git add client/src/components/Chat/ChatPage.tsx
git commit -m "feat(tender): make ChatPage configurable with endpoint + payload props"
```

---

### Task 17: Verify existing chat pages unchanged

**Files:**
- Read: `client/src/pages/chat/index.tsx`
- Read: `client/src/pages/chat/[conversationId].tsx`

These pages pass no new props, so they automatically use the default endpoint values. No changes needed.

**Step 1: Smoke-check**

```bash
cd client && npm run type-check 2>&1 | head -20
```

Expected: No errors.

---

## Phase 6: Frontend

### Task 18: Tenders list page

**Files:**
- Create: `client/src/pages/tenders.tsx`

**Step 1: Create page**

```tsx
// client/src/pages/tenders.tsx
import { NextPage } from "next";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Badge,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  ModalCloseButton,
} from "@chakra-ui/react";
import { useQuery, useMutation, gql } from "@apollo/client";
import Permission from "../components/Common/Permission";
import { UserRoles } from "../generated/graphql";

const TENDERS_QUERY = gql`
  query Tenders {
    tenders {
      _id
      name
      jobcode
      status
      files {
        _id
        summaryStatus
      }
      createdAt
    }
  }
`;

const TENDER_CREATE_MUTATION = gql`
  mutation TenderCreate($data: TenderCreateData!) {
    tenderCreate(data: $data) {
      _id
    }
  }
`;

const STATUS_COLORS: Record<string, string> = {
  bidding: "blue",
  won: "green",
  lost: "red",
};

const TendersPage: NextPage = () => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [name, setName] = React.useState("");
  const [jobcode, setJobcode] = React.useState("");
  const [description, setDescription] = React.useState("");

  const { data, loading, refetch } = useQuery(TENDERS_QUERY, {
    fetchPolicy: "network-only",
  });

  const [tenderCreate, { loading: creating }] = useMutation(TENDER_CREATE_MUTATION, {
    onCompleted: (d) => {
      onClose();
      router.push(`/tender/${d.tenderCreate._id}`);
    },
  });

  const handleCreate = () => {
    tenderCreate({ variables: { data: { name, jobcode, description: description || undefined } } });
  };

  return (
    <Permission minRole={UserRoles.ProjectManager}>
      <Box p={6}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">Tenders</Heading>
          <Button colorScheme="blue" onClick={onOpen}>
            New Tender
          </Button>
        </Flex>

        {loading ? (
          <Spinner />
        ) : (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Job Code</Th>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Files</Th>
                <Th>Created</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(data?.tenders ?? []).map((t: any) => (
                <Tr
                  key={t._id}
                  cursor="pointer"
                  _hover={{ bg: "gray.50" }}
                  onClick={() => router.push(`/tender/${t._id}`)}
                >
                  <Td fontWeight="semibold">{t.jobcode}</Td>
                  <Td>{t.name}</Td>
                  <Td>
                    <Badge colorScheme={STATUS_COLORS[t.status] ?? "gray"}>
                      {t.status}
                    </Badge>
                  </Td>
                  <Td>{t.files.length}</Td>
                  <Td>{new Date(t.createdAt).toLocaleDateString()}</Td>
                </Tr>
              ))}
              {(data?.tenders ?? []).length === 0 && (
                <Tr>
                  <Td colSpan={5}>
                    <Text color="gray.400" textAlign="center" py={4}>
                      No tenders yet. Create one to get started.
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}

        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>New Tender</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl isRequired mb={4}>
                <FormLabel>Job Code</FormLabel>
                <Input
                  placeholder="e.g. 26-034"
                  value={jobcode}
                  onChange={(e) => setJobcode(e.target.value)}
                />
              </FormControl>
              <FormControl isRequired mb={4}>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="Job name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Optional notes about this tender"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button mr={3} onClick={onClose} variant="ghost">
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleCreate}
                isLoading={creating}
                isDisabled={!name.trim() || !jobcode.trim()}
              >
                Create
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </Permission>
  );
};

import React from "react";
export default TendersPage;
```

**Step 2: Type-check**

```bash
cd client && npm run type-check 2>&1 | head -40
```

Fix any type errors before committing.

**Step 3: Commit**

```bash
git add client/src/pages/tenders.tsx
git commit -m "feat(tender): add Tenders list page"
```

---

### Task 19: Tender detail page

This is the main page with three sections. It's a larger component — break it into the three sections below.

**Files:**
- Create: `client/src/components/Tender/types.ts`
- Create: `client/src/components/Tender/TenderOverview.tsx`
- Create: `client/src/components/Tender/TenderDocuments.tsx`
- Create: `client/src/pages/tender/[id].tsx`

**Step 1: Tender component types**

```typescript
// client/src/components/Tender/types.ts
export interface EnrichedFileSummary {
  overview: string;
  documentType: string;
  keyTopics: string[];
}

export interface EnrichedFile {
  _id: string;
  documentType: string;
  summaryStatus: "pending" | "processing" | "ready" | "failed";
  summary?: EnrichedFileSummary;
  pageCount?: number;
  file: {
    _id: string;
    mimetype: string;
  };
}

export interface TenderDetail {
  _id: string;
  name: string;
  jobcode: string;
  description?: string;
  status: "bidding" | "won" | "lost";
  files: EnrichedFile[];
  jobsite?: { _id: string; name: string } | null;
  createdAt: string;
}
```

**Step 2: TenderOverview component**

```tsx
// client/src/components/Tender/TenderOverview.tsx
import React from "react";
import {
  Box,
  Badge,
  Heading,
  Text,
  HStack,
  Select,
  Textarea,
  Button,
  VStack,
  Link as ChakraLink,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { TenderDetail } from "./types";
import { useMutation, gql } from "@apollo/client";

const TENDER_UPDATE = gql`
  mutation TenderUpdate($id: ID!, $data: TenderUpdateData!) {
    tenderUpdate(id: $id, data: $data) {
      _id
      name
      status
      description
    }
  }
`;

const STATUS_COLORS: Record<string, string> = {
  bidding: "blue",
  won: "green",
  lost: "red",
};

interface Props {
  tender: TenderDetail;
  onUpdated: () => void;
}

export const TenderOverview: React.FC<Props> = ({ tender, onUpdated }) => {
  const [editing, setEditing] = React.useState(false);
  const [description, setDescription] = React.useState(tender.description ?? "");
  const [status, setStatus] = React.useState(tender.status);

  const [update, { loading }] = useMutation(TENDER_UPDATE, {
    onCompleted: () => {
      setEditing(false);
      onUpdated();
    },
  });

  return (
    <Box mb={8}>
      <HStack mb={2} align="baseline" spacing={3}>
        <Text fontSize="sm" color="gray.500" fontWeight="medium">
          {tender.jobcode}
        </Text>
        <Badge colorScheme={STATUS_COLORS[tender.status] ?? "gray"} fontSize="sm">
          {tender.status}
        </Badge>
      </HStack>
      <Heading size="lg" mb={4}>
        {tender.name}
      </Heading>

      {tender.jobsite && (
        <Text mb={4} fontSize="sm" color="gray.600">
          Linked jobsite:{" "}
          <ChakraLink as={NextLink} href={`/jobsite/${tender.jobsite._id}`} color="blue.500">
            {tender.jobsite.name}
          </ChakraLink>
        </Text>
      )}

      {editing ? (
        <VStack align="stretch" spacing={3} maxW="600px">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="bidding">Bidding</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </Select>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Description / notes about this tender"
          />
          <HStack>
            <Button
              colorScheme="blue"
              size="sm"
              isLoading={loading}
              onClick={() =>
                update({
                  variables: {
                    id: tender._id,
                    data: { status, description: description || undefined },
                  },
                })
              }
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </HStack>
        </VStack>
      ) : (
        <Box>
          {tender.description ? (
            <Text color="gray.700" mb={2} whiteSpace="pre-wrap">
              {tender.description}
            </Text>
          ) : (
            <Text color="gray.400" mb={2} fontStyle="italic">
              No description
            </Text>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </Box>
      )}
    </Box>
  );
};
```

**Step 3: TenderDocuments component**

```tsx
// client/src/components/Tender/TenderDocuments.tsx
import React from "react";
import {
  Box,
  Heading,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Badge,
  Button,
  HStack,
  Input,
  Select,
  Text,
  Collapse,
  VStack,
  useDisclosure,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight, FiTrash2, FiRefreshCw } from "react-icons/fi";
import { useMutation, gql } from "@apollo/client";
import { TenderDetail, EnrichedFile } from "./types";

const TENDER_ADD_FILE = gql`
  mutation TenderAddFile($id: ID!, $data: TenderAddFileData!) {
    tenderAddFile(id: $id, data: $data) {
      _id
      files {
        _id
        documentType
        summaryStatus
        summary {
          overview
          keyTopics
        }
      }
    }
  }
`;

const TENDER_REMOVE_FILE = gql`
  mutation TenderRemoveFile($id: ID!, $fileObjectId: ID!) {
    tenderRemoveFile(id: $id, fileObjectId: $fileObjectId) {
      _id
      files { _id }
    }
  }
`;

const TENDER_RETRY_SUMMARY = gql`
  mutation TenderRetrySummary($id: ID!, $fileObjectId: ID!) {
    tenderRetrySummary(id: $id, fileObjectId: $fileObjectId) {
      _id
      files {
        _id
        summaryStatus
      }
    }
  }
`;

const STATUS_COLORS: Record<string, string> = {
  pending: "gray",
  processing: "yellow",
  ready: "green",
  failed: "red",
};

interface FileRowProps {
  file: EnrichedFile;
  tenderId: string;
  onUpdated: () => void;
}

const FileRow: React.FC<FileRowProps> = ({ file, tenderId, onUpdated }) => {
  const { isOpen, onToggle } = useDisclosure();

  const [removeFile] = useMutation(TENDER_REMOVE_FILE, {
    onCompleted: onUpdated,
    variables: { id: tenderId, fileObjectId: file._id },
  });

  const [retrySummary, { loading: retrying }] = useMutation(TENDER_RETRY_SUMMARY, {
    onCompleted: onUpdated,
    variables: { id: tenderId, fileObjectId: file._id },
  });

  return (
    <>
      <Tr>
        <Td>
          <HStack spacing={1}>
            <IconButton
              aria-label="expand"
              icon={isOpen ? <FiChevronDown /> : <FiChevronRight />}
              size="xs"
              variant="ghost"
              onClick={onToggle}
              isDisabled={file.summaryStatus !== "ready"}
            />
            <Text fontSize="sm">{file.documentType}</Text>
          </HStack>
        </Td>
        <Td>
          <Badge colorScheme={STATUS_COLORS[file.summaryStatus]}>
            {file.summaryStatus}
          </Badge>
        </Td>
        <Td>
          <HStack spacing={1}>
            {file.summaryStatus === "failed" && (
              <IconButton
                aria-label="retry"
                icon={retrying ? <Spinner size="xs" /> : <FiRefreshCw />}
                size="xs"
                variant="ghost"
                onClick={() => retrySummary()}
                isDisabled={retrying}
              />
            )}
            <IconButton
              aria-label="remove"
              icon={<FiTrash2 />}
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={() => removeFile()}
            />
          </HStack>
        </Td>
      </Tr>
      {file.summary && (
        <Tr>
          <Td colSpan={3} p={0}>
            <Collapse in={isOpen}>
              <Box bg="gray.50" px={8} py={3} fontSize="sm">
                <Text mb={1}>{file.summary.overview}</Text>
                {file.summary.keyTopics.length > 0 && (
                  <HStack wrap="wrap" mt={1} spacing={1}>
                    {file.summary.keyTopics.map((t) => (
                      <Badge key={t} colorScheme="gray" fontSize="xs">
                        {t}
                      </Badge>
                    ))}
                  </HStack>
                )}
              </Box>
            </Collapse>
          </Td>
        </Tr>
      )}
    </>
  );
};

interface Props {
  tender: TenderDetail;
  onUpdated: () => void;
}

export const TenderDocuments: React.FC<Props> = ({ tender, onUpdated }) => {
  const [uploading, setUploading] = React.useState(false);
  const [docType, setDocType] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace("/graphql", "");

  const [addFile] = useMutation(TENDER_ADD_FILE, { onCompleted: onUpdated });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docType.trim()) return;

    setUploading(true);
    try {
      // Use existing file upload endpoint
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${serverBase}/file/upload`, {
        method: "POST",
        headers: { Authorization: token ?? "" },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const { fileId } = await res.json();

      await addFile({
        variables: {
          id: tender._id,
          data: { fileId, documentType: docType.trim() },
        },
      });

      setDocType("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const processingCount = tender.files.filter(
    (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  ).length;

  return (
    <Box mb={8}>
      <Heading size="md" mb={4}>
        Documents ({tender.files.length})
      </Heading>

      {processingCount > 0 && (
        <Box bg="yellow.50" border="1px" borderColor="yellow.200" rounded="md" p={3} mb={4} fontSize="sm">
          {processingCount} document{processingCount > 1 ? "s" : ""} still being processed — chat may be incomplete
        </Box>
      )}

      <Table variant="simple" size="sm" mb={4}>
        <Thead>
          <Tr>
            <Th>Document</Th>
            <Th>Status</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {tender.files.map((f) => (
            <FileRow key={f._id} file={f} tenderId={tender._id} onUpdated={onUpdated} />
          ))}
          {tender.files.length === 0 && (
            <Tr>
              <Td colSpan={3}>
                <Text color="gray.400" textAlign="center" py={4} fontSize="sm">
                  No documents uploaded yet
                </Text>
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>

      <HStack spacing={2} align="flex-end">
        <Box flex={1}>
          <Text fontSize="xs" mb={1} color="gray.600">
            Document type
          </Text>
          <Input
            size="sm"
            placeholder="e.g. Spec Book, Drawing, Schedule of Quantities"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          />
        </Box>
        <Button
          size="sm"
          colorScheme="blue"
          isLoading={uploading}
          isDisabled={!docType.trim()}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
      </HStack>
    </Box>
  );
};
```

**Step 4: Tender detail page**

```tsx
// client/src/pages/tender/[id].tsx
import React from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { Box, Divider, Heading, Spinner, Text, Flex } from "@chakra-ui/react";
import { useQuery, gql } from "@apollo/client";
import Permission from "../../components/Common/Permission";
import { UserRoles } from "../../generated/graphql";
import { TenderOverview } from "../../components/Tender/TenderOverview";
import { TenderDocuments } from "../../components/Tender/TenderDocuments";
import ChatPage from "../../components/Chat/ChatPage";
import { localStorageTokenKey } from "../../contexts/Auth";

const TENDER_QUERY = gql`
  query Tender($id: ID!) {
    tender(id: $id) {
      _id
      name
      jobcode
      description
      status
      createdAt
      jobsite {
        _id
        name
      }
      files {
        _id
        documentType
        summaryStatus
        pageCount
        summary {
          overview
          documentType
          keyTopics
        }
        file {
          _id
          mimetype
        }
      }
    }
  }
`;

const TENDER_SUGGESTIONS = [
  "What are the material requirements for this job?",
  "Are there any special specifications I should know about?",
  "What does the schedule of quantities show?",
  "Summarize the key requirements from the spec book",
];

const TenderPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const { data, loading, refetch } = useQuery(TENDER_QUERY, {
    variables: { id },
    skip: !id,
    fetchPolicy: "network-only",
  });

  if (!router.isReady || !id) return null;

  const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace(
    "/graphql",
    ""
  );

  return (
    <Permission minRole={UserRoles.ProjectManager}>
      {loading ? (
        <Box p={6}>
          <Spinner />
        </Box>
      ) : !data?.tender ? (
        <Box p={6}>
          <Text color="gray.500">Tender not found</Text>
        </Box>
      ) : (
        <Flex h="100%" overflow="hidden">
          {/* Left panel: overview + documents */}
          <Box
            w="420px"
            flexShrink={0}
            borderRight="1px"
            borderColor="gray.200"
            overflowY="auto"
            p={6}
          >
            <TenderOverview tender={data.tender} onUpdated={refetch} />
            <Divider mb={6} />
            <TenderDocuments tender={data.tender} onUpdated={refetch} />
          </Box>

          {/* Right panel: chat */}
          <Box flex={1} overflow="hidden">
            <ChatPage
              messageEndpoint="/api/tender-chat/message"
              conversationsEndpoint={`/tender-conversations/${id as string}`}
              extraPayload={{ tenderId: id as string }}
              suggestions={TENDER_SUGGESTIONS}
            />
          </Box>
        </Flex>
      )}
    </Permission>
  );
};

export default TenderPage;
```

**Step 5: Type-check**

```bash
cd client && npm run type-check 2>&1 | head -40
```

Fix any type errors before committing.

**Step 6: Commit**

```bash
git add client/src/components/Tender/ client/src/pages/tender/
git commit -m "feat(tender): add Tender detail page with Overview, Documents, and Chat sections"
```

---

## Phase 7: Navigation

### Task 20: Add Tenders to nav sidebar

**Step 1: Find the nav component**

```bash
grep -r "jobsites\|daily-reports\|nav" client/src/components --include="*.tsx" -l
```

Find the sidebar navigation component and locate where "Jobsites" or similar nav items are rendered.

**Step 2: Add Tenders link**

Add a nav item pointing to `/tenders`, visible only to PM and Admin roles. Follow the exact same pattern as existing nav items in that file.

**Step 3: Type-check and commit**

```bash
cd client && npm run type-check 2>&1 | head -20
git add client/src/components/
git commit -m "feat(tender): add Tenders link to nav sidebar"
```

---

## Phase 8: Smoke Test

### Task 21: End-to-end smoke test

With `tilt up` running:

**Step 1: Check server starts cleanly**

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=30
```

Expected: No TypeScript errors, no crash loops.

**Step 2: Check consumer starts cleanly**

```bash
kubectl logs $(kubectl get pods -l app=consumer -o jsonpath='{.items[0].metadata.name}') --tail=30
```

Expected: `[Consumer] Listening on queue: tender.file_summary`

**Step 3: Test the flow**

1. Log in as a PM or Admin user
2. Navigate to `/tenders` — page loads, empty list
3. Create a new tender — redirected to `/tender/[id]`
4. Upload a small PDF with document type "Test Spec"
5. Check consumer logs — file summary job should run
6. Refresh the page — file row shows `ready` status, summary visible
7. Open the chat — type "What is in this document?"
8. Claude should call `read_document`, load the PDF, respond with content and citation

**Step 4: Verify citation format**

Ensure the chat response contains `[Test Spec, p.X]` style citations (Claude will produce these if instructed in the system prompt).

---

## Notes for Future Work

- **Citation link rendering**: Add client-side parsing of `[Filename, p.X]` patterns in `MarkdownContent.tsx` to render them as clickable links opening the DO Spaces pre-signed URL with `#page=X`
- **File polling**: TenderDocuments component polls for status changes while files are processing (currently requires manual refresh)
- **Page range support**: The `read_document` tool accepts `start_page`/`end_page` but the current implementation loads the full file — add PDF splitting with `pdf-lib` if large documents regularly exceed context limits
- **Consumer env vars**: Ensure the consumer k8s deployment has `ANTHROPIC_API_KEY`, `SPACES_KEY`, `SPACES_SECRET`, `SPACES_NAME`, and `SPACES_REGION` environment variables — currently only the server pod has these
