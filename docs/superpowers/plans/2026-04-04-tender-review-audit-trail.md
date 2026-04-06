# Tender Review & Audit Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `TenderReview` document that records row-level change events and review comments on pricing sheets, surfaced as a new Review tab on the tender page.

**Architecture:** A separate `TenderReview` MongoDB document (one per tender) stores `auditLog[]` (written automatically when rows are created/updated/deleted) and `comments[]` (written by users). The timeline merges both arrays client-side sorted by timestamp. The tender pricing sheet resolver is instrumented to call `TenderReview.addAuditEvent()` after bid-affecting mutations.

**Tech Stack:** Typegoose + MongoDB (server model), Type-GraphQL (resolver), Apollo Client + Chakra UI (client), Vitest + `@testing/vitestDB` (tests)

> **Note on tests:** Write test files as specified but do NOT run `npm run test` during implementation — skip all test-execution steps per project convention.

---

## File Map

**New — server:**
- `server/src/typescript/tenderReview.ts` — shared TS interfaces and constants
- `server/src/models/TenderReview/schema/index.ts` — Typegoose schema classes
- `server/src/models/TenderReview/class/create.ts` — `createDocument`
- `server/src/models/TenderReview/class/get.ts` — `byId`, `byTenderId`
- `server/src/models/TenderReview/class/update.ts` — `setStatus`, `addAuditEvent`, `addComment`, `editComment`, `deleteComment`
- `server/src/models/TenderReview/class/index.ts` — `TenderReviewClass` with static helpers
- `server/src/graphql/resolvers/tenderReview/index.ts` — `TenderReviewResolver`
- `server/src/__tests__/tenderReview.test.ts` — model unit tests

**Modified — server:**
- `server/src/models/TenderPricingSheet/schema/index.ts` — remove calculator fields
- `server/src/models/TenderPricingSheet/class/update.ts` — remove calculator fields
- `server/src/typescript/tenderPricingSheet.ts` — remove calculator types/enum
- `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts` — remove calculator fields from input
- `server/src/graphql/resolvers/tenderPricingSheet/index.ts` — add `@Ctx` + `TenderReview.addAuditEvent()` to 3 mutations
- `server/src/models/index.ts` — register `TenderReview` model
- `server/src/app.ts` — register `TenderReviewResolver`

**New — client:**
- `client/src/components/Tender/TenderReviewTab.tsx` — desktop Review tab
- `client/src/components/Tender/TenderMobileReviewTab.tsx` — mobile Review tab

**Modified — client:**
- `client/src/components/TenderPricing/types.ts` — remove calculator fields
- `client/src/components/TenderPricing/PricingSheet.tsx` — remove from GQL fragment
- `client/src/pages/tender/[id]/index.tsx` — remove from GQL fragments; add Review tab
- `client/src/components/Tender/TenderMobilePricingTab.tsx` — remove from GQL fragment
- `client/src/components/Tender/TenderMobileLayout.tsx` — add Review tab

---

### Task 0: Create feature branch

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b feature/tender-review-audit-trail
```

---

### Task 1: Remove legacy calculator fields — server

**Files:**
- Modify: `server/src/typescript/tenderPricingSheet.ts`
- Modify: `server/src/models/TenderPricingSheet/schema/index.ts`
- Modify: `server/src/models/TenderPricingSheet/class/update.ts`
- Modify: `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`

- [ ] **Step 1: Remove `TenderWorkType`, `ITenderCalculatorInputs`, `ITenderCrewEntry`, `ITenderEquipEntry` from `server/src/typescript/tenderPricingSheet.ts`**

The full file after removal (keep `TenderPricingRowType` and everything below it):

```typescript
import { registerEnumType } from "type-graphql";
import { Types } from "mongoose";

export enum TenderPricingRowType {
  Schedule = "Schedule",
  Group = "Group",
  Item = "Item",
}
registerEnumType(TenderPricingRowType, { name: "TenderPricingRowType" });

export interface IDocRef {
  enrichedFileId: string | Types.ObjectId;
  page: number;
  description?: string;
}

export interface ITenderPricingSheetCreate {
  tenderId: string | Types.ObjectId;
}

export interface ITenderPricingRowCreate {
  type: TenderPricingRowType;
  itemNumber: string;
  description: string;
  indentLevel: number;
  sortOrder: number;
}

export interface ITenderPricingRowUpdate {
  itemNumber?: string;
  description?: string;
  indentLevel?: number;
  quantity?: number;
  unit?: string;
  markupOverride?: number | null;
  unitPrice?: number | null;
  notes?: string;
  rateBuildupSnapshot?: string | null;
  extraUnitPrice?: number | null;
  extraUnitPriceMemo?: string | null;
}
```

- [ ] **Step 2: Remove `calculatorType`, `calculatorInputs`, `calculatorInputsJson` props from `server/src/models/TenderPricingSheet/schema/index.ts`**

Remove these three blocks:

```typescript
  @Field({ nullable: true })
  @prop({ trim: true })
  public calculatorInputsJson?: string;
```

```typescript
  @Field(() => TenderWorkType, { nullable: true })
  @prop({ enum: TenderWorkType })
  public calculatorType?: TenderWorkType;

  @prop({ type: () => Object })
  public calculatorInputs?: Record<string, unknown>;
