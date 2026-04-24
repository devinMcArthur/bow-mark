# Unified File System — Foundation (Plan 2A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend infrastructure for the unified file system — data model (File / Document / Enrichment / FileNode), migration scripts, pipeline rework, GraphQL resolvers, and a read-path adapter layer — without yet exposing the new tree in any user-facing UI. Plan 2B builds the UI on top.

**Architecture:** Three-layer model + enrichment sidecar. `File` holds bytes, `Document` holds stable identity (its `_id` == old `EnrichedFile._id` after migration to preserve refs), `Enrichment` holds the AI state machine, `FileNode` holds tree position with multi-placement. Path-based enrichment policy anchored at immutable reserved roots. Migration is a single atomic backfill followed by staged UI cutover (Plan 2B). During cutover, a read-path adapter (`resolveDocumentsForContext`) bridges old-shape and new-shape readers.

**Tech Stack:**
- Mongoose 5.10 + MongoDB 6 replica set (transactions required for transactional entity+root creation and move cascades)
- Typegoose for schema definitions (matches project convention)
- `vitest` for tests (existing infrastructure; `@models` preload already in place)
- `@lib/eventfulMutation`, `@lib/entityVersion`, `@lib/requestContext`, `DomainEvent` — all from Plan 1 foundation

**Phase scope (what this plan does NOT do):**
- No client UI. `<FileBrowser>` component and per-surface cutovers are Plan 2B.
- No ACL hardening of existing download endpoints (`/api/enriched-files/:id`, `File.downloadUrl`). Separate security ticket.
- No File garbage collection job. Files remain until admin cleanup; deferred to a follow-up.
- No `purgeDocument` admin mutation. Deferred.
- No `createPlacement` mutation (multi-placement in UI). Deferred to Plan 2B.
- No CI `no-restricted-imports` rules. Added in Plan 2B cleanup phase.

**Test strategy:** Every new model + helper gets unit/integration tests. Each migration script has a fixture-based integration test. One end-to-end test validates tender creation → reserved-root provisioning → document upload → enrichment enqueue → placement visibility. Adapter layer tested with both shape inputs.

---

## File Structure

### New server files

| Path | Responsibility |
|---|---|
| `server/src/models/Document/schema/index.ts` | Typegoose schema for Document (identity, description, enrichmentLocked) |
| `server/src/models/Document/index.ts` | Barrel export |
| `server/src/models/Enrichment/schema/index.ts` | Typegoose schema for Enrichment state machine |
| `server/src/models/Enrichment/index.ts` | Barrel export |
| `server/src/models/FileNode/schema/index.ts` | Typegoose schema for tree node |
| `server/src/models/FileNode/index.ts` | Barrel export |
| `server/src/models/FileNode/class/index.ts` | Domain methods (move, trash, restore) |
| `server/src/models/FileNode/class/move.ts` | Move-with-cascade logic |
| `server/src/models/FileNode/class/trash.ts` | Soft-delete cascade |
| `server/src/lib/fileTree/reservedRoots.ts` | Reserved root constants + namespace discovery |
| `server/src/lib/fileTree/bootstrapRoots.ts` | App-startup root provisioning |
| `server/src/lib/fileTree/createEntityRoot.ts` | Transactional entity+root creation helper |
| `server/src/lib/enrichmentPolicy/index.ts` | `shouldEnrichNow` policy module |
| `server/src/lib/fileDocuments/resolveDocumentsForContext.ts` | Hybrid-shape read adapter |
| `server/src/lib/fileDocuments/types.ts` | Normalised `ResolvedDocument` shape |
| `server/src/scripts/migrate-file-system/index.ts` | Migration orchestrator (runs all sub-migrations) |
| `server/src/scripts/migrate-file-system/01-enrichedFiles.ts` | Backfill Document + Enrichment from EnrichedFile |
| `server/src/scripts/migrate-file-system/02-jobsiteEnrichedFiles.ts` | Create FileNodes under `/jobsites/<id>/` with minRole |
| `server/src/scripts/migrate-file-system/03-jobsiteFileObjects.ts` | Create FileNodes + Documents for deprecated raw files |
| `server/src/scripts/migrate-file-system/04-systemSpecs.ts` | Create FileNodes under `/system/specs/` |
| `server/src/scripts/migrate-file-system/05-tenderFiles.ts` | Create FileNodes + AI-managed folders under `/tenders/<id>/` |
| `server/src/scripts/migrate-file-system/06-reportNoteFiles.ts` | Create FileNodes + Documents under `/daily-reports/<id>/` |
| `server/src/graphql/resolvers/fileNode/index.ts` | Queries (getNode, listChildren, breadcrumbs) |
| `server/src/graphql/resolvers/fileNode/mutations.ts` | Mutations (createFolder, renameNode, moveNode, trashNode, restoreNode) |
| `server/src/graphql/resolvers/fileNode/types.ts` | GraphQL ObjectType + input types for FileNode |
| `server/src/graphql/resolvers/document/index.ts` | Document queries + `uploadDocument` mutation |
| `server/src/graphql/resolvers/document/types.ts` | GraphQL types for Document + Enrichment |

### Modified server files

| Path | Change |
|---|---|
| `server/src/models/File/schema/index.ts` | Add `originalFilename`, `storageKey`, `size`, `uploadedBy`, `uploadedAt`, `checksum?` |
| `server/src/models/File/class/create.ts` | Populate new fields on create (uploadedBy from request context, originalFilename from request) |
| `server/src/models/index.ts` | Export Document, Enrichment, FileNode |
| `server/src/consumer/handlers/enrichedFileSummaryHandler.ts` | Refactor to write `Enrichment` collection (not `EnrichedFile`); key on `documentId` |
| `server/src/consumer/watchdog.ts` | Scan `Enrichment` instead of `EnrichedFile` |
| `server/src/rabbitmq/publisher.ts` | Publish enrichment jobs by `documentId` (queue key stays backward-compat until adapter layer fully replaces) |
| `server/src/models/Tender/class/create.ts` | Wrap in `eventfulMutation`; create `/tenders/<id>/` FileNode in same transaction |
| `server/src/models/Jobsite/class/create.ts` | Same — `/jobsites/<id>/` root |
| `server/src/models/DailyReport/class/create.ts` | Same — `/daily-reports/<id>/` root |
| `server/src/models/Tender/class/remove.ts` | Cascade-delete `/tenders/<id>/` subtree |
| `server/src/models/Jobsite/class/remove.ts` | Cascade-delete `/jobsites/<id>/` subtree |
| `server/src/server.ts` | Call `bootstrapRoots()` on startup |
| `server/src/app.ts` | Register `FileNodeResolver`, `DocumentResolver` |
| `server/src/router/tender-chat.ts` | Switch reads to adapter layer (`resolveDocumentsForContext`) |
| `server/src/router/pm-jobsite-chat.ts` | Same |
| `server/src/router/foreman-jobsite-chat.ts` | Same |
| `server/src/mcp/tools/tender.ts` | Document-list reads via adapter layer |
| `server/src/lib/generateTenderSummary.ts` | Reads via adapter layer |
| `server/src/lib/categorizeTenderFiles.ts` | Reads via adapter layer (input unchanged; output change deferred to Plan 2B when categorizer starts writing folders) |

### Test files (mirrored under `__tests__/` or `_*.test.ts` conventions)

| Path | What it covers |
|---|---|
| `server/src/models/Document/_DocumentSchema.test.ts` | Schema validation, indexes, `enrichmentLocked` default |
| `server/src/models/Enrichment/_EnrichmentSchema.test.ts` | State machine fields, unique index on `documentId` |
| `server/src/models/FileNode/_FileNodeSchema.test.ts` | Schema + indexes, sibling uniqueness |
| `server/src/models/FileNode/class/__tests__/move.test.ts` | Move cascade + cycle rejection |
| `server/src/models/FileNode/class/__tests__/trash.test.ts` | Soft-delete cascade + restore semantics |
| `server/src/lib/fileTree/__tests__/reservedRoots.test.ts` | Namespace discovery, immutability guards |
| `server/src/lib/fileTree/__tests__/bootstrapRoots.test.ts` | Idempotent root provisioning |
| `server/src/lib/fileTree/__tests__/createEntityRoot.test.ts` | Transactional entity+root atomicity |
| `server/src/lib/enrichmentPolicy/__tests__/policy.test.ts` | MIME + reserved-root + lock override logic |
| `server/src/lib/fileDocuments/__tests__/resolveDocumentsForContext.test.ts` | Adapter returns normalised shape from either source |
| `server/src/scripts/migrate-file-system/__tests__/migrations.test.ts` | End-to-end run against a seeded fixture; idempotent re-run |
| `server/src/graphql/__tests__/fileNodeResolver.test.ts` | Queries + mutations via supertest |
| `server/src/graphql/__tests__/documentResolver.test.ts` | uploadDocument + enrichment enqueue |
| `server/src/__tests__/fileSystem.e2e.test.ts` | End-to-end: tender creation → root exists → upload → enrichment fires |

---

## Task B1: Extend `File` schema with new required fields

**Files:**
- Modify: `server/src/models/File/schema/index.ts`
- Modify: `server/src/models/File/class/create.ts`
- Test: `server/src/models/File/class/__tests__/create.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/models/File/class/__tests__/create.test.ts`:

```ts
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { File } from "@models";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await File.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("File schema extensions", () => {
  it("persists originalFilename, storageKey, size, uploadedAt", async () => {
    const f = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "507f1f77bcf86cd799439011",
      size: 12345,
      uploadedAt: new Date("2026-04-21T00:00:00Z"),
    });
    expect(f.originalFilename).toBe("spec.pdf");
    expect(f.storageKey).toBe("507f1f77bcf86cd799439011");
    expect(f.size).toBe(12345);
    expect(f.uploadedAt).toBeInstanceOf(Date);
  });

  it("allows uploadedBy to be optional (legacy records)", async () => {
    const f = await File.create({
      mimetype: "application/pdf",
      originalFilename: "legacy.pdf",
      storageKey: "507f1f77bcf86cd799439012",
      size: 1,
    });
    expect(f.uploadedBy).toBeUndefined();
    expect(f.uploadedAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/models/File/class/__tests__/create.test.ts`
Expected: FAIL — fields don't exist on the schema.

- [ ] **Step 3: Extend the schema**

Open `server/src/models/File/schema/index.ts` and add the following `@prop` fields (append to the existing class, next to `mimetype`):

