# Tender Review & Audit Trail

**Date:** 2026-04-04  
**Status:** Approved for implementation

## Overview

Add a Review & Audit Trail system to the Tender pricing sheet. The core value is a unified timeline — row-level change events (who changed what and when) interleaved with review comments. Modelled loosely on a PR review: changes accumulate like commits, reviewers leave comments, more changes follow. A lightweight status label (`draft / in_review / approved`) is informational only — no gatekeeping.

## Scope

1. Remove retired `calculatorType`, `calculatorInputs`, `calculatorInputsJson` fields from schema, types, resolvers, and client
2. New `TenderReview` MongoDB model — one per tender
3. Audit events written automatically on bid-affecting row mutations
4. New `TenderReviewResolver` — query + status + comment mutations
5. New Review tab on desktop and mobile tender UI

---

## Step 1 — Remove Legacy Calculator Fields

The following fields were superseded by rate buildups and are no longer used in any computation or rendering. Remove them entirely:

- `calculatorType` (enum `TenderWorkType`)
- `calculatorInputs` (freeform object)
- `calculatorInputsJson` (stringified JSON)

**Files to update:**
- `server/src/models/TenderPricingSheet/schema/index.ts` — remove props + decorators
- `server/src/models/TenderPricingSheet/class/update.ts` — remove from `updateRow`
- `server/src/typescript/tenderPricingSheet.ts` — remove from `ITenderPricingRowUpdate`, remove `TenderWorkType` enum and `ITenderCalculatorInputs` interface (verify nothing else references them first)
- `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts` — remove from `TenderPricingRowUpdateData`
- `client/src/components/TenderPricing/types.ts` — remove from local row type
- `client/src/components/TenderPricing/PricingSheet.tsx` — remove from GQL fragment
- `client/src/pages/tender/[id]/index.tsx` — remove from GQL fragment(s)
- `client/src/components/Tender/TenderMobilePricingTab.tsx` — remove from GQL fragment
- Run `npm run codegen` in client to regenerate `generated/graphql.tsx`

---

## Step 2 — TenderReview Data Model

New MongoDB model: `TenderReview`. One document per tender, created lazily on first access.

```
TenderReviewSchema
  tender          ObjectId  ref: TenderClass   required, unique
  status          "draft" | "in_review" | "approved"   default: "draft"
  auditLog        TenderAuditEventClass[]       default: []
  comments        TenderReviewCommentClass[]    default: []
  createdAt       Date
  updatedAt       Date

TenderAuditEventClass
  _id             ObjectId  (auto)
  rowId           ObjectId              (the affected row's _id)
  rowDescription  String                (snapshot of row.description at time of change)
  action          "row_added" | "row_deleted" | "row_updated"
  changedFields   String[]              (subset of tracked fields that were present in payload)
  changedBy       ObjectId  ref: UserClass
  changedAt       Date

TenderReviewCommentClass
  _id             ObjectId  (auto)
  content         String    required
  author          ObjectId  ref: UserClass   required
  createdAt       Date
  editedAt        Date      optional
```

**Tracked fields for `row_updated`:**
`quantity`, `unit`, `unitPrice`, `markupOverride`, `rateBuildupSnapshot`, `extraUnitPrice`, `extraUnitPriceMemo`, `description`, `itemNumber`, `notes`

**File structure** (following existing Tender/TenderPricingSheet pattern):
```
server/src/models/TenderReview/
  schema/index.ts     — Typegoose schema classes
  class/
    index.ts          — TenderReviewClass (extends schema, registers model)
    create.ts         — createDocument(tenderId)
    get.ts            — getByTenderId(tenderId), getById(id)
    update.ts         — setStatus, addAuditEvent, addComment, editComment, deleteComment
server/src/typescript/tenderReview.ts   — shared TS interfaces/enums
```

---

## Step 3 — Server: Writing Audit Events

