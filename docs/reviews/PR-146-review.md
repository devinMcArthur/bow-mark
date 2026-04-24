# PR #146 Review — feat: unified file system + daily report polish + e2e coverage

**Reviewer:** Hermes (Claude Opus 4.7, delegated across 3 focused sub-reviews)
**Date:** 2026-04-24
**Scope:** 41 commits · 379 files · +39,944 / −7,781
**Branch:** `feat/unified-file-system` → `master`
**Verdict:** ⛔ Do not merge yet — 10 blockers + 5 failing tests on the branch

This file is intended as a handoff for Claude Code to work through
remaining fixes. Each finding has a file:line citation and a concrete
recommended action.

---

## How to use this doc

1. Work top-to-bottom through **🔴 Critical** — each one is a merge-blocker.
2. Clear the **Failing tests on the branch** section before opening the PR for merge (CI should actually be green).
3. **⚠️ Warnings** can land in a follow-up PR if schedule demands, but flag them in the PR description so they aren't forgotten.
4. **💡 Suggestions** are backlog-grade.
5. **✅ Looks Good** is there so nothing solid gets accidentally refactored away during cleanup.

---

## 🔴 Critical (merge blockers)

### Auth / data leakage

**C1. FileNode mutations missing `@Authorized()`**
File: `server/src/graphql/resolvers/fileNode/mutations.ts` (L91–643)
`ensureEntityRoot`, `ensureInvoiceFolder`, `ensureFolderPath`, `createFolder`, `renameNode`, `trashNode`, `restoreNode`, `moveNode` — none have an auth decorator. type-graphql's default is "no gate," so an unauthenticated caller can rename/trash/move anyone's files. Only `setFileNodeMinRole` and `uploadDocument` are protected.
**Fix:** Add `@Authorized()` (or role-specific variants) to every mutation.

**C2. `domainEvent` subscription unauthenticated**
File: `server/src/graphql/resolvers/domainEvent/index.ts` (L24)
No `@Authorized()`, no entity-level permission check. Any WS client can subscribe to any entity's full event stream — payloads include forward/inverse JSON patches which may contain PII, financial numbers, and internal notes.
**Fix:** Add `@Authorized()` + per-entityType permission gate inside `subscribeDomainEvents` (allow-list of entity types with a resolver function that checks the subscribing user can read the target).

**C3. `entityPresence` subscription unauthenticated**
File: `server/src/graphql/resolvers/entityPresence/index.ts`
Same problem — anon clients can enumerate viewer lists per entity.
**Fix:** Add `@Authorized()` + entity-level read check.

### Data integrity

**C4. trash/restore asymmetry causes data loss + stuck enrichments**
File: `server/src/graphql/resolvers/fileNode/mutations.ts` (trashNode L464–580 vs restoreNode L646–720)
`trashNode` cascade-stamps `deletedAt` on every descendant with a shared timestamp. `restoreNode` restores only the clicked node — descendants stay `deletedAt` forever. Also, trash orphans enrichments via `shouldEnrichNow` post-commit, but restore does NOT re-run enrichment re-evaluation → Enrichment stuck in terminal `orphaned` state even though the placement is live again.
**Fix:** In `restoreNode`, restore the subtree where `deletedAt === node.deletedAt`, and call `reevaluateEnrichmentAfterMove` on the affected document ids.

**C5. `DomainEvent` ObjectId fields persisted as `Mixed`**
File: `server/src/models/DomainEvent/schema/index.ts`
Typegoose warns at model build:
`Setting "Mixed" for property DomainEventSchema.{actorId, onBehalfOf, entityId, causedByEventId}` and `DomainEventRelatedEntityClass.entityId`.
`@prop({ required: true })` with a TS type of `Types.ObjectId` does NOT tell typegoose the runtime type. Consequences: no string→ObjectId casting, no `ref`-based populate, string-id queries silently mismatch.
**Fix:** Declare explicitly: `@prop({ type: mongoose.Schema.Types.ObjectId, required: true })` (and add `ref` where applicable).

**C6. Migration silently drops jobsites with string-form `minRole`**
Files:
- `server/src/scripts/migrate-file-system/02-jobsiteEnrichedFiles.ts:86`
- `server/src/scripts/migrate-file-system/03-jobsiteFileObjects.ts:107`