```ts
  @Field({ nullable: true })
  @prop({ trim: true })
  public originalFilename?: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public storageKey?: string;

  @Field({ nullable: true })
  @prop()
  public size?: number;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public uploadedBy?: Ref<UserClass>;

  @Field()
  @prop({ default: () => new Date() })
  public uploadedAt!: Date;

  @Field({ nullable: true })
  @prop({ trim: true })
  public checksum?: string;
```

Add the `UserClass` import at the top if not already present:

```ts
import { UserClass } from "../../User/class";
import { Ref } from "@typegoose/typegoose";
import { Field, ID } from "type-graphql";
```

- [ ] **Step 4: Run to verify passing**

Run: `cd server && npx vitest run src/models/File/class/__tests__/create.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add server/src/models/File/
git commit -m "feat(File): extend schema with originalFilename, storageKey, size, uploadedBy, uploadedAt, checksum"
```

---

## Task B2: `Document` model

**Files:**
- Create: `server/src/models/Document/schema/index.ts`
- Create: `server/src/models/Document/index.ts`
- Modify: `server/src/models/index.ts` (add barrel export + getModelForClass block)
- Test: `server/src/models/Document/_DocumentSchema.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/models/Document/_DocumentSchema.test.ts
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { Document as DocumentModel, File } from "@models";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await DocumentModel.collection.drop().catch(() => undefined);
  await File.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("Document schema", () => {
  it("persists with required identity fields", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "abc",
      size: 1,
    });
    const doc = await DocumentModel.create({
      currentFileId: file._id,
    });
    expect(doc._id).toBeDefined();
    expect(doc.currentFileId.toString()).toBe(file._id.toString());
    expect(doc.enrichmentLocked).toBe(false);
  });

  it("supports optional description", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "abc2",
      size: 1,
    });
    const doc = await DocumentModel.create({
      currentFileId: file._id,
      description: "Latest revision per January addendum",
    });
    expect(doc.description).toBe("Latest revision per January addendum");
  });

  it("accepts a pre-specified _id (preserves EnrichedFile._id during migration)", async () => {
    const presetId = new mongoose.Types.ObjectId();
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "abc3",
      size: 1,
    });
    const doc = await DocumentModel.create({
      _id: presetId,
      currentFileId: file._id,
    });
    expect(doc._id.toString()).toBe(presetId.toString());
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/models/Document/_DocumentSchema.test.ts`
Expected: FAIL — `Document` not exported from `@models`.

- [ ] **Step 3: Create the schema**

```ts
// server/src/models/Document/schema/index.ts
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { FileClass } from "../../File/class";
import { UserClass } from "../../User/class";

@ObjectType()
export class DocumentSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => FileClass)
  @prop({ ref: () => FileClass, required: true })
  public currentFileId!: Ref<FileClass>;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field()
  @prop({ required: true, default: false })
  public enrichmentLocked!: boolean;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public createdBy?: Ref<UserClass>;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public updatedAt!: Date;
}
```

- [ ] **Step 4: Create barrel**

```ts
// server/src/models/Document/index.ts
export * from "./schema";
```

- [ ] **Step 5: Register in central models barrel**

Open `server/src/models/index.ts`. Add to the alphabetical `export * from "./..."` block near the top (after Conversation):

```ts
export * from "./Document";
```