```

Also remove the `TenderWorkType` import from line 1:

```typescript
import { TenderPricingRowType } from "@typescript/tenderPricingSheet";
```

- [ ] **Step 3: Remove `calculatorType`, `calculatorInputs`, `calculatorInputsJson` from `updateRow` in `server/src/models/TenderPricingSheet/class/update.ts`**

Remove these lines from the `updateRow` function:

```typescript
  if (data.calculatorType !== undefined) row.calculatorType = data.calculatorType;
  if (data.calculatorInputs !== undefined) row.calculatorInputs = data.calculatorInputs as any;
```

Also remove `calculatorInputsJson` assignment:
```typescript
  if (data.calculatorInputsJson !== undefined) row.calculatorInputsJson = data.calculatorInputsJson;
```

And remove `calculatorInputsJson` from the `duplicateRow` new row object:
```typescript
  // remove this line:
  calculatorInputsJson: src.calculatorInputsJson,
```

- [ ] **Step 4: Remove calculator fields from `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`**

Remove the `TenderWorkType` import and these two fields from `TenderPricingRowUpdateData`:

```typescript
  @Field(() => TenderWorkType, { nullable: true })
  public calculatorType?: TenderWorkType;
```

The import line to remove:
```typescript
import { TenderPricingRowType, TenderWorkType } from "@typescript/tenderPricingSheet";
```

Replace with:
```typescript
import { TenderPricingRowType } from "@typescript/tenderPricingSheet";
```

- [ ] **Step 5: Commit**

```bash
git add server/src/typescript/tenderPricingSheet.ts \
        server/src/models/TenderPricingSheet/schema/index.ts \
        server/src/models/TenderPricingSheet/class/update.ts \
        server/src/graphql/resolvers/tenderPricingSheet/mutations.ts
git commit -m "refactor: remove retired calculatorType/calculatorInputs fields from pricing sheet"
```

---

### Task 2: TenderReview TypeScript types

**Files:**
- Create: `server/src/typescript/tenderReview.ts`

- [ ] **Step 1: Create `server/src/typescript/tenderReview.ts`**

```typescript
export type TenderReviewStatus = "draft" | "in_review" | "approved";

export type TenderAuditAction = "row_added" | "row_deleted" | "row_updated";

export const TRACKED_ROW_FIELDS: string[] = [
  "quantity",
  "unit",
  "unitPrice",
  "markupOverride",
  "rateBuildupSnapshot",
  "extraUnitPrice",
  "extraUnitPriceMemo",
  "description",
  "itemNumber",
  "notes",
];

export interface ITenderAuditEventCreate {
  rowId: string;
  rowDescription: string;
  action: TenderAuditAction;
  changedFields: string[];
  changedBy: string; // User _id as string
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/typescript/tenderReview.ts
git commit -m "feat: TenderReview TypeScript types"
```

---

### Task 3: TenderReview Typegoose schema

**Files:**
- Create: `server/src/models/TenderReview/schema/index.ts`

- [ ] **Step 1: Create `server/src/models/TenderReview/schema/index.ts`**

```typescript
import { TenderReviewStatus, TenderAuditAction } from "@typescript/tenderReview";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { UserClass } from "../../User/class";

@ObjectType()
export class TenderAuditEventClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => ID)
  @prop({ required: true })
  public rowId!: Types.ObjectId;

  @Field()
  @prop({ required: true, default: "" })
  public rowDescription!: string;

  @Field()
  @prop({ required: true })
  public action!: TenderAuditAction;

  @Field(() => [String])
  @prop({ type: () => [String], default: [] })
  public changedFields!: string[];

  @Field(() => UserClass, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public changedBy?: Ref<UserClass>;

  @Field()
  @prop({ required: true })
  public changedAt!: Date;
}

@ObjectType()
export class TenderReviewCommentClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field()
  @prop({ required: true })
  public content!: string;

  @Field(() => UserClass, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public author?: Ref<UserClass>;

  @Field()
  @prop({ required: true })
  public createdAt!: Date;

  @Field({ nullable: true })
  @prop()
  public editedAt?: Date;
}

@ObjectType()
export class TenderReviewSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  // Not exposed as a GQL field — queried via tenderReview(tenderId)
  @prop({ required: true, unique: true })
  public tender!: Types.ObjectId;

  @Field()
  @prop({ required: true, default: "draft" })
  public status!: TenderReviewStatus;

  @Field(() => [TenderAuditEventClass])
  @prop({ type: () => [TenderAuditEventClass], default: [] })
  public auditLog!: TenderAuditEventClass[];

  @Field(() => [TenderReviewCommentClass])
  @prop({ type: () => [TenderReviewCommentClass], default: [] })
  public comments!: TenderReviewCommentClass[];

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/models/TenderReview/schema/index.ts
git commit -m "feat: TenderReview Typegoose schema"
```

---

### Task 4: TenderReview model class

**Files:**
- Create: `server/src/models/TenderReview/class/create.ts`
- Create: `server/src/models/TenderReview/class/get.ts`
- Create: `server/src/models/TenderReview/class/update.ts`
- Create: `server/src/models/TenderReview/class/index.ts`

- [ ] **Step 1: Create `server/src/models/TenderReview/class/create.ts`**

```typescript
import { TenderReviewDocument, TenderReviewModel } from "@models";

const document = async (
  TenderReview: TenderReviewModel,
  tenderId: string
): Promise<TenderReviewDocument> => {
  return new TenderReview({
    tender: tenderId,
    status: "draft",
    auditLog: [],
    comments: [],
  });
};