Legacy `Jobsite.enrichedFiles[].minRole` / `fileObjects[].minRole` is typed `string` in the migration typedefs — some production rows are string form (e.g. `"ProjectManager"`). `FileNode.minRole` schema is `Number` (UserRoles enum). Mongoose `CastError` on non-numeric-string values → jobsite silently skipped into `report.errors`, or (worse) stored as `NaN`.
**Fix:** Normalize via `roleWeight(entry.minRole)` or a `string → number` map before insert.

### Operational

**C7. `domainEventStream` queue is unbounded → OOM risk**
File: `server/src/lib/domainEventStream/index.ts:60`
`queue: DomainEventDocument[]` has no max size. Slow WS consumer or paused client + `fullDocument: "updateLookup"` = burst load OOMs the pod. Queue holds full Mongoose documents, not lean — expensive per entry.
**Fix:** Ring-buffer cap with drop policy (drop oldest + emit a "dropped N events" marker the resolver can surface; or close the stream on overflow).

**C8. `entityPresence` TTL never fires without a call**
File: `server/src/lib/entityPresence/index.ts`
TTL is lazily enforced only inside `listPresence()` → `sweep()`. `heartbeat()` does not sweep. Once all viewers stop heart-beating, entries persist forever — subscribers never transition to "empty viewer list." The existing test only passes because it explicitly calls `listPresence`.
**Fix:** Either a single `setInterval` sweeper, or schedule a per-entity timer on the next-to-expire entry and `emit(key)` after expiry.

### Client

**C9. `viewerRole` check is always false → PMs/Admins can't delete others' entries**
File: `client/src/components/DailyReport/DailyReportTimeline.tsx:50–51`
```ts
const viewerRole = (user as any)?.role as number | undefined;
```
passed to `DailyReportEntryCard`, which gates with:
```ts
// DailyReportEntryCard.tsx:80
const isPmPlus = typeof viewerRole === "number" && viewerRole >= 2;
```
`UserRoles` is a **string** enum (`User`/`ProjectManager`/`Admin`/`Developer`). `typeof === "number"` is never true → `canManage = isAuthor || isPmPlus` collapses to `isAuthor`. PMs and Admins silently lose the Delete menu on entries they didn't author, despite the code comment claiming otherwise.
**Fix:** Change prop type to `UserRoles`; gate with `hasPermission(viewerRole, UserRoles.ProjectManager)`.

**C10. Composer unmount leaks object URLs**
File: `client/src/components/DailyReport/DailyReportComposer.tsx:103–110`
```ts
React.useEffect(() => {
  return () => { attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```
Empty deps → cleanup captures `attachments` from first render (always `[]`). User navigates away with files queued → nothing revoked.
**Fix:** Use a ref updated on every render (`attachmentsRef.current = attachments`), iterate the ref in cleanup.

### Failing tests on the branch (5)

**T1. `server/src/lib/fileTree/__tests__/entityRootWiring.test.ts` (3 failing)**
Commit `ab061822` claims "provision reserved roots transactionally on Tender/Jobsite/DailyReport create." In practice, `Tender/class/create.ts`, `Jobsite/class/create.ts`, and `DailyReport/class/create.ts` do NOT call `createEntityRoot` — they carry a comment saying "provisioned lazily." The wiring test expects the root to exist immediately after `createDocument` and fails.
**Fix:** Either (a) actually wire the call inside the `eventfulMutation` session as the commit claims, or (b) delete the stale test and amend the commit narrative.

**T2. `server/src/scripts/migrate-file-system/__tests__/reportNotes.test.ts` (2 failing)**
Test creates a `ReportNote` but never sets `DailyReport.reportNote`. The migration iterates `DailyReport.find({ reportNote: { $exists, $ne: null } })`, so the fixture is invisible and assertions fail.
**Fix:** Update the test fixture to link the `DailyReport` to its new `ReportNote`.

---

## ⚠️ Warnings (fix this week)

### Backend