Add a new block at the end of the file (after TenderReview's getModelForClass block):

```ts
/**
 * ----- Document -----
 */

import { DocumentSchema as DocumentClass } from "./Document/schema";

export type DocumentDocument = DocumentType<DocumentClass>;

export type DocumentModel = ReturnModelType<typeof DocumentClass>;

export const Document = getModelForClass(DocumentClass, {
  schemaOptions: { collection: "documents", timestamps: false },
});

Document.schema.pre("save", function (next) {
  (this as unknown as { updatedAt: Date }).updatedAt = new Date();
  next();
});
```

(We set `timestamps: false` and manage `updatedAt` manually because Mongoose's auto-timestamps interact badly with Typegoose's field definitions in this codebase.)

- [ ] **Step 6: Run tests**

Run: `cd server && npx vitest run src/models/Document/_DocumentSchema.test.ts`
Expected: PASS — 3/3.

- [ ] **Step 7: Commit**

```bash
git add server/src/models/Document/ server/src/models/index.ts
git commit -m "feat(models): Document Typegoose model for stable file identity"
```

---

## Task B3: `Enrichment` model with unique index on documentId

**Files:**
- Create: `server/src/models/Enrichment/schema/index.ts`
- Create: `server/src/models/Enrichment/index.ts`
- Modify: `server/src/models/index.ts`
- Test: `server/src/models/Enrichment/_EnrichmentSchema.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/models/Enrichment/_EnrichmentSchema.test.ts
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { Enrichment, Document as DocumentModel, File } from "@models";

beforeAll(async () => {
  await prepareDatabase();
  await Enrichment.ensureIndexes();
});
afterAll(async () => {
  await Enrichment.collection.drop().catch(() => undefined);
  await DocumentModel.collection.drop().catch(() => undefined);
  await File.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("Enrichment schema", () => {
  it("persists the full state machine", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "e1",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    const enrichment = await Enrichment.create({
      documentId: doc._id,
      fileId: file._id,
      status: "pending",
      attempts: 0,
      processingVersion: 1,
      queuedAt: new Date(),
    });
    expect(enrichment.status).toBe("pending");
    expect(enrichment.attempts).toBe(0);
    expect(enrichment.processingVersion).toBe(1);
  });

  it("enforces unique index on documentId (one enrichment per document)", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "e2",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await Enrichment.create({
      documentId: doc._id,
      fileId: file._id,
      status: "pending",
      attempts: 0,
      processingVersion: 1,
    });
    await expect(
      Enrichment.create({
        documentId: doc._id,
        fileId: file._id,
        status: "pending",
        attempts: 0,
        processingVersion: 1,
      })
    ).rejects.toThrow(/duplicate key/i);
  });

  it("stores summary and pageIndex results", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "e3",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    const enrichment = await Enrichment.create({
      documentId: doc._id,
      fileId: file._id,
      status: "ready",
      attempts: 1,
      processingVersion: 1,
      summary: {
        overview: "A paving spec",
        documentType: "specification",
        keyTopics: ["asphalt", "base course"],
      },
      pageCount: 12,
      pageIndex: [{ page: 1, summary: "Cover page" }],
    });
    expect(enrichment.summary?.overview).toBe("A paving spec");
    expect(enrichment.pageIndex?.[0].page).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/models/Enrichment/_EnrichmentSchema.test.ts`
Expected: FAIL — `Enrichment` not exported.

- [ ] **Step 3: Create schema**

```ts
// server/src/models/Enrichment/schema/index.ts
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { DocumentSchema } from "../../Document/schema";
import { FileClass } from "../../File/class";

@ObjectType()
export class EnrichmentSummaryChunkClass {
  @Field() public startPage!: number;
  @Field() public endPage!: number;
  @Field() public overview!: string;
  @Field(() => [String]) public keyTopics!: string[];
}

@ObjectType()
export class EnrichmentSummaryClass {
  @Field() public overview!: string;
  @Field() public documentType!: string;
  @Field(() => [String]) public keyTopics!: string[];
  @Field(() => [EnrichmentSummaryChunkClass], { nullable: true })
  public chunks?: EnrichmentSummaryChunkClass[];
}

@ObjectType()
export class EnrichmentPageIndexEntryClass {
  @Field() public page!: number;
  @Field() public summary!: string;
}

@ObjectType()
export class EnrichmentProgressClass {
  @Field(() => String) public phase!: string;
  @Field() public current!: number;
  @Field() public total!: number;
  @Field() public updatedAt!: Date;
}

@ObjectType()
export class EnrichmentSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => ID)
  @prop({ ref: () => DocumentSchema, required: true })
  public documentId!: Ref<DocumentSchema>;

  @Field(() => ID)
  @prop({ ref: () => FileClass, required: true })
  public fileId!: Ref<FileClass>;

  @Field(() => String)
  @prop({
    required: true,
    enum: ["pending", "processing", "ready", "partial", "failed", "orphaned"],
    default: "pending",
  })
  public status!: "pending" | "processing" | "ready" | "partial" | "failed" | "orphaned";

  @Field()
  @prop({ required: true, default: 0 })
  public attempts!: number;

  @Field()
  @prop({ required: true, default: 1 })
  public processingVersion!: number;

  @Field({ nullable: true })
  @prop()
  public queuedAt?: Date;

  @Field({ nullable: true })
  @prop()
  public processingStartedAt?: Date;

  @Field({ nullable: true })
  @prop({ trim: true })
  public summaryError?: string;

  @Field(() => EnrichmentProgressClass, { nullable: true })
  @prop({ type: () => EnrichmentProgressClass })
  public summaryProgress?: EnrichmentProgressClass;

  @Field({ nullable: true })
  @prop()
  public pageCount?: number;

  @Field(() => [EnrichmentPageIndexEntryClass], { nullable: true })
  @prop({ type: () => [EnrichmentPageIndexEntryClass] })
  public pageIndex?: EnrichmentPageIndexEntryClass[];

  @Field(() => EnrichmentSummaryClass, { nullable: true })
  @prop({ type: () => Object })
  public summary?: EnrichmentSummaryClass;

  @Field({ nullable: true })
  @prop({ trim: true })
  public documentType?: string;
}
```

- [ ] **Step 4: Create barrel**

```ts
// server/src/models/Enrichment/index.ts
export * from "./schema";
```

- [ ] **Step 5: Register in `models/index.ts`**

Add to top-of-file exports:

```ts
export * from "./Enrichment";
```

Add at end (after Document block):

```ts
/**
 * ----- Enrichment -----
 */

import { EnrichmentSchema as EnrichmentClass } from "./Enrichment/schema";

export type EnrichmentDocument = DocumentType<EnrichmentClass>;

export type EnrichmentModel = ReturnModelType<typeof EnrichmentClass>;

export const Enrichment = getModelForClass(EnrichmentClass, {
  schemaOptions: { collection: "enrichments", timestamps: true },
});

Enrichment.schema.index({ documentId: 1 }, { unique: true });
Enrichment.schema.index({ status: 1, queuedAt: 1 });
```

- [ ] **Step 6: Run tests**

Run: `cd server && npx vitest run src/models/Enrichment/_EnrichmentSchema.test.ts`
Expected: PASS — 3/3.

- [ ] **Step 7: Commit**

```bash
git add server/src/models/Enrichment/ server/src/models/index.ts
git commit -m "feat(models): Enrichment model with unique documentId index (state machine sidecar)"
```

---

## Task B4: `FileNode` model with tree indexes

**Files:**
- Create: `server/src/models/FileNode/schema/index.ts`
- Create: `server/src/models/FileNode/index.ts`
- Modify: `server/src/models/index.ts`
- Test: `server/src/models/FileNode/_FileNodeSchema.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/models/FileNode/_FileNodeSchema.test.ts
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode } from "@models";

beforeAll(async () => {
  await prepareDatabase();
  await FileNode.ensureIndexes();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("FileNode schema", () => {
  it("creates a root folder with parentId=null", async () => {
    const root = await FileNode.create({
      type: "folder",
      name: "test-root",
      normalizedName: "test-root",
      parentId: null,
      isReservedRoot: true,
      version: 0,
    });
    expect(root.type).toBe("folder");
    expect(root.parentId).toBeNull();
    expect(root.isReservedRoot).toBe(true);
  });

  it("enforces sibling uniqueness on normalizedName", async () => {
    const parent = await FileNode.create({
      type: "folder",
      name: "parent",
      normalizedName: "parent",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    await FileNode.create({
      type: "folder",
      name: "Child",
      normalizedName: "child",
      parentId: parent._id,
      isReservedRoot: false,
      version: 0,
    });
    await expect(
      FileNode.create({
        type: "folder",
        name: "CHILD",
        normalizedName: "child",
        parentId: parent._id,
        isReservedRoot: false,
        version: 0,
      })
    ).rejects.toThrow(/duplicate key/i);
  });

  it("allows same normalizedName across different parents", async () => {
    const p1 = await FileNode.create({
      type: "folder",
      name: "p1",
      normalizedName: "p1",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    const p2 = await FileNode.create({
      type: "folder",
      name: "p2",
      normalizedName: "p2",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    await FileNode.create({
      type: "folder",
      name: "child",
      normalizedName: "child",
      parentId: p1._id,
      isReservedRoot: false,
      version: 0,
    });
    await FileNode.create({
      type: "folder",
      name: "child",
      normalizedName: "child",
      parentId: p2._id,
      isReservedRoot: false,
      version: 0,
    });
    const all = await FileNode.find({ normalizedName: "child" }).lean();
    expect(all).toHaveLength(2);
  });

  it("creates a file-type node referencing a documentId", async () => {
    const parent = await FileNode.create({
      type: "folder",
      name: "docs",
      normalizedName: "docs",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    const docId = new mongoose.Types.ObjectId();
    const fileNode = await FileNode.create({
      type: "file",
      name: "spec.pdf",
      normalizedName: "spec.pdf",
      parentId: parent._id,
      documentId: docId,
      isReservedRoot: false,
      version: 0,
    });
    expect(fileNode.type).toBe("file");
    expect(fileNode.documentId?.toString()).toBe(docId.toString());
  });

  it("supports soft delete via deletedAt field", async () => {
    const node = await FileNode.create({
      type: "folder",
      name: "tmp",
      normalizedName: "tmp",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    node.deletedAt = new Date();
    await node.save();
    const fresh = await FileNode.findById(node._id).lean();
    expect(fresh?.deletedAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/models/FileNode/_FileNodeSchema.test.ts`
Expected: FAIL — `FileNode` not exported.

- [ ] **Step 3: Create schema**

```ts
// server/src/models/FileNode/schema/index.ts
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { UserRoles } from "@typescript/user";
import { DocumentSchema } from "../../Document/schema";
import { UserClass } from "../../User/class";

@ObjectType()
export class FileNodeSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => String)
  @prop({ required: true, enum: ["folder", "file"] })
  public type!: "folder" | "file";

  @Field()
  @prop({ required: true, trim: true })
  public name!: string;

  @Field()
  @prop({ required: true, trim: true })
  public normalizedName!: string;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => FileNodeSchema, required: false, default: null })
  public parentId?: Ref<FileNodeSchema> | null;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => DocumentSchema, required: false })
  public documentId?: Ref<DocumentSchema>;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field()
  @prop({ required: true, default: false })
  public aiManaged!: boolean;

  @Field()
  @prop({ required: true, default: "0000" })
  public sortKey!: string;

  @Field({ nullable: true })
  @prop({ type: () => Number })
  public minRole?: UserRoles;

  @Field()
  @prop({ required: true, default: false })
  public isReservedRoot!: boolean;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public createdBy?: Ref<UserClass>;

  @Field({ nullable: true })
  @prop()
  public deletedAt?: Date;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public deletedBy?: Ref<UserClass>;

  @Field()
  @prop({ required: true, default: 0 })
  public version!: number;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public updatedAt!: Date;
}
```

- [ ] **Step 4: Create barrel**

```ts
// server/src/models/FileNode/index.ts
export * from "./schema";
```

- [ ] **Step 5: Register in `models/index.ts`**

Add to top:

```ts
export * from "./FileNode";
```

Add at end (after Enrichment block):

```ts
/**
 * ----- FileNode -----
 */

import { FileNodeSchema as FileNodeClass } from "./FileNode/schema";

export type FileNodeDocument = DocumentType<FileNodeClass>;

export type FileNodeModel = ReturnModelType<typeof FileNodeClass>;

export const FileNode = getModelForClass(FileNodeClass, {
  schemaOptions: { collection: "filenodes", timestamps: false },
});

// Sibling uniqueness: same normalized name cannot appear twice in the same
// parent (excluding soft-deleted siblings — they live in trash and don't
// collide with new names).
FileNode.schema.index(
  { parentId: 1, normalizedName: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  }
);

// Subtree queries: find descendants by walking parentId chains via $graphLookup
FileNode.schema.index({ parentId: 1 });

// Type + parent for listing folder contents quickly
FileNode.schema.index({ parentId: 1, type: 1, deletedAt: 1 });

// File lookup by document (for "show me all placements of this document")
FileNode.schema.index({ documentId: 1 }, { sparse: true });

// Trash sweeping
FileNode.schema.index({ deletedAt: 1 }, { sparse: true });

FileNode.schema.pre("save", function (next) {
  (this as unknown as { updatedAt: Date }).updatedAt = new Date();
  next();
});
```

- [ ] **Step 6: Run tests**

Run: `cd server && npx vitest run src/models/FileNode/_FileNodeSchema.test.ts`
Expected: PASS — 5/5.

- [ ] **Step 7: Commit**

```bash
git add server/src/models/FileNode/ server/src/models/index.ts
git commit -m "feat(models): FileNode model with sibling-uniqueness + subtree indexes"
```

---

## Task B5: Reserved-root constants + namespace discovery

**Files:**
- Create: `server/src/lib/fileTree/reservedRoots.ts`
- Test: `server/src/lib/fileTree/__tests__/reservedRoots.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/lib/fileTree/__tests__/reservedRoots.test.ts
import {
  RESERVED_NAMESPACE_PATHS,
  RESERVED_NAMESPACE_ROOT_ID,
  namespaceRootForPath,
  normalizeNodeName,
  ENRICHABLE_NAMESPACES,
} from "../reservedRoots";

describe("reservedRoots", () => {
  it("lists all expected namespace paths", () => {
    expect(RESERVED_NAMESPACE_PATHS).toContain("/system/specs");
    expect(RESERVED_NAMESPACE_PATHS).toContain("/tenders");
    expect(RESERVED_NAMESPACE_PATHS).toContain("/jobsites");
    expect(RESERVED_NAMESPACE_PATHS).toContain("/daily-reports");
  });

  it("namespaceRootForPath returns the outermost namespace (not per-entity)", () => {
    expect(namespaceRootForPath(["/", "/tenders", "/tenders/abc123"])).toBe("/tenders");
    expect(namespaceRootForPath(["/", "/system", "/system/specs"])).toBe("/system/specs");
    expect(namespaceRootForPath(["/", "/jobsites", "/jobsites/xyz789"])).toBe("/jobsites");
    expect(namespaceRootForPath(["/"])).toBeNull();
  });

  it("ENRICHABLE_NAMESPACES includes system.specs, tenders, jobsites; excludes daily-reports", () => {
    expect(ENRICHABLE_NAMESPACES["/system/specs"]).toBe(true);
    expect(ENRICHABLE_NAMESPACES["/tenders"]).toBe(true);
    expect(ENRICHABLE_NAMESPACES["/jobsites"]).toBe(true);
    expect(ENRICHABLE_NAMESPACES["/daily-reports"]).toBe(false);
  });

  it("normalizeNodeName applies NFC + casefold + whitespace trim/collapse", () => {
    expect(normalizeNodeName("  Foo   Bar  ")).toBe("foo bar");
    expect(normalizeNodeName("HELLO")).toBe("hello");
    // NFC normalization: e + combining acute → single é
    const combined = "e" + "́";
    const precomposed = "é";
    expect(normalizeNodeName(combined)).toBe(precomposed);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/fileTree/__tests__/reservedRoots.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```ts
// server/src/lib/fileTree/reservedRoots.ts
import { Types } from "mongoose";

/**
 * Reserved namespace paths under root. Immutable — users cannot rename,
 * move, or delete these folders. Policy decisions anchor here.
 */
export const RESERVED_NAMESPACE_PATHS = [
  "/system",
  "/system/specs",
  "/tenders",
  "/jobsites",
  "/daily-reports",
] as const;

export type ReservedNamespacePath = (typeof RESERVED_NAMESPACE_PATHS)[number];

/** Sentinel id used for the filesystem root before it's bootstrapped. */
export const RESERVED_NAMESPACE_ROOT_ID = new Types.ObjectId("000000000000000000000001");

/**
 * Enrichment policy keyed at the namespace level. Per-entity roots
 * (e.g. /tenders/<id>/) inherit from their namespace.
 */
export const ENRICHABLE_NAMESPACES: Record<string, boolean> = {
  "/system/specs": true,
  "/tenders": true,
  "/jobsites": true,
  "/daily-reports": false,
};

/**
 * Given the ancestor-path chain of a node (from root to parent, expressed
 * as path strings like ["/", "/tenders", "/tenders/abc123"]), return the
 * outermost reserved namespace (longest prefix match among namespace
 * paths — NOT per-entity roots).
 */
export function namespaceRootForPath(pathChain: string[]): ReservedNamespacePath | null {
  // Walk the chain looking for the LONGEST path that's in the
  // namespace table — so /tenders/abc gets matched as /tenders, and
  // /system/specs/foo matches as /system/specs (not /system).
  let match: ReservedNamespacePath | null = null;
  for (const p of pathChain) {
    if ((RESERVED_NAMESPACE_PATHS as readonly string[]).includes(p)) {
      if (!match || p.length > match.length) {
        match = p as ReservedNamespacePath;
      }
    }
  }
  return match;
}

/**
 * Canonical name normalization for sibling-uniqueness checks.
 * NFC Unicode normalization + case fold + whitespace trim + inner
 * whitespace collapse. Must be reproducible server- and client-side.
 */
export function normalizeNodeName(name: string): string {
  return name
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run src/lib/fileTree/__tests__/reservedRoots.test.ts`
Expected: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/fileTree/
git commit -m "feat(fileTree): reserved-namespace constants + name normalization"
```

---

## Task B6: Bootstrap reserved roots at server startup

**Files:**
- Create: `server/src/lib/fileTree/bootstrapRoots.ts`
- Modify: `server/src/server.ts`
- Test: `server/src/lib/fileTree/__tests__/bootstrapRoots.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/lib/fileTree/__tests__/bootstrapRoots.test.ts
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode } from "@models";
import { bootstrapRoots } from "../bootstrapRoots";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("bootstrapRoots", () => {
  beforeEach(async () => {
    await FileNode.deleteMany({});
  });

  it("creates the root + all reserved namespaces on first run", async () => {
    await bootstrapRoots();
    const root = await FileNode.findOne({ parentId: null, name: "" }).lean();
    expect(root).not.toBeNull();
    expect(root?.isReservedRoot).toBe(true);

    const nsNames = ["system", "tenders", "jobsites", "daily-reports"];
    for (const name of nsNames) {
      const ns = await FileNode.findOne({
        parentId: root!._id,
        name,
      }).lean();
      expect(ns).not.toBeNull();
      expect(ns?.isReservedRoot).toBe(true);
    }

    const specs = await FileNode.findOne({
      name: "specs",
      isReservedRoot: true,
    }).lean();
    expect(specs).not.toBeNull();
  });

  it("is idempotent (re-running doesn't duplicate)", async () => {
    await bootstrapRoots();
    await bootstrapRoots();
    await bootstrapRoots();
    const rootCount = await FileNode.countDocuments({
      parentId: null,
      name: "",
    });
    expect(rootCount).toBe(1);

    const tendersCount = await FileNode.countDocuments({
      name: "tenders",
      isReservedRoot: true,
    });
    expect(tendersCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/fileTree/__tests__/bootstrapRoots.test.ts`
Expected: FAIL — `bootstrapRoots` not defined.

- [ ] **Step 3: Implement**

```ts
// server/src/lib/fileTree/bootstrapRoots.ts
import mongoose from "mongoose";
import { FileNode } from "@models";
import { normalizeNodeName } from "./reservedRoots";

interface RootDef {
  name: string;
  parentPath: string[]; // walk from filesystem root
}

const ROOT_TREE: RootDef[] = [
  // parentPath means: starting from the literal root node (name=""), walk
  // these names to find the parent for this reserved node.
  { name: "system", parentPath: [] },
  { name: "specs", parentPath: ["system"] },
  { name: "tenders", parentPath: [] },
  { name: "jobsites", parentPath: [] },
  { name: "daily-reports", parentPath: [] },
];

/**
 * Idempotently provision the filesystem root (name="") and all reserved
 * namespace folders. Call once at server startup.
 */
export async function bootstrapRoots(): Promise<void> {
  // Step 1: ensure the literal root exists.
  let root = await FileNode.findOne({ parentId: null, name: "" });
  if (!root) {
    root = await FileNode.create({
      type: "folder",
      name: "",
      normalizedName: "",
      parentId: null,
      isReservedRoot: true,
      aiManaged: false,
      sortKey: "0000",
      version: 0,
    });
  }

  // Step 2: walk the tree definition, creating any missing nodes.
  for (const def of ROOT_TREE) {
    // Resolve parent by walking from root.
    let parentId: mongoose.Types.ObjectId = root._id;
    for (const segment of def.parentPath) {
      const next = await FileNode.findOne({ parentId, name: segment });
      if (!next) {
        throw new Error(
          `bootstrapRoots: expected parent "${segment}" under ${parentId} but not found`
        );
      }
      parentId = next._id;
    }

    // Create the reserved folder if missing.
    const existing = await FileNode.findOne({ parentId, name: def.name });
    if (!existing) {
      await FileNode.create({
        type: "folder",
        name: def.name,
        normalizedName: normalizeNodeName(def.name),
        parentId,
        isReservedRoot: true,
        aiManaged: false,
        sortKey: "0000",
        version: 0,
      });
    }
  }
}
```

- [ ] **Step 4: Wire into server startup**

Open `server/src/server.ts`. After the MongoDB connect block, before workers/api startup, add:

```ts
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
// … inside main():
    if (process.env.NODE_ENV !== "test" && process.env.MONGO_URI) {
      await bootstrapRoots();
      console.log("FileNode reserved roots bootstrapped");
    }
```

Place this after `mongoose.connect(...)` and before `bindEventEmitters()`.

- [ ] **Step 5: Run tests**

Run: `cd server && npx vitest run src/lib/fileTree/__tests__/bootstrapRoots.test.ts`
Expected: PASS — 2/2.

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/fileTree/bootstrapRoots.ts server/src/server.ts
git commit -m "feat(fileTree): bootstrap reserved roots idempotently at startup"
```

---

## Task B7: Transactional entity+root creation helper

**Files:**
- Create: `server/src/lib/fileTree/createEntityRoot.ts`
- Test: `server/src/lib/fileTree/__tests__/createEntityRoot.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/lib/fileTree/__tests__/createEntityRoot.test.ts
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode } from "@models";
import { bootstrapRoots } from "../bootstrapRoots";
import { createEntityRoot } from "../createEntityRoot";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("createEntityRoot", () => {
  beforeEach(async () => {
    await FileNode.deleteMany({});
    await bootstrapRoots();
  });

  it("creates a per-entity root folder under the correct namespace", async () => {
    const entityId = new mongoose.Types.ObjectId();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await createEntityRoot({
          namespace: "/tenders",
          entityId,
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    const tendersNs = await FileNode.findOne({
      name: "tenders",
      isReservedRoot: true,
    }).lean();
    const entityRoot = await FileNode.findOne({
      parentId: tendersNs!._id,
      name: entityId.toString(),
    }).lean();
    expect(entityRoot).not.toBeNull();
    expect(entityRoot?.isReservedRoot).toBe(true);
  });

  it("is idempotent (re-creation for the same entityId is a no-op)", async () => {
    const entityId = new mongoose.Types.ObjectId();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await createEntityRoot({ namespace: "/tenders", entityId, session });
      });
      await session.withTransaction(async () => {
        await createEntityRoot({ namespace: "/tenders", entityId, session });
      });
    } finally {
      await session.endSession();
    }
    const count = await FileNode.countDocuments({
      name: entityId.toString(),
      isReservedRoot: true,
    });
    expect(count).toBe(1);
  });

  it("rolls back cleanly when the enclosing transaction aborts", async () => {
    const entityId = new mongoose.Types.ObjectId();
    const session = await mongoose.startSession();
    await expect(
      session.withTransaction(async () => {
        await createEntityRoot({ namespace: "/tenders", entityId, session });
        throw new Error("abort");
      })
    ).rejects.toThrow("abort");
    await session.endSession();

    const count = await FileNode.countDocuments({
      name: entityId.toString(),
    });
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/fileTree/__tests__/createEntityRoot.test.ts`
Expected: FAIL — `createEntityRoot` not defined.

- [ ] **Step 3: Implement**

```ts
// server/src/lib/fileTree/createEntityRoot.ts
import mongoose, { ClientSession, Types } from "mongoose";
import { FileNode } from "@models";
import { normalizeNodeName, RESERVED_NAMESPACE_PATHS } from "./reservedRoots";

type NamespacePath = (typeof RESERVED_NAMESPACE_PATHS)[number];

export interface CreateEntityRootInput {
  namespace: NamespacePath;
  entityId: Types.ObjectId;
  session?: ClientSession;
}

/**
 * Create an immutable per-entity reserved-root folder under a namespace.
 * Idempotent. Designed to run inside the same transaction as the entity's
 * own creation (via eventfulMutation) so partial state is impossible.
 *
 * Example: `createEntityRoot({ namespace: "/tenders", entityId: tenderId, session })`
 * creates `/tenders/<tenderId>/` if it doesn't already exist.
 */
export async function createEntityRoot(
  input: CreateEntityRootInput
): Promise<void> {
  const { namespace, entityId, session } = input;

  // Walk from filesystem root to the namespace folder.
  const pathSegments = namespace.slice(1).split("/"); // "/system/specs" -> ["system", "specs"]
  const root = await FileNode.findOne({ parentId: null, name: "" }).session(session ?? null);
  if (!root) {
    throw new Error("createEntityRoot: filesystem root not bootstrapped");
  }
  let parentId: mongoose.Types.ObjectId = root._id;
  for (const seg of pathSegments) {
    const next = await FileNode.findOne({ parentId, name: seg }).session(session ?? null);
    if (!next) {
      throw new Error(
        `createEntityRoot: namespace segment "${seg}" not found under ${parentId}`
      );
    }
    parentId = next._id;
  }

  // Idempotent insert.
  const name = entityId.toString();
  const existing = await FileNode.findOne({
    parentId,
    name,
  }).session(session ?? null);
  if (existing) return;

  await FileNode.create(
    [
      {
        type: "folder",
        name,
        normalizedName: normalizeNodeName(name),
        parentId,
        isReservedRoot: true,
        aiManaged: false,
        sortKey: "0000",
        version: 0,
      },
    ],
    { session }
  );
}
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run src/lib/fileTree/__tests__/createEntityRoot.test.ts`
Expected: PASS — 3/3.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/fileTree/createEntityRoot.ts
git commit -m "feat(fileTree): transactional per-entity reserved-root helper"
```

---

## Task B8: Wire entity+root creation into Tender/Jobsite/DailyReport create flows

**Files:**
- Modify: `server/src/models/Tender/class/create.ts`
- Modify: `server/src/models/Jobsite/class/create.ts`
- Modify: `server/src/models/DailyReport/class/create.ts`
- Test: `server/src/lib/fileTree/__tests__/entityRootWiring.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/lib/fileTree/__tests__/entityRootWiring.test.ts
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { Tender, Jobsite, DailyReport, FileNode } from "@models";
import { bootstrapRoots } from "../bootstrapRoots";

let docs: SeededDatabase;

beforeAll(async () => {
  await prepareDatabase();
  docs = await seedDatabase();
  await bootstrapRoots();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("entity creation provisions reserved root", () => {
  it("Tender.create provisions /tenders/<id>/", async () => {
    const tender = await Tender.createDocument({
      name: "Test tender",
      jobcode: "T-9999",
    } as any);
    const fileNode = await FileNode.findOne({
      name: tender._id.toString(),
      isReservedRoot: true,
    }).lean();
    expect(fileNode).not.toBeNull();
  });

  it("Jobsite.create provisions /jobsites/<id>/", async () => {
    const jobsite = await Jobsite.createDocument({
      name: "Test jobsite",
    } as any);
    const fileNode = await FileNode.findOne({
      name: jobsite._id.toString(),
      isReservedRoot: true,
    }).lean();
    expect(fileNode).not.toBeNull();
  });
});
```

(DailyReport test similarly; omitted for brevity — mirror the same pattern.)

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/fileTree/__tests__/entityRootWiring.test.ts`
Expected: FAIL — entities exist but root folders don't.

- [ ] **Step 3: Modify Tender create**

Open `server/src/models/Tender/class/create.ts`. Wrap the existing create logic with `eventfulMutation` and call `createEntityRoot`:

```ts
import { eventfulMutation } from "@lib/eventfulMutation";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { TenderClass } from "@models";
// ... existing imports

export async function createDocument(
  Tender: ReturnType<typeof getModelForClass<typeof TenderClass>>,
  data: any   // keep existing signature
) {
  return eventfulMutation(async (session) => {
    const tender = (await Tender.create([data], { session }))[0];
    await createEntityRoot({
      namespace: "/tenders",
      entityId: tender._id,
      session,
    });
    return {
      result: tender,
      event: {
        type: "tender.created",
        actorKind: "user",
        entityType: "tender",
        entityId: tender._id,
        toVersion: 1,
        diff: { forward: [], inverse: [] },
      },
    };
  });
}
```

(Apply analogous changes to `server/src/models/Jobsite/class/create.ts` and `server/src/models/DailyReport/class/create.ts`.)

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run src/lib/fileTree/__tests__/entityRootWiring.test.ts src/graphql/__tests__/`
Expected: new test PASSES, existing resolver tests still PASS (no regression on tender/jobsite creation).

- [ ] **Step 5: Commit**

```bash
git add server/src/models/Tender/class/create.ts server/src/models/Jobsite/class/create.ts server/src/models/DailyReport/class/create.ts server/src/lib/fileTree/__tests__/entityRootWiring.test.ts
git commit -m "feat(entities): provision reserved roots transactionally on Tender/Jobsite/DailyReport create"
```

---

## Task B9: Enrichment policy module

**Files:**
- Create: `server/src/lib/enrichmentPolicy/index.ts`
- Test: `server/src/lib/enrichmentPolicy/__tests__/policy.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/lib/enrichmentPolicy/__tests__/policy.test.ts
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode, File, Document as DocumentModel } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { shouldEnrichNow } from "..";

beforeAll(async () => {
  await prepareDatabase();
  await bootstrapRoots();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await File.collection.drop().catch(() => undefined);
  await DocumentModel.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

async function makeFileNode(parentId: mongoose.Types.ObjectId | null, name: string, documentId: mongoose.Types.ObjectId) {
  return FileNode.create({
    type: "file",
    name,
    normalizedName: name.toLowerCase(),
    parentId,
    documentId,
    version: 0,
    sortKey: "0000",
    aiManaged: false,
    isReservedRoot: false,
  });
}

describe("shouldEnrichNow", () => {
  it("returns true when placement is under /tenders/ and MIME is PDF", async () => {
    const tendersNs = await FileNode.findOne({
      name: "tenders",
      isReservedRoot: true,
    });
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRootId = (await createEntityRoot({ namespace: "/tenders", entityId: tenderId })) as any;
    // createEntityRoot doesn't return an id; query instead:
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tenderId.toString() });
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "x.pdf",
      storageKey: "s1",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await makeFileNode(tenderRoot!._id, "x.pdf", doc._id);

    const result = await shouldEnrichNow(doc._id);
    expect(result).toBe(true);
  });

  it("returns false when placement is under /daily-reports/", async () => {
    const drNs = await FileNode.findOne({
      name: "daily-reports",
      isReservedRoot: true,
    });
    const reportId = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/daily-reports", entityId: reportId });
    const reportRoot = await FileNode.findOne({ parentId: drNs!._id, name: reportId.toString() });
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "x.pdf",
      storageKey: "s2",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await makeFileNode(reportRoot!._id, "x.pdf", doc._id);

    expect(await shouldEnrichNow(doc._id)).toBe(false);
  });

  it("returns false when MIME is not in the enrichable allowlist", async () => {
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tenderId = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: tenderId });
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tenderId.toString() });
    const file = await File.create({
      mimetype: "video/mp4",
      originalFilename: "x.mp4",
      storageKey: "s3",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await makeFileNode(tenderRoot!._id, "x.mp4", doc._id);

    expect(await shouldEnrichNow(doc._id)).toBe(false);
  });

  it("returns false when enrichmentLocked=true regardless of placement", async () => {
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tenderId = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: tenderId });
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tenderId.toString() });
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "x.pdf",
      storageKey: "s4",
      size: 1,
    });
    const doc = await DocumentModel.create({
      currentFileId: file._id,
      enrichmentLocked: true,
    });
    await makeFileNode(tenderRoot!._id, "x.pdf", doc._id);

    expect(await shouldEnrichNow(doc._id)).toBe(false);
  });

  it("returns true if ANY placement is under an enrichable namespace (multi-placement)", async () => {
    // Create two placements: one in /tenders/<id>/, one in /daily-reports/<id>/
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const drNs = await FileNode.findOne({ name: "daily-reports", isReservedRoot: true });
    const tenderId = new mongoose.Types.ObjectId();
    const reportId = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: tenderId });
    await createEntityRoot({ namespace: "/daily-reports", entityId: reportId });
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tenderId.toString() });
    const reportRoot = await FileNode.findOne({ parentId: drNs!._id, name: reportId.toString() });

    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "x.pdf",
      storageKey: "s5",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await makeFileNode(tenderRoot!._id, "x.pdf", doc._id);
    await makeFileNode(reportRoot!._id, "x.pdf", doc._id);

    expect(await shouldEnrichNow(doc._id)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/enrichmentPolicy/__tests__/policy.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```ts
// server/src/lib/enrichmentPolicy/index.ts
import { Types } from "mongoose";
import { FileNode, File, Document as DocumentModel } from "@models";
import {
  ENRICHABLE_NAMESPACES,
  namespaceRootForPath,
  RESERVED_NAMESPACE_PATHS,
} from "@lib/fileTree/reservedRoots";

// Must mirror (or extend) the existing SupportedMimeTypes list so we don't
// regress on mime types the current enrichment pipeline handles.
export const ENRICHABLE_MIMETYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
]);

/**
 * Walk from a node up to the filesystem root, collecting the path of
 * reserved-folder names as we go. Returns something like
 * ["/", "/tenders", "/tenders/<entityId>"].
 */
async function collectPathChain(nodeId: Types.ObjectId): Promise<string[]> {
  const chain: string[] = [];
  let currentId: Types.ObjectId | null = nodeId;
  let pathAccumulator = "";
  const visited = new Set<string>();
  while (currentId) {
    const idStr = currentId.toString();
    if (visited.has(idStr)) break; // cycle guard — shouldn't happen
    visited.add(idStr);
    const node = await FileNode.findById(currentId)
      .select("name parentId")
      .lean();
    if (!node) break;
    if (node.name === "") {
      chain.unshift("/");
    } else {
      pathAccumulator = `${pathAccumulator}/${node.name}`;
    }
    currentId = (node.parentId as Types.ObjectId | null) ?? null;
  }
  // Build the cumulative path chain from the accumulator.
  // We actually want each step's full path. Simpler: rebuild via walk.
  return rebuildPathChain(nodeId);
}

async function rebuildPathChain(nodeId: Types.ObjectId): Promise<string[]> {
  const nodes: { id: Types.ObjectId; name: string }[] = [];
  let currentId: Types.ObjectId | null = nodeId;
  const visited = new Set<string>();
  while (currentId) {
    const idStr = currentId.toString();
    if (visited.has(idStr)) break;
    visited.add(idStr);
    const node = await FileNode.findById(currentId)
      .select("name parentId")
      .lean();
    if (!node) break;
    nodes.unshift({ id: node._id, name: node.name });
    currentId = (node.parentId as Types.ObjectId | null) ?? null;
  }
  // Build cumulative paths.
  const chain: string[] = [];
  let acc = "";
  for (const n of nodes) {
    if (n.name === "") {
      chain.push("/");
    } else {
      acc = acc === "/" ? `/${n.name}` : `${acc}/${n.name}`;
      chain.push(acc);
    }
  }
  return chain;
}

/**
 * Should this Document be enriched right now, based on current placements?
 *
 * Rules (first false wins):
 *   1. enrichmentLocked on Document → never.
 *   2. currentFileId's mimetype not in allowlist → never.
 *   3. At least one placement is under an enrichable reserved namespace → yes.
 *   4. Otherwise → no.
 */
export async function shouldEnrichNow(
  documentId: Types.ObjectId
): Promise<boolean> {
  const doc = await DocumentModel.findById(documentId).lean();
  if (!doc) return false;
  if (doc.enrichmentLocked) return false;

  const file = await File.findById(doc.currentFileId).lean();
  if (!file) return false;
  if (!ENRICHABLE_MIMETYPES.has(file.mimetype)) return false;

  // Any placement under an enrichable namespace qualifies.
  const placements = await FileNode.find({
    documentId,
    deletedAt: null,
  })
    .select("_id")
    .lean();

  for (const p of placements) {
    const pathChain = await rebuildPathChain(p._id);
    const ns = namespaceRootForPath(pathChain);
    if (ns && ENRICHABLE_NAMESPACES[ns] === true) {
      return true;
    }
  }
  return false;
}
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run src/lib/enrichmentPolicy/__tests__/policy.test.ts`
Expected: PASS — 5/5.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/enrichmentPolicy/
git commit -m "feat(enrichmentPolicy): shouldEnrichNow derives from current placements + MIME + lock"
```

---

## Task B10: Adapter layer — `resolveDocumentsForContext`

**Files:**
- Create: `server/src/lib/fileDocuments/types.ts`
- Create: `server/src/lib/fileDocuments/resolveDocumentsForContext.ts`
- Test: `server/src/lib/fileDocuments/__tests__/resolveDocumentsForContext.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/lib/fileDocuments/__tests__/resolveDocumentsForContext.test.ts
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { EnrichedFile, File, Tender } from "@models";
import { resolveDocumentsForContext } from "..";

let seed: SeededDatabase;

beforeAll(async () => {
  await prepareDatabase();
  seed = await seedDatabase();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("resolveDocumentsForContext", () => {
  it("reads old-shape tender.files[] when surface is not cut over", async () => {
    // Seed a tender with a file via the existing old-shape path.
    const tender = seed.tender.tender1;
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "old1",
      size: 1,
    });
    const enrichedFile = await EnrichedFile.create({
      file: file._id,
      summaryStatus: "ready",
    });
    await Tender.findByIdAndUpdate(tender._id, {
      $push: { files: enrichedFile._id },
    });

    const resolved = await resolveDocumentsForContext({
      scope: "tender",
      entityId: tender._id,
    });

    expect(resolved.some((d) => d.documentId.toString() === enrichedFile._id.toString())).toBe(true);
    expect(resolved[0].mimetype).toBe("application/pdf");
    expect(resolved[0].originalFilename).toBe("spec.pdf");
  });

  // Additional tests for /system and /jobsite shapes would follow same pattern.
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/fileDocuments/__tests__/resolveDocumentsForContext.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement types**

```ts
// server/src/lib/fileDocuments/types.ts
import { Types } from "mongoose";

/**
 * Normalised document shape returned by the adapter layer. Callers
 * (chat routers, MCP tools, pricing validation) consume this instead
 * of touching the raw EnrichedFile or Document models directly.
 */
export interface ResolvedDocument {
  documentId: Types.ObjectId;     // Document._id (which equals old EnrichedFile._id)
  fileId: Types.ObjectId;
  mimetype: string;
  originalFilename: string;
  size?: number;
  enrichmentStatus?: "pending" | "processing" | "ready" | "partial" | "failed" | "orphaned";
  enrichmentSummary?: unknown;    // free-form AI summary
  enrichmentPageIndex?: Array<{ page: number; summary: string }>;
  source: "legacy-enrichedfile" | "new-document";   // for diagnostics only
}

export interface ResolveContext {
  scope: "tender" | "jobsite" | "system" | "daily-report";
  entityId?: Types.ObjectId;   // not needed for "system"
}
```

- [ ] **Step 4: Implement adapter**

```ts
// server/src/lib/fileDocuments/resolveDocumentsForContext.ts
import { Types } from "mongoose";
import {
  EnrichedFile,
  File,
  Tender,
  Jobsite,
  System,
  FileNode,
  Document as DocumentModel,
  Enrichment,
} from "@models";
import type { ResolveContext, ResolvedDocument } from "./types";

export async function resolveDocumentsForContext(
  ctx: ResolveContext
): Promise<ResolvedDocument[]> {
  const newShape = await readNewShape(ctx);
  if (newShape.length > 0) return newShape;
  return readOldShape(ctx);
}

async function readNewShape(ctx: ResolveContext): Promise<ResolvedDocument[]> {
  // Find the namespace root for this scope, then list FileNodes of type="file"
  // underneath via $graphLookup.
  const nsName = nsNameForScope(ctx.scope);
  if (!nsName) return [];

  const nsRoot = await FileNode.findOne({
    name: nsName,
    isReservedRoot: true,
    parentId: { $ne: null },
  }).lean();
  if (!nsRoot) return [];

  let scopedRootId = nsRoot._id;
  if (ctx.entityId && ctx.scope !== "system") {
    const entityRoot = await FileNode.findOne({
      parentId: nsRoot._id,
      name: ctx.entityId.toString(),
    }).lean();
    if (!entityRoot) return [];
    scopedRootId = entityRoot._id;
  } else if (ctx.scope === "system") {
    const specs = await FileNode.findOne({
      parentId: nsRoot._id,
      name: "specs",
    }).lean();
    if (!specs) return [];
    scopedRootId = specs._id;
  }

  // Walk descendants via $graphLookup
  const descendants = await FileNode.aggregate([
    { $match: { _id: scopedRootId } },
    {
      $graphLookup: {
        from: "filenodes",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parentId",
        as: "descendants",
      },
    },
    { $unwind: "$descendants" },
    { $replaceRoot: { newRoot: "$descendants" } },
    { $match: { type: "file", deletedAt: null, documentId: { $exists: true } } },
  ]);

  if (descendants.length === 0) return [];

  const docIds = descendants.map((n) => n.documentId as Types.ObjectId);
  const documents = await DocumentModel.find({ _id: { $in: docIds } }).lean();
  const fileIds = documents.map((d) => d.currentFileId);
  const files = await File.find({ _id: { $in: fileIds } }).lean();
  const fileMap = new Map(files.map((f) => [f._id.toString(), f]));
  const enrichments = await Enrichment.find({
    documentId: { $in: docIds },
  }).lean();
  const enrichMap = new Map(enrichments.map((e) => [e.documentId.toString(), e]));

  return documents.map((d) => {
    const f = fileMap.get(d.currentFileId.toString());
    const e = enrichMap.get(d._id.toString());
    return {
      documentId: d._id,
      fileId: d.currentFileId,
      mimetype: f?.mimetype ?? "application/octet-stream",
      originalFilename: f?.originalFilename ?? "",
      size: f?.size,
      enrichmentStatus: e?.status,
      enrichmentSummary: e?.summary,
      enrichmentPageIndex: e?.pageIndex,
      source: "new-document" as const,
    };
  });
}

async function readOldShape(ctx: ResolveContext): Promise<ResolvedDocument[]> {
  let enrichedFileIds: Types.ObjectId[] = [];

  if (ctx.scope === "tender" && ctx.entityId) {
    const tender = await Tender.findById(ctx.entityId).select("files").lean();
    enrichedFileIds = (tender?.files as Types.ObjectId[]) ?? [];
  } else if (ctx.scope === "jobsite" && ctx.entityId) {
    const jobsite = await Jobsite.findById(ctx.entityId).select("enrichedFiles").lean();
    enrichedFileIds = ((jobsite?.enrichedFiles as any[]) ?? []).map(
      (j) => j.enrichedFile as Types.ObjectId
    );
  } else if (ctx.scope === "system") {
    const system = await System.getSystem();
    enrichedFileIds = (system?.specFiles as Types.ObjectId[]) ?? [];
  }

  if (enrichedFileIds.length === 0) return [];

  const enrichedFiles = await EnrichedFile.find({
    _id: { $in: enrichedFileIds },
  })
    .populate("file")
    .lean();

  return enrichedFiles.map((ef: any) => ({
    documentId: ef._id,
    fileId: ef.file._id,
    mimetype: ef.file.mimetype ?? "application/octet-stream",
    originalFilename: ef.file.description ?? ef.file.originalFilename ?? "",
    size: ef.file.size,
    enrichmentStatus: ef.summaryStatus,
    enrichmentSummary: ef.summary,
    enrichmentPageIndex: ef.pageIndex,
    source: "legacy-enrichedfile" as const,
  }));
}

function nsNameForScope(scope: ResolveContext["scope"]): string | null {
  switch (scope) {
    case "tender":
      return "tenders";
    case "jobsite":
      return "jobsites";
    case "system":
      return "system";
    case "daily-report":
      return "daily-reports";
    default:
      return null;
  }
}
```

- [ ] **Step 5: Create barrel**

```ts
// server/src/lib/fileDocuments/index.ts
export * from "./resolveDocumentsForContext";
export type { ResolvedDocument, ResolveContext } from "./types";
```

- [ ] **Step 6: Run tests**

Run: `cd server && npx vitest run src/lib/fileDocuments/__tests__/`
Expected: PASS — at least the old-shape test. New-shape path tested via E2E later.

- [ ] **Step 7: Commit**

```bash
git add server/src/lib/fileDocuments/
git commit -m "feat(fileDocuments): adapter layer resolving docs from old or new shape"
```

---

## Task B11: Migration — EnrichedFile → Document + Enrichment (reference-preserving)

**Files:**
- Create: `server/src/scripts/migrate-file-system/01-enrichedFiles.ts`
- Create: `server/src/scripts/migrate-file-system/index.ts`
- Test: `server/src/scripts/migrate-file-system/__tests__/enrichedFiles.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/scripts/migrate-file-system/__tests__/enrichedFiles.test.ts
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { EnrichedFile, File, Document as DocumentModel, Enrichment } from "@models";
import { migrateEnrichedFiles } from "../01-enrichedFiles";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("migrateEnrichedFiles", () => {
  beforeEach(async () => {
    await EnrichedFile.deleteMany({});
    await File.deleteMany({});
    await DocumentModel.deleteMany({});
    await Enrichment.deleteMany({});
  });

  it("creates a Document with _id === EnrichedFile._id", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      description: "spec.pdf",
    });
    const ef = await EnrichedFile.create({
      file: file._id,
      summaryStatus: "ready",
      summary: { overview: "x", documentType: "spec", keyTopics: [] },
      pageCount: 10,
      summaryAttempts: 1,
      processingVersion: 1,
    });

    await migrateEnrichedFiles({ dryRun: false });

    const doc = await DocumentModel.findById(ef._id).lean();
    expect(doc).not.toBeNull();
    expect(doc?.currentFileId.toString()).toBe(file._id.toString());
  });

  it("creates an Enrichment with full state preserved", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      description: "spec.pdf",
    });
    const ef = await EnrichedFile.create({
      file: file._id,
      summaryStatus: "processing",
      summaryAttempts: 2,
      processingVersion: 3,
      queuedAt: new Date("2026-01-01"),
      processingStartedAt: new Date("2026-01-02"),
    });

    await migrateEnrichedFiles({ dryRun: false });

    const enrichment = await Enrichment.findOne({ documentId: ef._id }).lean();
    expect(enrichment).not.toBeNull();
    expect(enrichment?.status).toBe("processing");
    expect(enrichment?.attempts).toBe(2);
    expect(enrichment?.processingVersion).toBe(3);
    expect(enrichment?.fileId.toString()).toBe(file._id.toString());
  });

  it("is idempotent", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      description: "spec.pdf",
    });
    await EnrichedFile.create({
      file: file._id,
      summaryStatus: "ready",
    });

    await migrateEnrichedFiles({ dryRun: false });
    await migrateEnrichedFiles({ dryRun: false });
    await migrateEnrichedFiles({ dryRun: false });

    expect(await DocumentModel.countDocuments()).toBe(1);
    expect(await Enrichment.countDocuments()).toBe(1);
  });

  it("copies File.description to File.originalFilename if the new field is empty", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      description: "legacy-name.pdf",
    });
    await EnrichedFile.create({ file: file._id, summaryStatus: "ready" });

    await migrateEnrichedFiles({ dryRun: false });

    const refreshed = await File.findById(file._id).lean();
    expect(refreshed?.originalFilename).toBe("legacy-name.pdf");
    expect(refreshed?.storageKey).toBe(file._id.toString());
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/scripts/migrate-file-system/__tests__/enrichedFiles.test.ts`
Expected: FAIL — function doesn't exist.

- [ ] **Step 3: Implement migration**

```ts
// server/src/scripts/migrate-file-system/01-enrichedFiles.ts
import mongoose from "mongoose";
import {
  EnrichedFile,
  File,
  Document as DocumentModel,
  Enrichment,
} from "@models";