export default { document };
```

- [ ] **Step 2: Create `server/src/models/TenderReview/class/get.ts`**

```typescript
import { TenderReviewDocument, TenderReviewModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";

const byTenderId = async (
  TenderReview: TenderReviewModel,
  tenderId: Id
): Promise<TenderReviewDocument | null> => {
  return TenderReview.findOne({ tender: tenderId })
    .populate({ path: "auditLog.changedBy", select: "name" })
    .populate({ path: "comments.author", select: "name" });
};

const byId = async (
  TenderReview: TenderReviewModel,
  id: Id,
  options?: GetByIDOptions
): Promise<TenderReviewDocument | null> => {
  const query = TenderReview.findById(id)
    .populate({ path: "auditLog.changedBy", select: "name" })
    .populate({ path: "comments.author", select: "name" });
  if (options?.throwError) {
    const doc = await query;
    if (!doc) throw new Error(`TenderReview ${id} not found`);
    return doc;
  }
  return query;
};

export default { byTenderId, byId };
```

- [ ] **Step 3: Create `server/src/models/TenderReview/class/update.ts`**

```typescript
import { Types } from "mongoose";
import { TenderReviewDocument } from "@models";
import { TenderReviewStatus, ITenderAuditEventCreate } from "@typescript/tenderReview";
import { Id } from "@typescript/models";

const setStatus = (
  review: TenderReviewDocument,
  status: TenderReviewStatus
): TenderReviewDocument => {
  review.status = status;
  review.updatedAt = new Date();
  return review;
};

const addAuditEvent = (
  review: TenderReviewDocument,
  event: ITenderAuditEventCreate
): TenderReviewDocument => {
  (review.auditLog as any).push({
    _id: new Types.ObjectId(),
    rowId: new Types.ObjectId(event.rowId),
    rowDescription: event.rowDescription,
    action: event.action,
    changedFields: event.changedFields,
    changedBy: new Types.ObjectId(event.changedBy),
    changedAt: new Date(),
  });
  review.updatedAt = new Date();
  return review;
};

const addComment = (
  review: TenderReviewDocument,
  content: string,
  authorId: string
): TenderReviewDocument => {
  (review.comments as any).push({
    _id: new Types.ObjectId(),
    content,
    author: new Types.ObjectId(authorId),
    createdAt: new Date(),
  });
  review.updatedAt = new Date();
  return review;
};

const editComment = (
  review: TenderReviewDocument,
  commentId: Id,
  content: string
): TenderReviewDocument => {
  const comment = (review.comments as any[]).find(
    (c: any) => c._id.toString() === commentId.toString()
  );
  if (!comment) throw new Error(`Comment ${commentId} not found`);
  comment.content = content;
  comment.editedAt = new Date();
  review.updatedAt = new Date();
  return review;
};

const deleteComment = (
  review: TenderReviewDocument,
  commentId: Id
): TenderReviewDocument => {
  (review as any).comments = (review.comments as any[]).filter(
    (c: any) => c._id.toString() !== commentId.toString()
  );
  review.updatedAt = new Date();
  return review;
};

export default { setStatus, addAuditEvent, addComment, editComment, deleteComment };
```

- [ ] **Step 4: Create `server/src/models/TenderReview/class/index.ts`**

```typescript
import { ObjectType } from "type-graphql";
import { TenderReviewDocument, TenderReviewModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";
import { TenderReviewStatus, ITenderAuditEventCreate } from "@typescript/tenderReview";
import { TenderReviewSchema } from "../schema";
import get from "./get";
import create from "./create";
import update from "./update";

@ObjectType()
export class TenderReviewClass extends TenderReviewSchema {
  public static async getById(
    this: TenderReviewModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByTenderId(
    this: TenderReviewModel,
    tenderId: Id
  ) {
    return get.byTenderId(this, tenderId);
  }

  public static async createDocument(
    this: TenderReviewModel,
    tenderId: string
  ) {
    return create.document(this, tenderId);
  }

  public static async findOrCreateByTenderId(
    this: TenderReviewModel,
    tenderId: string
  ): Promise<TenderReviewDocument> {
    let review = await get.byTenderId(this, tenderId);
    if (!review) {
      review = await create.document(this, tenderId);
      await (review as TenderReviewDocument).save();
      // Re-fetch to get populated fields
      review = (await get.byTenderId(this, tenderId))!;
    }
    return review as TenderReviewDocument;
  }

  public static async addAuditEvent(
    this: TenderReviewModel,
    tenderId: string,
    event: ITenderAuditEventCreate
  ) {
    // Use lean find-or-create without population for mutation speed
    let review = await this.findOne({ tender: tenderId });
    if (!review) {
      review = await create.document(this, tenderId);
      await (review as TenderReviewDocument).save();
    }
    update.addAuditEvent(review as TenderReviewDocument, event);
    await (review as TenderReviewDocument).save();
  }

  public setStatus(
    this: TenderReviewDocument,
    status: TenderReviewStatus
  ) {
    return update.setStatus(this, status);
  }

  public addComment(
    this: TenderReviewDocument,
    content: string,
    authorId: string
  ) {
    return update.addComment(this, content, authorId);
  }

  public editComment(
    this: TenderReviewDocument,
    commentId: Id,
    content: string
  ) {
    return update.editComment(this, commentId, content);
  }

  public deleteComment(
    this: TenderReviewDocument,
    commentId: Id
  ) {
    return update.deleteComment(this, commentId);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add server/src/models/TenderReview/
git commit -m "feat: TenderReview model class"
```

---

### Task 5: Register TenderReview model

**Files:**
- Modify: `server/src/models/index.ts`

- [ ] **Step 1: Add `export * from "./TenderReview"` near the top of `server/src/models/index.ts`**

After line 24 (`export * from "./TenderPricingSheet";`), add:

```typescript
export * from "./TenderReview";
```

- [ ] **Step 2: Add model registration at the bottom of `server/src/models/index.ts`**

After the TenderPricingSheet block (after line 474), append:

```typescript
/**
 * ----- TenderReview -----
 */

import { TenderReviewClass } from "./TenderReview/class";

export type TenderReviewDocument = DocumentType<TenderReviewClass>;

export type TenderReviewModel = ReturnModelType<typeof TenderReviewClass>;

export const TenderReview = getModelForClass(TenderReviewClass, {
  schemaOptions: { collection: "tenderreviews" },
});
```

- [ ] **Step 3: Write test file `server/src/__tests__/tenderReview.test.ts`**

```typescript
import mongoose from "mongoose";
import { TenderReview } from "@models";
import { prepareDatabase } from "@testing/vitestDB";

beforeAll(async () => {
  await prepareDatabase();
});

const fakeTenderId = () => new mongoose.Types.ObjectId().toString();
const fakeUserId = () => new mongoose.Types.ObjectId().toString();

describe("TenderReview.findOrCreateByTenderId", () => {
  it("creates a document with draft status if none exists", async () => {
    const tenderId = fakeTenderId();
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    expect(review).not.toBeNull();
    expect(review.status).toBe("draft");
    expect(review.auditLog).toHaveLength(0);
    expect(review.comments).toHaveLength(0);
  });

  it("returns existing document on second call", async () => {
    const tenderId = fakeTenderId();
    const r1 = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    const r2 = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    expect(r1._id.toString()).toBe(r2._id.toString());
  });
});

describe("TenderReview.addAuditEvent", () => {
  it("appends an audit event and creates the review if needed", async () => {
    const tenderId = fakeTenderId();
    const rowId = new mongoose.Types.ObjectId().toString();
    await (TenderReview as any).addAuditEvent(tenderId, {
      rowId,
      rowDescription: "Supply HMA",
      action: "row_added",
      changedFields: [],
      changedBy: fakeUserId(),
    });
    const review = await TenderReview.findOne({ tender: tenderId });
    expect(review!.auditLog).toHaveLength(1);
    expect(review!.auditLog[0].action).toBe("row_added");
    expect(review!.auditLog[0].rowDescription).toBe("Supply HMA");
  });
});

describe("TenderReview instance methods", () => {
  let tenderId: string;

  beforeEach(async () => {
    tenderId = fakeTenderId();
    await (TenderReview as any).findOrCreateByTenderId(tenderId);
  });

  it("setStatus updates the status field", async () => {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    review.setStatus("in_review");
    await review.save();
    const refetched = await TenderReview.findOne({ tender: tenderId });
    expect(refetched!.status).toBe("in_review");
  });

  it("addComment appends a comment", async () => {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    const authorId = fakeUserId();
    review.addComment("Check the trucking rate", authorId);
    await review.save();
    const refetched = await TenderReview.findOne({ tender: tenderId });
    expect(refetched!.comments).toHaveLength(1);
    expect(refetched!.comments[0].content).toBe("Check the trucking rate");
  });

  it("editComment updates content and sets editedAt", async () => {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    review.addComment("Original text", fakeUserId());
    await review.save();
    const saved = await TenderReview.findOne({ tender: tenderId });
    const commentId = saved!.comments[0]._id;
    saved!.editComment(commentId, "Updated text");
    await saved!.save();
    const refetched = await TenderReview.findOne({ tender: tenderId });
    expect(refetched!.comments[0].content).toBe("Updated text");
    expect(refetched!.comments[0].editedAt).toBeDefined();
  });

  it("deleteComment removes the comment", async () => {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    review.addComment("To be deleted", fakeUserId());
    await review.save();
    const saved = await TenderReview.findOne({ tender: tenderId });
    const commentId = saved!.comments[0]._id;
    saved!.deleteComment(commentId);
    await saved!.save();
    const refetched = await TenderReview.findOne({ tender: tenderId });
    expect(refetched!.comments).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add server/src/models/index.ts server/src/__tests__/tenderReview.test.ts
git commit -m "feat: register TenderReview model + add tests"
```

---

### Task 6: TenderReview GQL resolver

**Files:**
- Create: `server/src/graphql/resolvers/tenderReview/index.ts`

- [ ] **Step 1: Create `server/src/graphql/resolvers/tenderReview/index.ts`**

```typescript
import { TenderReview } from "@models";
import { TenderReviewClass } from "../../../models/TenderReview/class";
import { Id } from "@typescript/models";
import { TenderReviewStatus } from "@typescript/tenderReview";
import { Arg, Authorized, Ctx, ID, Mutation, Query, Resolver } from "type-graphql";
import { IContext } from "@typescript/graphql";

@Resolver(() => TenderReviewClass)
export default class TenderReviewResolver {
  @Authorized(["ADMIN", "PM"])
  @Query(() => TenderReviewClass)
  async tenderReview(@Arg("tenderId", () => ID) tenderId: Id) {
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderReviewClass)
  async tenderReviewSetStatus(
    @Arg("tenderId", () => ID) tenderId: Id,
    @Arg("status") status: string
  ) {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
    review.setStatus(status as TenderReviewStatus);
    await review.save();
    // Re-fetch with population
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderReviewClass)
  async tenderReviewAddComment(
    @Arg("tenderId", () => ID) tenderId: Id,
    @Arg("content") content: string,
    @Ctx() ctx: IContext
  ) {
    if (!ctx.user) throw new Error("Must be logged in");
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
    review.addComment(content, ctx.user._id.toString());
    await review.save();
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderReviewClass)
  async tenderReviewEditComment(
    @Arg("tenderId", () => ID) tenderId: Id,
    @Arg("commentId", () => ID) commentId: Id,
    @Arg("content") content: string
  ) {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
    review.editComment(commentId, content);
    await review.save();
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderReviewClass)
  async tenderReviewDeleteComment(
    @Arg("tenderId", () => ID) tenderId: Id,
    @Arg("commentId", () => ID) commentId: Id
  ) {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
    review.deleteComment(commentId);
    await review.save();
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }
}
```

- [ ] **Step 2: Register `TenderReviewResolver` in `server/src/app.ts`**

Add import after `TenderPricingSheetResolver` (line 68):

```typescript
import TenderReviewResolver from "@graphql/resolvers/tenderReview";
```

Add to the `resolvers` array after `TenderPricingSheetResolver` (line 135):

```typescript
      TenderReviewResolver,
```

- [ ] **Step 3: Commit**

```bash
git add server/src/graphql/resolvers/tenderReview/index.ts server/src/app.ts
git commit -m "feat: TenderReview GQL resolver"
```

---

### Task 7: Instrument pricing mutations with audit events

**Files:**
- Modify: `server/src/graphql/resolvers/tenderPricingSheet/index.ts`

- [ ] **Step 1: Add imports at the top of `server/src/graphql/resolvers/tenderPricingSheet/index.ts`**

Add these two imports after the existing imports:

```typescript
import { Ctx } from "type-graphql";
import { IContext } from "@typescript/graphql";
import { TenderReview } from "@models";
import { TRACKED_ROW_FIELDS } from "@typescript/tenderReview";
```

Note: `Ctx` is already imported in the `type-graphql` import line — add it to that import:
```typescript
import {
  Arg,
  Authorized,
  Ctx,
  Float,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
} from "type-graphql";
```

- [ ] **Step 2: Replace `tenderPricingRowCreate` to record `row_added` events**

```typescript
  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowCreate(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("data") data: TenderPricingRowCreateData,
    @Ctx() ctx: IContext
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.addRow(data);
    await sheet!.save();

    if (ctx.user) {
      const newRow = sheet!.rows[sheet!.rows.length - 1];
      await (TenderReview as any).addAuditEvent((sheet!.tender as any).toString(), {
        rowId: newRow._id.toString(),
        rowDescription: newRow.description ?? "",
        action: "row_added",
        changedFields: [],
        changedBy: ctx.user._id.toString(),
      });
    }

    return sheet;
  }
```

- [ ] **Step 3: Replace `tenderPricingRowUpdate` to record `row_updated` events**

```typescript
  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowUpdate(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id,
    @Arg("data") data: TenderPricingRowUpdateData,
    @Ctx() ctx: IContext
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    const row = sheet!.rows.find((r) => r._id.toString() === rowId.toString());
    sheet!.updateRow(rowId, data);
    await sheet!.save();

    if (ctx.user) {
      const changedFields = TRACKED_ROW_FIELDS.filter(
        (f) => (data as any)[f] !== undefined
      );
      if (changedFields.length > 0) {
        await (TenderReview as any).addAuditEvent((sheet!.tender as any).toString(), {
          rowId: rowId.toString(),
          rowDescription: row?.description ?? "",
          action: "row_updated",
          changedFields,
          changedBy: ctx.user._id.toString(),
        });
      }
    }

    return sheet;
  }
```

- [ ] **Step 4: Replace `tenderPricingRowDelete` to record `row_deleted` events**

```typescript
  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowDelete(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id,
    @Ctx() ctx: IContext
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    const row = sheet!.rows.find((r) => r._id.toString() === rowId.toString());
    sheet!.deleteRow(rowId);
    await sheet!.save();

    if (ctx.user) {
      await (TenderReview as any).addAuditEvent((sheet!.tender as any).toString(), {
        rowId: rowId.toString(),
        rowDescription: row?.description ?? "",
        action: "row_deleted",
        changedFields: [],
        changedBy: ctx.user._id.toString(),
      });
    }

    return sheet;
  }
```

- [ ] **Step 5: Commit**

```bash
git add server/src/graphql/resolvers/tenderPricingSheet/index.ts
git commit -m "feat: instrument pricing row mutations with TenderReview audit events"
```

---

### Task 8: Client — remove calculator fields + codegen

**Files:**
- Modify: `client/src/components/TenderPricing/types.ts`
- Modify: `client/src/components/TenderPricing/PricingSheet.tsx`
- Modify: `client/src/pages/tender/[id]/index.tsx`
- Modify: `client/src/components/Tender/TenderMobilePricingTab.tsx`

- [ ] **Step 1: Remove `calculatorType` and `calculatorInputsJson` from `client/src/components/TenderPricing/types.ts`**

Remove these two lines from the row type:

```typescript
  calculatorType?: string | null;
  calculatorInputsJson?: string | null;
```

- [ ] **Step 2: Remove from GQL fragment in `client/src/components/TenderPricing/PricingSheet.tsx`**

Remove:
```
        calculatorType
        calculatorInputsJson
```

- [ ] **Step 3: Remove from both GQL fragments in `client/src/pages/tender/[id]/index.tsx`**

There are two fragments that include these fields (`SHEET_QUERY` around line 58 and `CREATE_SHEET` around line 142). Remove from both:

```
        calculatorType
        calculatorInputsJson
```

- [ ] **Step 4: Remove from GQL fragment in `client/src/components/Tender/TenderMobilePricingTab.tsx`**

Remove:
```
        calculatorType
        calculatorInputsJson
```

- [ ] **Step 5: Run codegen to regenerate GraphQL types**

```bash
cd client && npm run codegen
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/TenderPricing/types.ts \
        client/src/components/TenderPricing/PricingSheet.tsx \
        client/src/pages/tender/\[id\]/index.tsx \
        client/src/components/Tender/TenderMobilePricingTab.tsx \
        client/src/generated/graphql.tsx
git commit -m "refactor: remove calculator fields from client GQL fragments + regenerate types"
```

---

### Task 9: TenderReviewTab — desktop component

**Files:**
- Create: `client/src/components/Tender/TenderReviewTab.tsx`

This task adds the GQL query + mutations and the full Review tab component.

- [ ] **Step 1: Create `client/src/components/Tender/TenderReviewTab.tsx`**

```tsx
import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Badge,
  Button,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { FiChevronDown, FiEdit2, FiTrash2 } from "react-icons/fi";
import { gql, useQuery, useMutation } from "@apollo/client";

// Inline relative time — no external dependency, follows project pattern
const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// ─── GQL ─────────────────────────────────────────────────────────────────────

const TENDER_REVIEW_QUERY = gql`
  query TenderReview($tenderId: ID!) {
    tenderReview(tenderId: $tenderId) {
      _id
      status
      auditLog {
        _id
        rowId
        rowDescription
        action
        changedFields
        changedBy {
          _id
          name
        }
        changedAt
      }
      comments {
        _id
        content
        author {
          _id
          name
        }
        createdAt
        editedAt
      }
    }
  }
`;

const SET_STATUS = gql`
  mutation TenderReviewSetStatus($tenderId: ID!, $status: String!) {
    tenderReviewSetStatus(tenderId: $tenderId, status: $status) {
      _id
      status
    }
  }
`;

const ADD_COMMENT = gql`
  mutation TenderReviewAddComment($tenderId: ID!, $content: String!) {
    tenderReviewAddComment(tenderId: $tenderId, content: $content) {
      _id
      status
      auditLog {
        _id
        rowId
        rowDescription
        action
        changedFields
        changedBy { _id name }
        changedAt
      }
      comments {
        _id
        content
        author { _id name }
        createdAt
        editedAt
      }
    }
  }
`;

const EDIT_COMMENT = gql`
  mutation TenderReviewEditComment($tenderId: ID!, $commentId: ID!, $content: String!) {
    tenderReviewEditComment(tenderId: $tenderId, commentId: $commentId, content: $content) {
      _id
      comments {
        _id
        content
        author { _id name }
        createdAt
        editedAt
      }
    }
  }
`;

const DELETE_COMMENT = gql`
  mutation TenderReviewDeleteComment($tenderId: ID!, $commentId: ID!) {
    tenderReviewDeleteComment(tenderId: $tenderId, commentId: $commentId) {
      _id
      comments {
        _id
        content
        author { _id name }
        createdAt
        editedAt
      }
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewStatus = "draft" | "in_review" | "approved";

interface AuditEvent {
  __typename: "TenderAuditEventClass";
  _id: string;
  rowDescription: string;
  action: "row_added" | "row_deleted" | "row_updated";
  changedFields: string[];
  changedBy?: { _id: string; name: string } | null;
  changedAt: string;
}

interface ReviewComment {
  __typename: "TenderReviewCommentClass";
  _id: string;
  content: string;
  author?: { _id: string; name: string } | null;
  createdAt: string;
  editedAt?: string | null;
}

type TimelineItem =
  | { kind: "audit"; timestamp: Date; data: AuditEvent }
  | { kind: "comment"; timestamp: Date; data: ReviewComment };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ReviewStatus, string> = {
  draft: "gray",
  in_review: "blue",
  approved: "green",
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
};

const NEXT_STATUS: Record<ReviewStatus, ReviewStatus> = {
  draft: "in_review",
  in_review: "approved",
  approved: "draft",
};

const NEXT_STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: "Mark as In Review",
  in_review: "Mark as Approved",
  approved: "Back to Draft",
};

function buildActionLabel(event: AuditEvent): string {
  const actor = event.changedBy?.name ?? "Someone";
  if (event.action === "row_added") return `${actor} added row "${event.rowDescription}"`;
  if (event.action === "row_deleted") return `${actor} deleted row "${event.rowDescription}"`;
  const fields = event.changedFields.join(", ");
  return `${actor} updated "${event.rowDescription}" — ${fields}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const AuditEventItem: React.FC<{ event: AuditEvent }> = ({ event }) => (
  <Flex gap={2} align="flex-start" py={1}>
    <Box mt="5px" w="8px" h="8px" borderRadius="full" bg="gray.400" flexShrink={0} />
    <Box>
      <Text fontSize="sm" color="gray.700">{buildActionLabel(event)}</Text>
      <Text fontSize="xs" color="gray.400">
        {relativeTime(event.changedAt)}
      </Text>
    </Box>
  </Flex>
);

interface CommentItemProps {
  comment: ReviewComment;
  currentUserId?: string;
  tenderId: string;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, currentUserId, tenderId }) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const isOwn = currentUserId && comment.author?._id === currentUserId;

  const [editComment] = useMutation(EDIT_COMMENT);
  const [deleteComment] = useMutation(DELETE_COMMENT);

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await editComment({ variables: { tenderId, commentId: comment._id, content: editText.trim() } });
    setEditing(false);
  };

  return (
    <Box
      bg="gray.50"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      px={3}
      py={2}
      my={1}
    >
      <Flex justify="space-between" align="flex-start">
        <Text fontSize="xs" fontWeight="semibold" color="gray.600">
          {comment.author?.name ?? "Unknown"}
        </Text>
        {isOwn && !editing && (
          <HStack spacing={1}>
            <IconButton
              aria-label="Edit comment"
              icon={<FiEdit2 size={12} />}
              size="xs"
              variant="ghost"
              onClick={() => setEditing(true)}
            />
            <IconButton
              aria-label="Delete comment"
              icon={<FiTrash2 size={12} />}
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={() =>
                deleteComment({ variables: { tenderId, commentId: comment._id } })
              }
            />
          </HStack>
        )}
      </Flex>
      {editing ? (
        <VStack align="stretch" mt={1} spacing={1}>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            size="sm"
            rows={2}
          />
          <HStack>
            <Button size="xs" colorScheme="blue" onClick={handleSaveEdit}>Save</Button>
            <Button size="xs" variant="ghost" onClick={() => { setEditing(false); setEditText(comment.content); }}>Cancel</Button>
          </HStack>
        </VStack>
      ) : (
        <Text fontSize="sm" mt={1} whiteSpace="pre-wrap">{comment.content}</Text>
      )}
      <Text fontSize="xs" color="gray.400" mt={1}>
        {relativeTime(comment.createdAt)}
        {comment.editedAt && " (edited)"}
      </Text>
    </Box>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface TenderReviewTabProps {
  tenderId: string;
  currentUserId?: string;
}

const TenderReviewTab: React.FC<TenderReviewTabProps> = ({ tenderId, currentUserId }) => {
  const [commentText, setCommentText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, loading } = useQuery(TENDER_REVIEW_QUERY, { variables: { tenderId } });
  const [setStatus] = useMutation(SET_STATUS, {
    refetchQueries: [{ query: TENDER_REVIEW_QUERY, variables: { tenderId } }],
  });
  const [addComment, { loading: addingComment }] = useMutation(ADD_COMMENT, {
    refetchQueries: [{ query: TENDER_REVIEW_QUERY, variables: { tenderId } }],
  });

  const review = data?.tenderReview;
  const status: ReviewStatus = review?.status ?? "draft";

  // Build sorted timeline
  const timeline: TimelineItem[] = React.useMemo(() => {
    if (!review) return [];
    const items: TimelineItem[] = [
      ...(review.auditLog as AuditEvent[]).map((e) => ({
        kind: "audit" as const,
        timestamp: new Date(e.changedAt),
        data: e,
      })),
      ...(review.comments as ReviewComment[]).map((c) => ({
        kind: "comment" as const,
        timestamp: new Date(c.createdAt),
        data: c,
      })),
    ];
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [review]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline.length]);

  const handlePostComment = async () => {
    const content = commentText.trim();
    if (!content) return;
    setCommentText("");
    await addComment({ variables: { tenderId, content } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePostComment();
  };

  if (loading) {
    return (
      <Flex h="200px" align="center" justify="center">
        <Spinner />
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="100%" overflow="hidden">
      {/* Status bar */}
      <Flex
        px={4}
        py={2}
        borderBottom="1px solid"
        borderColor="gray.200"
        align="center"
        gap={3}
        flexShrink={0}
      >
        <Badge colorScheme={STATUS_COLORS[status]} fontSize="xs" px={2} py={1}>
          {STATUS_LABELS[status]}
        </Badge>
        <Menu>
          <MenuButton as={Button} size="xs" variant="outline" rightIcon={<FiChevronDown />}>
            {NEXT_STATUS_LABEL[status]}
          </MenuButton>
          <MenuList fontSize="sm">
            {(["draft", "in_review", "approved"] as ReviewStatus[]).map((s) => (
              <MenuItem
                key={s}
                onClick={() => setStatus({ variables: { tenderId, status: s } })}
                fontWeight={s === status ? "bold" : "normal"}
              >
                {STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </Flex>

      {/* Timeline */}
      <Box flex={1} overflowY="auto" px={4} py={3}>
        {timeline.length === 0 ? (
          <Text fontSize="sm" color="gray.400" textAlign="center" mt={8}>
            No activity yet — changes to this sheet will appear here.
          </Text>
        ) : (
          timeline.map((item) =>
            item.kind === "audit" ? (
              <AuditEventItem key={item.data._id} event={item.data} />
            ) : (
              <CommentItem
                key={item.data._id}
                comment={item.data}
                currentUserId={currentUserId}
                tenderId={tenderId}
              />
            )
          )
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Comment input */}
      <Box px={4} py={3} borderTop="1px solid" borderColor="gray.200" flexShrink={0}>
        <Flex gap={2} align="flex-end">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment… (Cmd+Enter to post)"
            size="sm"
            rows={2}
            resize="none"
            flex={1}
          />
          <Button
            size="sm"
            colorScheme="blue"
            onClick={handlePostComment}
            isLoading={addingComment}
            isDisabled={!commentText.trim()}
          >
            Post
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
};

export default TenderReviewTab;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Tender/TenderReviewTab.tsx
git commit -m "feat: TenderReviewTab desktop component"
```

---

### Task 10: Wire Review tab into desktop tender page

**Files:**
- Modify: `client/src/pages/tender/[id]/index.tsx`

- [ ] **Step 1: Add `TenderReviewTab` import**

After the `TenderDocuments` import (around line 25), add:

```typescript
import TenderReviewTab from "../../../components/Tender/TenderReviewTab";
```

- [ ] **Step 2: Update `RightTab` type (line 164)**

```typescript
type RightTab = "job" | "documents" | "notes" | "summary" | "review";
```

- [ ] **Step 3: Add Review to the `TABS` array (around line 432)**

```typescript
  const TABS: { key: RightTab; label: string }[] = [
    { key: "job", label: "Job" },
    {
      key: "documents",
      label: `Documents${tender && tender.files.length > 0 ? ` (${tender.files.length})` : ""}`,
    },
    {
      key: "notes",
      label: `Notes${tender && tender.notes.length > 0 ? ` (${tender.notes.length})` : ""}`,
    },
    { key: "summary", label: "Summary" },
    { key: "review", label: "Review" },
  ];
```

- [ ] **Step 4: Add Review tab content panel**

Find the block that renders `rightTab === "summary"` (around line 666) and add after it:

```tsx
                {rightTab === "review" && (
                  <TenderReviewTab
                    tenderId={tenderId}
                    currentUserId={undefined}
                  />
                )}
```

Note: `currentUserId` is `undefined` here since the tender page doesn't currently expose the logged-in user's ID to client components. The edit/delete buttons will be hidden for all comments until user identity is plumbed through — acceptable for now, can be revisited later.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/tender/\[id\]/index.tsx
git commit -m "feat: add Review tab to desktop tender page"
```

---

### Task 11: Mobile Review tab + layout

**Files:**
- Create: `client/src/components/Tender/TenderMobileReviewTab.tsx`
- Modify: `client/src/components/Tender/TenderMobileLayout.tsx`

- [ ] **Step 1: Create `client/src/components/Tender/TenderMobileReviewTab.tsx`**

The mobile variant is a slimmer wrapper around the same `TenderReviewTab` — it fills the mobile viewport area below the top bar and above the tab bar.

```tsx
import React from "react";
import { Box } from "@chakra-ui/react";
import TenderReviewTab from "./TenderReviewTab";

interface TenderMobileReviewTabProps {
  tenderId: string;
}

const TenderMobileReviewTab: React.FC<TenderMobileReviewTabProps> = ({ tenderId }) => {
  return (
    <Box h="100%" overflow="hidden">
      <TenderReviewTab tenderId={tenderId} />
    </Box>
  );
};

export default TenderMobileReviewTab;
```

- [ ] **Step 2: Add Review tab to `client/src/components/Tender/TenderMobileLayout.tsx`**

Add import after `TenderNotesTab`:

```typescript
import TenderMobileReviewTab from "./TenderMobileReviewTab";
```

Add `FiClock` to the react-icons import (for the Review tab icon):

```typescript
import { FiChevronLeft, FiFileText, FiList, FiMessageSquare, FiAlignLeft, FiClock } from "react-icons/fi";
```

Update `MobileTab` type:

```typescript
type MobileTab = "pricing" | "documents" | "notes" | "summary" | "review";
```

Update `TABS` array:

```typescript
const TABS: { key: MobileTab; label: string; icon: React.ReactElement }[] = [
  { key: "pricing", label: "Pricing", icon: <FiList size={18} /> },
  { key: "documents", label: "Documents", icon: <FiFileText size={18} /> },
  { key: "notes", label: "Notes", icon: <FiMessageSquare size={18} /> },
  { key: "summary", label: "Summary", icon: <FiAlignLeft size={18} /> },
  { key: "review", label: "Review", icon: <FiClock size={18} /> },
];
```

Add Review case to the tab content renderer (wherever `activeTab === "summary"` is handled, add after it):

```tsx
          {activeTab === "review" && (
            <TenderMobileReviewTab tenderId={tenderId} />
          )}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Tender/TenderMobileReviewTab.tsx \
        client/src/components/Tender/TenderMobileLayout.tsx
git commit -m "feat: add Review tab to mobile tender layout"
```

---

## Self-Review Checklist

After all tasks are complete, verify:

- [ ] Server starts without TypeScript errors (`kubectl logs` shows no `TSError`)
- [ ] `tenderReview(tenderId)` query returns a document with `status: "draft"` and empty arrays for a new tender
- [ ] Updating a row's `unitPrice` on the pricing sheet creates an audit event visible in the Review tab
- [ ] Adding a row creates a `row_added` event; deleting creates `row_deleted`
- [ ] Status badge changes when cycling through Draft / In Review / Approved
- [ ] Comments can be posted; edit and delete work
- [ ] Mobile Review tab renders and scrolls correctly
- [ ] Reordering rows, auto-number, and doc-ref changes do NOT create audit events