- **`uploadDocument` has no size cap** — `server/src/graphql/resolvers/document/index.ts:91-244`. `getBuffer(upload.createReadStream())` buffers the entire upload into memory before any validation. Large or concurrent uploads → OOM. Apply a size limit during stream consumption.
- **`fileTree/bootstrapRoots.ts` + `createEntityRoot.ts`** — `findOne`-then-`create` race on concurrent pod startup. E11000 escapes to caller. Use `updateOne({...}, {$setOnInsert:...}, {upsert:true})` like `ensureInvoiceFolder` does; or the try/catch-E11000-and-refetch pattern in `mutations.ts:242-265`.
- **`moveNode` allows moves INTO namespace folders** — no guard preventing a move into `/tenders` root directly (bypassing per-entity root). Also no guard against moving into a `systemManaged` folder (e.g. AI-managed tender categories, Invoices/Subcontractor). Breaks `resolveDocumentsForContext` assumptions. Fix by rejecting `dest.isReservedRoot && dest.parentId === rootFs._id` and systemManaged destinations (unless Admin).
- **GraphQL `document(id)` weaker than HTTP `/api/documents/:id`** — `server/src/graphql/resolvers/document/index.ts:69`. Comment says "matches HTTP endpoint (JWT-only, no per-file ACL)" but `server/src/router/documents.ts:51-85` actually applies per-placement `minRole`. GraphQL is the softer path. Apply the same ACL or update the comment.
- **N+1 on FileNode field resolvers** — `fileNode/index.ts` `createdByName`, `deletedByName`, `uploadedByName`, `mimetype`, `enrichment` each do fresh `findById`. Comment claims "in-request memoization" but `resolveUserName` has no cache. Use a per-request DataLoader.
- **Migration `01-enrichedFiles.ts:56-64` assumes `storageKey = file._id.toString()`** — if ANY legacy `File` was stored under a different key shape (e.g. under `description`), migration hardcodes the wrong key and future downloads 404. **MUST be validated against prod S3 before running.**
- **No migration rollback plan / runId tagging** — if migration produces bad data, there's no clean undo. Recommend at minimum adding a `migrationRunId` to `metadata` on each new `Document`/`Enrichment`/`FileNode` row so ops can delete-by-run.
- **Migration runs concurrently with live writes** — no lock, no freeze. Racey trees if run on live prod. Schedule a maintenance window or gate uploads for the run.
- **`eventfulMutation` missing idempotency-key short-circuit** — model has `{idempotencyKey: 1}` sparse-unique index but helper never probes. Duplicate submits bubble as generic errors. Probe first; catch E11000 and convert to `IdempotentReplayError`.
- **`entityVersion` plugin has no hook for `findOneAndUpdate`/`updateOne`/`updateMany`** — direct writes silently bypass version bumps. Add a pre-hook that either auto-increments via `$inc` or warns/throws when the caller didn't specify a version precondition.
- **`entityPresence` is a single-pod primitive** — in-memory `Map` means two API pods see disjoint viewer lists. Process restart = all presence lost. Nothing documents this constraint. Either document it or plan a Redis backend.
- **`domainEventStream` swallows errors silently** — `stream.on("error", () => close())` with no log, no reject of pending `resolveNext`. MongoDB-not-a-replica-set = silent failure. Log via `@logger`, reject the pending iterator promise.
- **`domainEvent` subscription crashes on malformed entityId** — `new mongoose.Types.ObjectId(entityId)` throws synchronously for non-24-hex input; tears down the WS connection. Validate with `mongoose.isValidObjectId` first.
- **Migration `05-tenderFiles.ts:230`** — orphan-root `deleteOne` with no children-count guard. A concurrent subfolder creation between scan and delete leaves a dangling child. Either guard with `findOneAndDelete` + children-count, or just keep empty roots (lazy cleanup is safer).

### Client

- **`client/src/components/FileBrowser/index.tsx` is 2204 lines** — breaks CLAUDE.md's per-concern-file guidance by ~7×. Decompose:
  - `gql.ts` (NODE_FIELDS + operations, ~120 LOC)
  - `types.ts` (`FileNodeRow`, `EnrichmentGql`, `ROLE_LABELS`, `MIME_LABELS`)
  - `PropertiesDrawer.tsx`, `EnrichmentIndicator.tsx`
  - `useFileBrowserDrag.ts` (ghost image, spring-load, drop handlers)
  - `useFolderUpload.ts` (ensureFolderPath + concurrency pool + cancel ref)
  - `FolderUploadModal.tsx`, `FileRow.tsx`, `RowActionsMenu.tsx`, `Breadcrumb.tsx`
  The main component becomes ~200 LOC of composition, and `collectDroppedEntries` / `uploadEntries` gain testable seams.