A static method `TenderReview.addAuditEvent(tenderId, event)` handles find-or-create of the `TenderReview` document and pushes the event. Resolvers call this after saving the sheet.

**Mutations to instrument** (add `@Ctx() ctx: IContext`):

| Mutation | Action recorded | changedFields |
|---|---|---|
| `tenderPricingRowCreate` | `row_added` | `[]` |
| `tenderPricingRowDelete` | `row_deleted` | `[]` |
| `tenderPricingRowUpdate` | `row_updated` | keys from update payload that are in the tracked whitelist |

For `row_updated`, if no whitelisted fields are present in the payload (e.g. a docRef-only update somehow routes here), skip writing an event.

**Not tracked:** `reorderRows`, `duplicateRow`, `autoNumber`, `updateDefaultMarkup`, `addDocRef`, `removeDocRef`, `updateDocRef`

---

## Step 4 — Server: TenderReview Resolver

New `TenderReviewResolver` at `server/src/graphql/resolvers/tenderReview/`.

All mutations/queries authorized `["ADMIN", "PM"]` to match existing tender resolver.

```
Queries:
  tenderReview(tenderId: ID!): TenderReviewClass

Mutations:
  tenderReviewSetStatus(tenderId: ID!, status: TenderReviewStatus!): TenderReviewClass
  tenderReviewAddComment(tenderId: ID!, content: String!): TenderReviewClass
  tenderReviewEditComment(tenderId: ID!, commentId: ID!, content: String!): TenderReviewClass
  tenderReviewDeleteComment(tenderId: ID!, commentId: ID!): TenderReviewClass
```

`tenderReview(tenderId)` creates the document if it doesn't exist (lazy init), so callers never get null.

UserClass refs (`changedBy`, `author`) are populated via field resolvers so the client receives full user objects.

---

## Step 5 — Client: Review Tab

### Desktop (`client/src/pages/tender/[id]/index.tsx`)

Add a fourth tab `Review` alongside the existing Pricing / Documents / Notes tabs.

New component: `client/src/components/Tender/TenderReviewTab.tsx`

### Mobile (`client/src/components/Tender/TenderMobileLayout.tsx`)

Add a fourth bottom tab `Review` to the existing tab bar. New component: `client/src/components/Tender/TenderMobileReviewTab.tsx` (simplified layout of the same content).

### TenderReviewTab layout

```
┌─────────────────────────────────────────────┐
│  Status: [Draft ▾]   [Mark as In Review]    │
├─────────────────────────────────────────────┤
│  Timeline (newest at bottom)                │
│                                             │
│  ● Devin added row "Supply HMA"   2d ago    │
│  ● Devin updated A.1.3            1d ago    │
│    unitPrice, quantity                      │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ Sam  "Check the trucking rate here"  │   │
│  │                              1d ago  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ● Devin updated A.1.3            3h ago    │
│    unitPrice                                │
│                                             │
├─────────────────────────────────────────────┤
│  [Add a comment...              ] [Post]    │
└─────────────────────────────────────────────┘
```

**Timeline rendering:**
- Merge `auditLog` and `comments` arrays, sort by timestamp ascending
- Audit events: compact activity row with user avatar, name, row description, changed fields, relative timestamp
- Comments: card/bubble with author, content, relative timestamp; edit + delete shown to comment author only
- Empty state: "No activity yet — changes to this sheet will appear here."

**Status control:**
- Badge showing current status with distinct colours (`Draft` = grey, `In Review` = blue, `Approved` = green)
- A single button cycles to the logical next state, or a simple dropdown to set any state directly

### GQL fragments needed (client)
- `TenderReviewFragment` — full document including populated `changedBy` / `author` user fields (name, avatar)

---

## Out of Scope

- Email/push notifications when comments are posted (small office, in-person communication suffices)
- Requesting review from a specific user
- Field-level old/new value diffing
- Audit trail for reorders, duplicates, auto-number, default markup, or doc ref changes
- Cross-tender audit queries