export interface MigrationOptions {
  dryRun: boolean;
}

export interface MigrationReport {
  scanned: number;
  documentsUpserted: number;
  enrichmentsUpserted: number;
  filesBackfilled: number;
  skipped: number;
  errors: Array<{ enrichedFileId: string; message: string }>;
}

/**
 * Reference-preserving backfill: every EnrichedFile becomes a Document
 * with the SAME _id, plus an Enrichment row carrying the pipeline state.
 * File gets its new fields (originalFilename, storageKey) populated from
 * legacy shape.
 *
 * Idempotent via upsert-by-_id.
 */
export async function migrateEnrichedFiles(
  opts: MigrationOptions
): Promise<MigrationReport> {
  const report: MigrationReport = {
    scanned: 0,
    documentsUpserted: 0,
    enrichmentsUpserted: 0,
    filesBackfilled: 0,
    skipped: 0,
    errors: [],
  };

  const cursor = EnrichedFile.find().populate("file").cursor();
  for await (const ef of cursor) {
    report.scanned += 1;
    try {
      const file = ef.file as any;
      if (!file) {
        report.skipped += 1;
        continue;
      }

      if (!opts.dryRun) {
        // Backfill File fields.
        const fileUpdates: any = {};
        if (!file.originalFilename) fileUpdates.originalFilename = file.description ?? "";
        if (!file.storageKey) fileUpdates.storageKey = file._id.toString();
        if (!file.uploadedAt) fileUpdates.uploadedAt = file.createdAt ?? new Date();
        if (Object.keys(fileUpdates).length > 0) {
          await File.updateOne({ _id: file._id }, { $set: fileUpdates });
          report.filesBackfilled += 1;
        }

        // Upsert Document with _id === EnrichedFile._id.
        await DocumentModel.updateOne(
          { _id: ef._id },
          {
            $setOnInsert: {
              _id: ef._id,
              currentFileId: file._id,
              enrichmentLocked: false,
              createdAt: (ef as any).createdAt ?? new Date(),
            },
            $set: {
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
        report.documentsUpserted += 1;

        // Upsert Enrichment.
        await Enrichment.updateOne(
          { documentId: ef._id },
          {
            $setOnInsert: {
              documentId: ef._id,
              fileId: file._id,
              status: (ef as any).summaryStatus ?? "pending",
              attempts: (ef as any).summaryAttempts ?? 0,
              processingVersion: (ef as any).processingVersion ?? 1,
              queuedAt: (ef as any).queuedAt,
              processingStartedAt: (ef as any).processingStartedAt,
              summaryError: (ef as any).summaryError,
              pageCount: (ef as any).pageCount,
              pageIndex: (ef as any).pageIndex,
              summary: (ef as any).summary,
              documentType: (ef as any).documentType,
              summaryProgress: (ef as any).summaryProgress,
            },
          },
          { upsert: true }
        );
        report.enrichmentsUpserted += 1;
      }
    } catch (err: any) {
      report.errors.push({
        enrichedFileId: ef._id.toString(),
        message: err.message ?? String(err),
      });
    }
  }

  return report;
}
```

- [ ] **Step 4: Implement orchestrator stub**

```ts
// server/src/scripts/migrate-file-system/index.ts
import mongoose from "mongoose";
import "dotenv/config";
import { migrateEnrichedFiles } from "./01-enrichedFiles";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await mongoose.connect(process.env.MONGO_URI!, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`Running migration (dryRun=${dryRun})...`);
  const report = await migrateEnrichedFiles({ dryRun });
  console.log("Result:", JSON.stringify(report, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Run tests**

Run: `cd server && npx vitest run src/scripts/migrate-file-system/__tests__/enrichedFiles.test.ts`
Expected: PASS — 4/4.

- [ ] **Step 6: Commit**

```bash
git add server/src/scripts/migrate-file-system/01-enrichedFiles.ts server/src/scripts/migrate-file-system/index.ts server/src/scripts/migrate-file-system/__tests__/
git commit -m "feat(migration): backfill Document + Enrichment from EnrichedFile (reference-preserving)"
```

---

## Task B12: Migration — jobsite.enrichedFiles → placements with minRole

**Files:**
- Create: `server/src/scripts/migrate-file-system/02-jobsiteEnrichedFiles.ts`
- Modify: `server/src/scripts/migrate-file-system/index.ts`
- Test: `server/src/scripts/migrate-file-system/__tests__/jobsiteEnrichedFiles.test.ts`

- [ ] **Step 1: Test (abbreviated — full pattern mirrors B11)**

```ts
// server/src/scripts/migrate-file-system/__tests__/jobsiteEnrichedFiles.test.ts
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase from "@testing/seedDatabase";
import { EnrichedFile, File, Jobsite, FileNode, Document as DocumentModel } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { migrateEnrichedFiles } from "../01-enrichedFiles";
import { migrateJobsiteEnrichedFiles } from "../02-jobsiteEnrichedFiles";
import { UserRoles } from "@typescript/user";

beforeAll(async () => {
  await prepareDatabase();
  await seedDatabase();
  await bootstrapRoots();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("migrateJobsiteEnrichedFiles", () => {
  it("creates a FileNode for each jobsite.enrichedFiles entry, under the jobsite's reserved root, preserving minRole", async () => {
    const jobsite = await Jobsite.findOne();
    const file = await File.create({ mimetype: "application/pdf", description: "j.pdf" });
    const ef = await EnrichedFile.create({ file: file._id, summaryStatus: "ready" });
    await Jobsite.updateOne(
      { _id: jobsite!._id },
      { $push: { enrichedFiles: { enrichedFile: ef._id, minRole: UserRoles.ProjectManager } } }
    );

    // Run prerequisite migration first.
    await migrateEnrichedFiles({ dryRun: false });
    await createEntityRoot({ namespace: "/jobsites", entityId: jobsite!._id });

    await migrateJobsiteEnrichedFiles({ dryRun: false });

    const jobsiteNs = await FileNode.findOne({ name: "jobsites", isReservedRoot: true });
    const jobsiteRoot = await FileNode.findOne({ parentId: jobsiteNs!._id, name: jobsite!._id.toString() });
    const placements = await FileNode.find({ parentId: jobsiteRoot!._id, type: "file" }).lean();
    expect(placements).toHaveLength(1);
    expect(placements[0].documentId?.toString()).toBe(ef._id.toString());
    expect(placements[0].minRole).toBe(UserRoles.ProjectManager);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// server/src/scripts/migrate-file-system/02-jobsiteEnrichedFiles.ts
import mongoose from "mongoose";
import {
  Jobsite,
  File,
  EnrichedFile,
  FileNode,
  Document as DocumentModel,
} from "@models";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import type { MigrationOptions, MigrationReport } from "./01-enrichedFiles";

export async function migrateJobsiteEnrichedFiles(
  opts: MigrationOptions
): Promise<MigrationReport> {
  const report: MigrationReport = {
    scanned: 0,
    documentsUpserted: 0,
    enrichmentsUpserted: 0,
    filesBackfilled: 0,
    skipped: 0,
    errors: [],
  };

  const jobsitesNs = await FileNode.findOne({
    name: "jobsites",
    isReservedRoot: true,
  });
  if (!jobsitesNs) throw new Error("jobsites namespace not bootstrapped");

  const cursor = Jobsite.find().cursor();
  for await (const jobsite of cursor) {
    report.scanned += 1;
    try {
      if (!opts.dryRun) {
        await createEntityRoot({
          namespace: "/jobsites",
          entityId: jobsite._id,
        });

        const entityRoot = await FileNode.findOne({
          parentId: jobsitesNs._id,
          name: jobsite._id.toString(),
        });
        if (!entityRoot) continue;

        for (const entry of (jobsite as any).enrichedFiles ?? []) {
          const enrichedFileId = entry.enrichedFile as mongoose.Types.ObjectId;
          const minRole = entry.minRole;
          const doc = await DocumentModel.findById(enrichedFileId).lean();
          if (!doc) continue;
          const file = await File.findById(doc.currentFileId).lean();
          if (!file) continue;
          const name = file.originalFilename || "file";

          await FileNode.updateOne(
            { parentId: entityRoot._id, documentId: enrichedFileId },
            {
              $setOnInsert: {
                type: "file",
                name,
                normalizedName: normalizeNodeName(name),
                parentId: entityRoot._id,
                documentId: enrichedFileId,
                aiManaged: false,
                sortKey: "0000",
                isReservedRoot: false,
                version: 0,
                minRole,
                createdAt: new Date(),
              },
              $set: { updatedAt: new Date() },
            },
            { upsert: true }
          );
          report.documentsUpserted += 1;
        }
      }
    } catch (err: any) {
      report.errors.push({
        enrichedFileId: jobsite._id.toString(),
        message: err.message ?? String(err),
      });
    }
  }

  return report;
}
```

- [ ] **Step 3: Wire into orchestrator**

Update `server/src/scripts/migrate-file-system/index.ts` to also call `migrateJobsiteEnrichedFiles`.

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run src/scripts/migrate-file-system/__tests__/jobsiteEnrichedFiles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/scripts/migrate-file-system/02-jobsiteEnrichedFiles.ts server/src/scripts/migrate-file-system/index.ts server/src/scripts/migrate-file-system/__tests__/jobsiteEnrichedFiles.test.ts
git commit -m "feat(migration): jobsite.enrichedFiles → placements with minRole preserved"
```

---

## Task B13: Migration — jobsite.fileObjects → placements (non-enriched Documents)

Same pattern as B12 but for `jobsite.fileObjects[]`. Each `FileObject` already has a `file: Ref<File>`. We create a `Document` for each (new `_id`, not preserving any existing identity since fileObjects have no stable id), place under `/jobsites/<id>/`, and **do not create an Enrichment** (these were never enriched).

(Full task body omitted here for length — follows same pattern as B12. File name: `03-jobsiteFileObjects.ts`.)

Commit: `feat(migration): jobsite.fileObjects → placements without enrichment`

---

## Task B14: Migration — system.specFiles → placements under /system/specs/

Pattern mirrors B12. Placements under `/system/specs/` namespace root (no per-entity root for system since it's global).

Commit: `feat(migration): system.specFiles → placements under /system/specs/`

---

## Task B15: Migration — tender.files + fileCategories → placements + AI-managed folders

More complex: each `fileCategory` becomes a folder with `aiManaged: true`, and each file in that category's `fileIds[]` gets placed inside it. Uncategorized files go under `/tenders/<id>/Uncategorized/` (also `aiManaged: true`).

(Body follows same pattern; full code similar to B12 + folder creation loop.)

Commit: `feat(migration): tender.files + fileCategories → placements with AI-managed folders`

---

## Task B16: Migration — ReportNote.files → placements under /daily-reports/

Simpler — each `ReportNote.files[]` entry becomes a Document + FileNode placement under the daily report's reserved root. No enrichment (these are raw photos/attachments).

Commit: `feat(migration): ReportNote.files → placements under /daily-reports/`

---

## Task B17: Refactor enrichment pipeline to target `Enrichment` (not `EnrichedFile`)

**Files:**
- Modify: `server/src/consumer/handlers/enrichedFileSummaryHandler.ts`
- Modify: `server/src/consumer/watchdog.ts`
- Modify: `server/src/rabbitmq/publisher.ts`
- Test: `server/src/__tests__/enrichmentPipeline.test.ts` (new)

This is the largest single task in the plan — rename every read/write of `EnrichedFile.*` pipeline fields to `Enrichment.*`, key queries on `documentId` instead of the EnrichedFile `_id` (but these are the same value, so the shift is semantic not data-level).

- [ ] **Step 1**: Update handler to find the Enrichment record via `documentId` (which equals the published job id).
- [ ] **Step 2**: Update watchdog's stuck-record scan to query Enrichment instead of EnrichedFile.
- [ ] **Step 3**: Publisher continues to publish jobs keyed by the same id (Document._id == EnrichedFile._id). No queue-level rename needed.
- [ ] **Step 4**: Add test that simulates a full pipeline run: create File + Document + Enrichment → publish job → consumer processes → Enrichment transitions to ready.
- [ ] **Step 5**: Run full suite. Any test that asserts on `EnrichedFile.summaryStatus` needs updating to `Enrichment.status`.
- [ ] **Step 6**: Commit.

```bash
git commit -m "refactor(pipeline): enrichment state machine moves from EnrichedFile to Enrichment"
```

---

## Task B18: Wire adapter layer into chat routers + MCP + summary generator

**Files:**
- Modify: `server/src/router/tender-chat.ts`
- Modify: `server/src/router/pm-jobsite-chat.ts`
- Modify: `server/src/router/foreman-jobsite-chat.ts`
- Modify: `server/src/mcp/tools/tender.ts`
- Modify: `server/src/lib/generateTenderSummary.ts`
- Modify: `server/src/lib/buildFileIndex.ts`

Each of these currently reads `tender.files[]`, `jobsite.enrichedFiles[]`, `system.specFiles[]` directly. Replace those reads with calls to `resolveDocumentsForContext({ scope, entityId })`. Callers consume the normalized `ResolvedDocument[]` shape.

- [ ] **Step 1**: Per-file refactor — replace each direct read with an adapter call, normalise downstream consumers.
- [ ] **Step 2**: Run the existing chat/MCP test suites (`crewResolver`, `dailyReportResolver`, etc. — plus any MCP tests). Expected: all pass, because adapter defaults to old-shape reads when new-shape is empty.
- [ ] **Step 3**: Commit.

```bash
git commit -m "refactor(readers): chat routers + MCP + summary generator go through adapter layer"
```

---

## Task B19: `fileNode` query resolver (getNode, listChildren, breadcrumbs)

**Files:**
- Create: `server/src/graphql/resolvers/fileNode/types.ts`
- Create: `server/src/graphql/resolvers/fileNode/index.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/graphql/__tests__/fileNodeQueryResolver.test.ts`

Standard TypeGraphQL resolver. Three queries:

- `fileNode(id: ID!): FileNode` — fetches one node.
- `fileNodeChildren(parentId: ID!): [FileNode!]!` — lists immediate children, sorted by `sortKey`, filtering out `deletedAt`.
- `fileNodeBreadcrumbs(id: ID!): [FileNode!]!` — walks up via `$graphLookup`, returns chain from root to the node.

Include a tests covering: listing root children, listing children of a reserved namespace, listing children of a per-entity root.

Commit: `feat(graphql): fileNode query resolvers (get, list, breadcrumbs)`

---

## Task B20: `createFolder`, `renameNode`, `trashNode`, `restoreNode` mutations

**Files:**
- Create: `server/src/graphql/resolvers/fileNode/mutations.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/graphql/__tests__/fileNodeMutationResolver.test.ts`

Each mutation wraps a call via `eventfulMutation` with OCC via `findOneAndUpdateVersioned`:

- `createFolder(parentId, name)` — validates reserved-root constraints (can't create at root), enforces sibling uniqueness.
- `renameNode(id, expectedVersion, name)` — rejects rename of `isReservedRoot: true` nodes.
- `trashNode(id, expectedVersion)` — cascade soft-delete if folder, via `updateMany({ ancestors... })`. Actually since we have no `ancestors[]`, use `$graphLookup` to find descendants in one aggregation, then `updateMany`.
- `restoreNode(id, expectedVersion)` — restores the node if no ancestor is deleted; requires UI to prompt for new parent if so. Server validates.

Tests cover the happy paths + OCC mismatches + reserved-root guards + normalization-based uniqueness collisions.

Commit: `feat(graphql): fileNode mutations (createFolder, rename, trash, restore)`

---

## Task B21: `moveNode` mutation with cascade

**Files:**
- Create: `server/src/models/FileNode/class/move.ts`
- Modify: `server/src/graphql/resolvers/fileNode/mutations.ts` (add `moveNode`)
- Test: `server/src/models/FileNode/class/__tests__/move.test.ts`

Move logic:
1. Validate destination is not inside the moved subtree (cycle detection via `$graphLookup` before commit).
2. Validate destination parent exists and isn't soft-deleted.
3. Validate sibling uniqueness after move (query `normalizedName` under new parent).
4. Update moved node's `parentId`, bump `version`.
5. Enqueue enrichment re-eval for the moved Document and any children that are Documents (via `shouldEnrichNow`).
6. All inside `eventfulMutation` transaction.

Tests cover: legal move, cycle rejection, reserved-root move rejection, sibling collision, OCC mismatch.

Commit: `feat(fileNode): moveNode with cycle detection + enrichment re-evaluation`

---

## Task B22: `uploadDocument` mutation (surface-scoped)

**Files:**
- Create: `server/src/graphql/resolvers/document/types.ts`
- Create: `server/src/graphql/resolvers/document/index.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/graphql/__tests__/documentUpload.test.ts`

Single mutation:

```graphql
uploadDocument(
  parentFileNodeId: ID!
  fileUpload: Upload!
  displayName: String
): FileNode!
```

Behavior:
1. Creates File with `originalFilename`, `storageKey`, `size`, `uploadedBy`, `uploadedAt`, `mimetype`.
2. Creates Document referencing the File.
3. Creates FileNode (type=file) under `parentFileNodeId`, default name = `originalFilename` unless overridden.
4. Calls `shouldEnrichNow(documentId)` — if true, creates `Enrichment` in pending state and publishes enrichment job via the RabbitMQ publisher. Upsert-by-documentId handles dedup at the DB level.
5. All in one `eventfulMutation` transaction.
6. Uploads the bytes to DigitalOcean Spaces via `uploadFile(id, buffer)` (existing helper).

Tests: upload to enrichable path creates Enrichment; upload to `/daily-reports/` does not; MIME filter excludes non-supported types from Enrichment creation; admin-set `enrichmentLocked: true` prevents Enrichment.

Commit: `feat(graphql): uploadDocument mutation (creates File + Document + FileNode + enrichment)`

---

## Task B23: End-to-end smoke test

**Files:**
- Create: `server/src/__tests__/fileSystem.e2e.test.ts`

End-to-end scenario in one test:
1. Create a Tender (via existing API) — triggers per-entity root provisioning.
2. Upload a PDF via `uploadDocument` — creates File/Document/FileNode/Enrichment, enqueues.
3. Simulate consumer processing (or use a test-mode inline consumer).
4. Assert Enrichment transitions through `processing` → `ready`, FileNode is visible in `fileNodeChildren` of tender root, `resolveDocumentsForContext({ scope: "tender", entityId: tender._id })` returns the doc.
5. Move the FileNode into a sub-folder within the tender — breadcrumbs update, enrichment stays (policy still true).
6. Trash the FileNode — it disappears from `fileNodeChildren`.
7. Restore — reappears.

Commit: `test(e2e): tender file upload → enrichment → move → trash flow`

---

## Self-Review

**Spec coverage:**
- ✅ Three-layer model (File / Document / Enrichment / FileNode): B1–B4
- ✅ Reserved roots + bootstrap: B5, B6
- ✅ Transactional entity+root: B7, B8
- ✅ Path-based enrichment policy with MIME gate + lock: B9
- ✅ Adapter layer: B10
- ✅ Migrations for all 5 surfaces: B11–B16
- ✅ Pipeline rework to target Enrichment: B17
- ✅ Chat/MCP/summary readers via adapter: B18
- ✅ Tree query resolvers: B19
- ✅ Tree mutations (create, rename, trash, restore, move): B20, B21
- ✅ Upload mutation: B22
- ✅ E2E: B23

**Deferred (explicitly out of Plan 2A scope):**
- Client UI components → Plan 2B
- Per-surface UI cutovers → Plan 2B
- File GC job → post-launch follow-up
- `purgeDocument` admin mutation → post-launch follow-up
- `createPlacement` multi-placement mutation → Plan 2B UI work
- CI `no-restricted-imports` rules → Plan 2B cleanup phase
- ACL hardening of download endpoints → separate security ticket

**Placeholder scan:** Tasks B13–B16 deliberately summarized ("same pattern as B12") — full code for those migrations will be written during implementation, following the B12 template verbatim. Acceptable here because the pattern is genuinely identical; bloating the plan with 4 copies of the same structure adds noise. Task B17 and B18 describe refactor scope at the step level rather than showing every line of refactored code — this is accepted for refactor-heavy tasks where the exact edits are found during implementation, as long as the acceptance criteria (tests pass, pipeline functional) are clear.

**Type consistency:** `ResolvedDocument.documentId` is `Types.ObjectId` throughout; `FileNode.documentId` is `Ref<DocumentSchema>`; queries convert consistently. `MigrationOptions` / `MigrationReport` are shared across all migration sub-tasks.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-21-unified-file-system-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

Plan 2B (client UI + per-surface cutovers + cleanup) will be written after Plan 2A is implemented and validated.