- **`DailyReportTimeline` `DEFAULT_VISIBLE = 0`** — after `createEntry` + refetch, the new entry lands in the collapsed tail. User's just-posted entry appears to vanish. Header comment "new posts always land in-view" contradicts this. Default to 3–5.
- **BulkForm invoice upload is sequential** — `BulkForm.tsx:170-199` does `for (const line...) await line.fileRef.current.prepare()`. 20 rows × 2MB = minutes of spinner. Mirror `FileBrowser`'s `UPLOAD_CONCURRENCY = 3` pool.
- **BulkForm failure recovery is lossy** — on any single error, handler toasts + returns. Already-uploaded files are now orphaned `FileNode`s not referenced by any `Invoice`. Upload everything with `Promise.allSettled`, then create invoices; or surface `documentId` back so the user can retry without re-upload.
- **FileBrowser rename race: onBlur + Enter double-submits** — `FileBrowser/index.tsx:1812-1818` wires both `onBlur={() => submitRename(c)}` and Enter → `submitRename`. Enter triggers submit, auto-blurs → onBlur fires second submit → 409 from version mismatch depending on timing. Track a "submitted" flag or clear `renamingId` before dispatching the mutation.
- **Apollo cache staleness** — `uploadDocument` refetches `fileNodeChildren`/`fileNodeBreadcrumbs` but NOT host entity fields. First file upload flips `jobsite.documents` presence, but `DailyReportFullQuery`'s cached copy doesn't refresh until hard reload. Either refetch `JobsiteFullDocument` on upload, or wire a subscription.
- **`(invoice as any).documentId`** in `InvoiceUpdateForJobsite.tsx:94` and `UpdateForJobsiteMaterial.tsx:94` — generated `InvoiceCardSnippetFragment` already exposes `documentId?: string | null`. Drop the cast + eslint-disable.
- **`useFolderUpload` swallows errors to `console.error`** — `FileBrowser/index.tsx:1116, 1161`. The "N failed" modal state never surfaces the *reason*. Track `lastError` and show it.
- **FileBrowser drag payload uses stale version** — `doMove` (line 973): `children.find(...)?.version ?? payload.version`. If row dragged from breadcrumb's hidden-ancestors dropdown (not in `children`), falls back to drag-start version → version race.
- **Spring-load `setState` after unmount** — `FileBrowser/index.tsx:921-925`. User navigates during 800ms spring-load window → warning in React 17. Add a `mountedRef.current` check.
- **Composer attachment id collision** — `DailyReportComposer.tsx:124` uses `${Date.now()}-${i}-${f.name}`. Two rapid clicks in same ms can collide. Use `crypto.randomUUID()`.
- **Infinite-retry on `ensureRoot` failures** — `FileBrowser/index.tsx:625-655`. `ensuringRef` clears on rejection; every subsequent click re-fires the failing mutation. Add short backoff.
- **Client-side traceparent in sessionStorage** — `client/src/lib/traceparent.ts`. XSS-exfiltrable. Low-value but document the threat model or keep in module scope only.

---

## 💡 Suggestions (non-blocking, backlog-grade)

- `resolveUniqueChildName` loops 2..999 linearly — parse existing suffixes and pick next free in one pass.
- `collectPathChain` in `enrichmentPolicy` is O(placements × depth) — collapse with a `$graphLookup` upward.
- Migration `index.ts`: wrap each step in try/catch so one crash doesn't abandon the rest.
- Extract reused client helpers:
  - `formatThousands`/`parseThousands` (duplicated in `BulkForm.tsx` and `Form.tsx`) → `utils/currency.ts`
  - `buildThumbUrl` / `buildDocumentUrl` → `utils/documentUrl.ts`
  - kind → folder-name map (duplicated client `FileAttachment.tsx` footer text and server `ensureInvoiceFolder` resolver) → shared constants module
  - Positioned menu (duplicated in `FileBrowser` empty-space + row context menu, lines 1946–2091) → `PositionedMenu` component
- Single-click rename delay (`DOUBLE_CLICK_MS = 220ms`) makes folder navigation feel laggy. Desktop convention: double-click = open, F2 or context menu = rename.
- `jsonPatch/index.ts`: `op.op !== "test"` filter is dead (`fast-json-patch.compare` doesn't emit test) — comment or remove.
- `eventfulMutation`: cascades silently override caller-supplied `causedByEventId`. Either respect caller value or throw if both set.
- `eventfulMutation`: return inserted event id(s) alongside `result` for callers needing ack semantics.
- `entityVersion` plugin: guard against double-add (if model already declares `version`).
- `entityPresence`: per-user-per-entity heartbeat debounce (≥1/s) to prevent kHz fan-out storms.
- `traceparent` middleware: add `"traceparent"` to `Access-Control-Expose-Headers` if the browser client needs to read it cross-origin.
- `DomainEvent` audit log: no TTL or capped-collection config. Budget capacity, at least in a comment.
- `DailyReportCard` inline-renders the full `DailyReportClientContent` (L349). Many expanded cards each mount their own full query + subscription. Consider a narrower "inline" variant.
- `filterDailyReports` (DailyReportListCard): fuzzy dayjs parse the raw query first so `2026-04-23` matches correctly.
- `MAX_FILES_PER_UPLOAD` (100) + `MAX_FILE_BYTES` (250MB) are client-only; mirror server-side and keep client as UX pre-check.

---

## ✅ Looks Good (don't refactor away during cleanup)

- `moveNodeCore` (`FileNode/class/move.ts`) — `$graphLookup` cycle detection, destination-not-in-subtree check, sibling uniqueness, OCC via `findOneAndUpdateVersioned`, post-commit (not in-transaction) enrichment publish. Clean design.
- Stable IDs across migration: `Document._id === EnrichedFile._id` preserves existing chat citations and `/api/documents/:id` links. Clever reference-preservation.
- Partial unique index `{parentId, normalizedName}` with `deletedAt:null` filter — right shape for sibling uniqueness with soft delete.
- Legacy adapter (`resolveDocumentsForContext`) gracefully falls back from new to old shape. Good transitional design.
- `restoreNode` sibling-collision guard (mutations.ts:681-697) correctly handles the partial-index blind spot for restored nodes.
- Post-commit side effects (storage upload, rabbit publish) correctly placed OUTSIDE the `eventfulMutation` transaction.
- `roleWeight` normalizes numeric/string role values — defensive against legacy string roles (apply this pattern to C6 migration fix).
- `ensureFolderPath` duplicate-key recovery (mutations.ts:242-265) models the right concurrency pattern; other helpers should mirror.
- ALS / traceparent primitives: parent restoration works, `withChildSpan` regenerates spanId only, no-op when no parent. Well-tested.
- `eventfulMutation` rollback semantics — state + events both roll back under plain throw, `EventfulMutationRollback`, and `StaleVersionError`. Solid.
- `DomainEvent` index set (entity+at, related.entity+at, actor+at, session+at, type+at, at, idempotencyKey) — matches expected access patterns.
- `DailyReportCard` accessibility: `role=link`, `tabIndex=0`, Enter/Space handler, `aria-label` with report date, nested action buttons call `stopPropagation`. Well done.
- `InvoiceFileAttachment` three-state ref handle (`prepare()`) cleanly decouples upload orchestration from RHF submit.
- `EntityFileBrowser` is a tight 91-LOC wrapper with a well-documented lazy-`ensureRoot` hook.
- `FileBrowser` concurrency primitives: `ensuringRef` coalescing, debounced `refetchAll` (100ms) to collapse subscription bursts, concurrency-capped upload pool (3), cancel ref, spring-loaded folders with cancel-on-unmount.
- Reserved-root / systemManaged / minRole gating in row menus matches server policy (hides instead of erroring).
- `DailyReportQuickStart` / `OperatorDailyReportQuickStart` — well-scoped, memoized, local-TZ "today?" check correct.
- `DailyReportEntryCard` distinguishes "edited" from "created within 1s" (L146-150) — avoids edited-badges from server clock skew.
- Invoice create mutations consistently invalidate via `refetchQueries: [JobsiteFullDocument]` / `JobsitesMaterialsDocument`.
- 33/34 e2e passing; the 1 flake is pre-existing (per PR description).

---

## Pre-deploy checklist (run this before flipping to `production`)

- [ ] All 🔴 Critical fixes landed
- [ ] All 5 failing unit tests fixed or deleted with explanation
- [ ] `cd server && npm test` — all green
- [ ] `cd client && npm run codegen && npm run type-check` — clean
- [ ] `cd client && npm run test:e2e` — 33+ green (1 known flake acceptable)
- [ ] Migration `01-enrichedFiles.ts` `storageKey` shape **validated against a prod S3 sample**
- [ ] Migration rollback strategy documented (runId tagging or Mongo surgery runbook)
- [ ] Maintenance window scheduled OR upload routes gated during migration run
- [ ] Old Google Maps API key revoked in GCP Console (per PR description post-merge step)
- [ ] `kubectl config current-context` confirmed before any production deploy

---

*Reviewed by Hermes (delegated across 3 parallel Claude Opus 4.7 sub-agents). Ping if any finding needs re-investigation.*
