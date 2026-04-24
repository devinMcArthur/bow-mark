# Unified File System — Design (v3)

> Status: pre-implementation review draft. Revised twice after Codex adversarial review. Not a plan; plan follows after this design is validated.

## Problem

Bow Mark's file handling is fragmented across **six** distinct surfaces:

| Surface | Field | Notes |
|---|---|---|
| Tender | `tender.files[]: Ref<EnrichedFile>` | Primary tender docs |
| Tender | `tender.fileCategories[]` | AI-assigned flat grouping, denormalized `fileIds` |
| Jobsite | `jobsite.enrichedFiles[]` | Junction objects carrying per-file `minRole` |
| Jobsite | `jobsite.fileObjects[]` | Non-enriched raw files, deprecated pre-enrichment pipeline |
| System | `system.specFiles[]: Ref<EnrichedFile>[]` | Shared spec library, admin-only |
| DailyReport | `ReportNote.files[]: Ref<File>[]` | Report attachments |

Three existing collections with conflated responsibilities:

- **`File`** — raw storage record. Schema: `_id`, `mimetype`, `description` (used as filename), `createdAt`. Missing size/checksum/uploader/uploadedAt.
- **`EnrichedFile`** — wraps a File, carries the entire AI pipeline state machine (`summaryStatus`, `summaryAttempts`, `processingVersion`, `queuedAt`, `processingStartedAt`, `summaryError`, `summaryProgress`, `pageCount`, `pageIndex`, `summary`, etc.). Its `_id` is **load-bearing identity** — referenced by pricing sheet rows, viewer URLs, RabbitMQ messages, and MCP document tools.
- **Parent-entity fields** — where the file "lives" organizationally.

Four problems:

1. **No folder hierarchy.** Tender has a flat AI-assigned category layer; nobody else has structure. Users want nested folders, drag-drop, and an Explorer/Finder feel — their operational muscle memory is on a shared SMB drive.
2. **Enrichment is mandatory even when inappropriate.** Creating any "enrichable" file forces an `EnrichedFile` document, even for photos and attachments where AI summarisation has no business running.
3. **Identity is accidentally `EnrichedFile._id`.** Redesigns that dissolve `EnrichedFile` break pricing-sheet references, viewer URLs, and queue messages.
4. **`File.description` is overloaded as a filename.** Conceptually wrong; makes reasoning about naming harder than it should be.

## Goals

- Unified folder tree across every surface. Same model, same resolvers, same UI component.
- Identity separate from location (so moves and multi-placement don't break references).
- Enrichment opt-in per file, derived from current placement in the reserved-root namespace.
- Clean naming split — storage-level filename vs user-visible display name.
- Preserve all existing stable references (`EnrichedFile._id` values survive as `Document._id` values).
- Preserve the full enrichment state machine — no pipeline regressions.

## Architecture — three layers + enrichment sidecar

Every grown-up file system separates **bytes / identity / location**. Git (blob / ref / tree entry), Unix (data blocks / inode / dirent), Google Drive (content / fileId / parents[]) all land in the same shape. This isn't bias from current code — it's the durable answer.

```
File             Bytes + original filename. Immutable after upload.
  ↑
  │ currentFileId  (versionable later — one Document can reference
  │                 a new File over time)
  │
Document         Stable app-level identity. What pricing rows, URLs,
                 queues, MCP tools reference. Identity is permanent.
                 Optional annotation ("description"). No name here.
  ↑
  │ (1:1 in v1, 1:N later for re-enrichment history)
  │
Enrichment       AI-derived state machine + results. Sidecar, not a layer.
                 Writable authority for pipeline state. Absent when
                 current placements say "don't enrich."

  ↑ documentId  (1:N — one Document, many placements)
  │
FileNode         Placement. Where a Document appears in the tree.
                 Name (user-visible, renameable), parentId, ancestors,
                 permissions. Multi-placement replaces "link nodes."
```

**Not wrappers — separated concerns.** Collapse any two and you lose something real:

| Collapse | What breaks |
|---|---|
| File + Document | Versioning path (can't replace bytes while preserving refs); dedup |
| Document + FileNode | Moving a file changes identity — refs break, URLs 404 |
| File + FileNode (skip Document) | Same + no home for enrichment ownership |

### Layer 1: `files`
Bytes + provenance. Immutable.

- `_id`, `mimetype`, `size`, `storageKey`, `checksum?`.
- **`originalFilename: string`** — as uploaded (e.g. `"RFP-addendum-3.pdf"`). Immutable. Used for downloads (Content-Disposition). Replaces the current `File.description`-as-filename.
- `uploadedBy?: Ref<User>`, `uploadedAt: Date`.

Object-store key matches `_id` today; this continues to work via `storageKey = _id.toString()`.

### Layer 2: `documents`
Stable identity + optional annotation.

- `_id` — **migration preserves existing `EnrichedFile._id` values** so every persisted reference continues to resolve without rewriting.
- `currentFileId: Ref<File>` — the bytes backing this document today.
- `description?: string` — optional user-editable annotation. Distinct from filename. Free-form.
- `enrichmentLocked: boolean` — admin-set override. When `true`, path-based enrichment policy is ignored (no enqueue regardless of placement). Default `false`.
- Audit: `createdBy`, `createdAt`, `updatedAt`, `deletedAt?`, `deletedBy?`, `version` (OCC).

**No `name` field on Document.** Names live on placements (see FileNode below).

**No `shouldEnrich` / `uploadContext` field on Document.** Enrichment policy is derived from current placements on every placement-creating or placement-moving mutation (see "Enrichment policy" below). Whether the result of previous enrichment (the Enrichment sidecar) exists is a separate question from whether to enqueue new work.

### Layer 3: `enrichments`
Separate collection. Sole writable authority for pipeline state. One-to-one with Document in v1 (one-to-many later for re-enrichment history).

- `_id`, `documentId: Ref<Document>`, `fileId: Ref<File>` (which bytes this enrichment was derived from — may differ from `Document.currentFileId` after versioning).
- **Full state machine preserved from the current pipeline:**
  - `status: "pending" | "processing" | "ready" | "partial" | "failed" | "orphaned"`
  - `attempts`, `processingVersion` (stale-worker protection — the consumer depends on this)
  - `queuedAt`, `processingStartedAt`, `summaryError`
  - `summaryProgress` (chunked-phase progress reporting)
- Results: `summary`, `documentType`, `keyTopics`, `pageCount`, `pageIndex`, `chunks`.

The pipeline (`enrichedFileSummaryHandler`, watchdog, categorizer) migrates from "updating EnrichedFile" to "updating Enrichment" — state fields stay identical. No regressions in crash-safety or duplicate-delivery protection.

**Enrichment is permanent once created.** Moving a Document out of an enrichable path does NOT delete its Enrichment. The AI work is valid regardless of current placement; we don't throw it away. Re-entering an enrichable path does NOT re-enqueue if Enrichment already exists.

**Querying:** callers query `Enrichment.findOne({ documentId })` directly. No `currentEnrichmentId` pointer on Document — that would create two mutable write sites with split-brain risk.

### FileNode (placements)
Tree node. Only `"folder"` and `"file"` types. "Links" are just additional FileNodes pointing at the same Document (multi-placement).

- `_id`, `type: "folder" | "file"`, `parentId: Ref<FileNode> | null`.
- **`name: string`** — user-visible display name. What the tree shows. What users rename. Per placement (a Document in two folders can appear with two different names).
- At creation, `name` defaults to `File.originalFilename` (for file-type nodes) or whatever the user typed (for folder-type nodes).
- `normalizedName: string` — computed field for sibling uniqueness. **Unicode NFC + case fold + whitespace trim/collapse.** Unique index on `{ parentId: 1, normalizedName: 1, deletedAt: 1 }`.
- **`ancestors: Ref<FileNode>[]`** — denormalized chain from root to parent. Indexed. Used for subtree queries, breadcrumb rendering, ACL walks, cycle-prevention, reserved-root membership checks, deleted-ancestor filtering. Maintained transactionally on move.
- `sortKey: string` — stable ordering within a parent (independent of `_id`).
- For `type: "file"`: `documentId: Ref<Document>`.
- For `type: "folder"`: `description?: string`, `aiManaged: boolean` (true for folders owned by the AI categorizer).
- `minRole?: UserRoles` (inherits via ancestor walk).
- `isReservedRoot: boolean` — replaces `isSystemNode`; marks synthetic roots that cannot be renamed, moved, or deleted (`/`, `/system/`, `/tenders/`, `/jobsites/`, `/daily-reports/`, plus per-entity roots like `/tenders/<id>/`).
- Audit + soft delete + OCC `version`.

#### Tree write invariants

- **Sibling uniqueness** via normalized name (NFC + case-fold + trim/collapse).
- **Move is transactional**: moved node's `parentId` + `ancestors` updated; all descendants' `ancestors` rewritten via `updateMany` aggregation pipeline; all in one transaction alongside the DomainEvent. Cycle detection: destination must not already be in the moved subtree.
- **OCC on every write** via `findOneAndUpdateVersioned`. Concurrent drags of the same node → second fails with `StaleVersionError`.
- **Enrichment check on every placement-creating / placement-moving mutation** — if the new placement is under an enrichable reserved root and no Enrichment exists for the Document, enqueue one.

#### Soft delete and restore rules

- Trashing a folder: cascade `deletedAt`/`deletedBy` to every descendant in a transaction (one `updateMany`).
- Restoring a folder: fails if any ancestor is still deleted. UI must prompt for a new destination.
- Deleting a FileNode does NOT delete its Document — Document survives other placements may reference it.
- When the last non-deleted FileNode of a Document is trashed, the Document is also soft-deleted **unless durable back-references exist** (pricing sheet rows, MCP conversation refs, tender-chat history). If back-references exist: Document becomes a tombstone — still resolvable for legacy refs, rendered in UI as "document deleted" with no download link.
- Hard Document deletion: admin action only. Requires explicit acknowledgement of breaking back-references.

## Global tree namespace

Synthetic top-level roots, created idempotently at server startup. Not user-visible in v1.

```
/                  (root, reserved)
├── system/        (reserved)
│   └── specs/     (reserved)
├── tenders/       (reserved)
│   └── <tender-id>/   (reserved, auto-created per Tender)
├── jobsites/      (reserved)
│   └── <jobsite-id>/  (reserved, auto-created per Jobsite)
└── daily-reports/ (reserved)
    └── <daily-report-id>/  (reserved, auto-created per DailyReport)
```

Reserved roots cannot be renamed, moved, or deleted. Per-entity roots are created when the parent entity is created and cascaded when it's deleted. Surface components render the subtree rooted at their scope; users see "Files / Drawings / sheet-1.pdf" with no `/tenders/<id>/` prefix leaking.

## Enrichment policy

**Derived from current placements under reserved roots.** Not captured-at-upload; not stored on Document. Re-evaluated on every placement-creating or placement-moving mutation.

```ts
// Policy table — keyed on reserved root paths (immutable by design)
const ENRICH_UNDER_RESERVED_ROOT: Record<string, boolean> = {
  "/system/specs/":   true,
  "/tenders/":        true,
  "/jobsites/":       true,
  "/daily-reports/":  false,
};

// MIME capability gate — must match (or extend) current SupportedMimeTypes
const ENRICHABLE_MIMETYPES = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // mirror server/src/typescript/file.ts SupportedMimeTypes — no silent regression
]);

function shouldEnrichNow(doc: Document, placements: FileNode[]): boolean {
  if (doc.enrichmentLocked) return false;
  if (!ENRICHABLE_MIMETYPES.has(doc.file.mimetype)) return false;

  // ANY current placement under an enrichable reserved root triggers enrichment.
  return placements.some((p) => {
    const root = reservedRootFor(p);  // walks ancestors to nearest reserved root
    return ENRICH_UNDER_RESERVED_ROOT[root] === true;
  });
}
```

Rule invoked on:
- File upload (creates placement): if `shouldEnrichNow` and no Enrichment exists → enqueue.
- Folder drag (existing placement moves): if `shouldEnrichNow` and no Enrichment exists → enqueue.
- New placement added (multi-placement): same check.

**Enrichment is permanent once created.** Moving out of an enrichable path doesn't delete it. This is a one-way gate: "should we spend the API call right now to CREATE enrichment." Never "should we retroactively remove enrichment."

**Admin override:** `documentSetEnrichmentLock(id, locked)` mutation toggles `enrichmentLocked`. Used for sensitive files that should never be AI-processed even when placed under enrichable paths. Auditable via DomainEvent.

### Why path-based-under-reserved-roots, not upload-context-based

Earlier drafts used `uploadContext` captured at upload and stored immutably. Weakness:
- Real flow: user uploads into any surface; drags between surfaces later. Context captured at upload drifts from current reality.
- Doesn't compose with multi-placement (which placement's context is canonical?).

Path-based under reserved roots avoids both:
- Reserved roots are immutable by design — policy is stable.
- Multi-placement: "if ANY placement is enrichable, enrichment is enqueued." Single-answer policy.
- Drag-drop UX: drop a photo into `/tenders/` → gets enriched automatically. Natural.

## Permissions (v1)

- `minRole?` on any FileNode. Effective role = first `minRole` found walking up `ancestors`.
- Multi-placement: **strictest-wins across placements.** Access requires all placements' ancestor chains to grant the role. Anything less is a privilege-escalation-by-linking vulnerability.
- Entity-scoped ACLs ("only users on Tender X") explicitly **deferred** pending broader user-management overhaul.
- **Tree ACLs are advisory in v1, not a security boundary.** Current download endpoints (`/api/enriched-files/:id`, `File.downloadUrl` signed URLs, React-side filtering on `jobsite.fileObjects`) bypass any permission model and leak file contents to any authenticated user who knows an id. Fixing this is a separate **ACL hardening ticket**, not in Plan 2 scope. The design doc cannot advertise tree-level permissions as security without that hardening happening.

## Naming across layers

| Layer | Field | Purpose |
|---|---|---|
| `File` | `originalFilename` | Immutable, as uploaded. Used for download Content-Disposition. |
| `Document` | (none) | No name. Identity only. |
| `Document` | `description?` | Optional free-form annotation ("latest revision per January addendum"). |
| `FileNode` | `name` | User-visible display name. Per placement. Renameable. |
| `FileNode` | `normalizedName` | Computed for sibling uniqueness (NFC + casefold + trim). |

Single source of truth for what users see = `FileNode.name`. Multi-placement lets the same Document appear with different names in different locations without collision.

## What replaces what

| Existing | New equivalent |
|---|---|
| `tender.files[]` + `tender.fileCategories[]` | Documents + FileNodes under `/tenders/<id>/`. AI categorizer writes to `aiManaged: true` folders only. |
| `jobsite.enrichedFiles[]` with per-file `minRole` | FileNodes under `/jobsites/<id>/`, `minRole` preserved. Documents migrated from EnrichedFile. |
| `jobsite.fileObjects[]` | FileNodes under `/jobsites/<id>/`. Documents with no Enrichment (placement under /jobsites/ IS enrichable; but MIME gate excludes most of these, or users can drop `enrichmentLocked: true` on sensitive ones). |
| `system.specFiles[]` | FileNodes under `/system/specs/`. Documents migrated from EnrichedFile. |
| `ReportNote.files[]` | FileNodes under `/daily-reports/<id>/`. Documents with no Enrichment (placement under `/daily-reports/` is not enrichable). |
| `EnrichedFile._id` as durable reference | Preserved: `Document._id === EnrichedFile._id` after migration. No reference rewrites. |
| `EnrichedFile.summary`, `.pageIndex`, `.summaryStatus`, etc. | Moved to `Enrichment` record, keyed by `documentId`. `/api/enriched-files/:id` still works — resolver joins Document + Enrichment. |
| `File.description` used as filename | Renamed to `File.originalFilename`. `Document.description` is a separate optional annotation field. |

## AI categorizer interaction

Current `categorizeTenderFiles` does a full debounced overwrite of `tender.fileCategories[]`. Naive port to the tree would clobber user-made reorganizations on every upload.

**Isolation rule:**
- AI operates only on folders with `aiManaged: true`.
- `Document.aiCategorizable: boolean` (default `true` for Documents under `/tenders/`). Users can toggle by moving the file out of an AI-managed folder (flips to `false` automatically) or via an explicit context-menu action.
- The categorizer reads only `aiCategorizable: true` Documents and only writes to `aiManaged: true` folders.
- Users can move files OUT of AI-managed folders freely → `aiCategorizable` becomes `false` → categorizer leaves them alone.
- Users cannot move files INTO AI-managed folders (UI disallows; server rejects).
- The AI-managed subtree is disposable: the categorizer can drop all `aiManaged` folders and rebuild them on next run without touching user-organized content.

## Migration

### Single data migration, staged UI cutover

**Step 1 (atomic):** run backfill for ALL surfaces at once. Every existing `EnrichedFile` becomes a `Document` with the same `_id`. Every `File` gets new fields populated (see below). Enrichment records created from existing pipeline state. FileNodes created under the appropriate reserved roots. Old arrays (`tender.files[]`, etc.) stay populated.

**Step 2 (staged):** UI / writer / reader cutover per surface:
- **Phase A: DailyReport** — lowest risk, no AI chat integration.
- **Phase B: Jobsite** — `fileObjects[]` and `enrichedFiles[]` both cut over.
- **Phase C: Tender** — `files[]` and `fileCategories[]` cut over. AI categorizer refactored.
- **Phase D: System.specs** — last, because specs flow into every AI chat.

Each cutover: writers stop populating old arrays, readers switch to new shape, UI shows new tree.

**Step 3 (post-cutover):** drop old fields and any legacy handler code.

### Hybrid read layer

During Phases A–C, some code paths read across surfaces:
- Tender chat router includes both tender docs AND system specs
- MCP tools validate doc refs against tender + system specs
- Pricing sheet validation reads from both

Until System cuts over (Phase D), these three call sites use a **temporary compatibility shim** — `resolveDocumentsForContext(scope, id)` — that knows which surface has cut over and reads the appropriate shape for each. Returns a normalized shape to callers.

Lifecycle:
- Introduced in Phase A (first cutover).
- Shrinks per phase (after Phase C, only system-specs path remains on old shape).
- **Deleted in Phase D** once everything speaks the new shape.

A couple hundred lines of code, localized to three files (tender-chat router, MCP tools, pricing validation). Surface-by-surface UI ships can proceed independently.

### File metadata backfill

Existing `File` lacks several new-schema fields. Breakdown:

| New field | Backfill strategy |
|---|---|
| `storageKey` | Set = `_id.toString()` (matches current Spaces object keys). Trivial. |
| `originalFilename` | Copy from existing `File.description`. Rename/move. Trivial. |
| `uploadedAt` | Alias from `createdAt`. No-op at schema level. |
| `size` | Requires HEAD to Spaces per file. One-off script, tens of minutes for current volume. Can run async/post-migration. |
| `checksum` | Expensive (full bytes read). Defer indefinitely; compute only for new uploads. Legacy stays null. |
| `uploadedBy` | Unrecoverable for legacy data. Null + `legacyImport: true` flag. New uploads capture going forward. |

Most are schema-level aliasing. Only `size` requires real Spaces calls and can be deferred.

### Reference-preserving `_id`

Every `EnrichedFile._id` becomes a `Document._id`. Persisted references (`TenderPricingSheet.docRefs[]`, `/api/enriched-files/:id` URLs, RabbitMQ messages, MCP doc refs) resolve without any rewriting.

### Pipeline cutover

Enrichment consumer and watchdog currently read/write `EnrichedFile` as a single-doc atomic state container. Migration splits state into `Enrichment`. Cutover is **atomic, not dual-write**:

1. Drain the RabbitMQ `enriched_file_summary` queue (pause publishers, wait for consumer to clear backlog).
2. Run the data migration (EnrichedFile → Document + Enrichment).
3. Deploy the consumer + watchdog updates (read/write Enrichment instead of EnrichedFile).
4. Resume publishers.

No window where old and new writers both think they own a record. Total downtime for the pipeline is minutes, not a running dual-write risk.

### Migration failure handling

- **Idempotent backfill.** Uses `upsert` by `_id`.
- **Dry-run mode** logs without writing.
- **Orphan quarantine.** EnrichedFiles not referenced by any parent entity → dedicated `migration_orphans` collection with full metadata (status, summary, creation date) for manual reconciliation. Not surfaced in user-visible tree.
- **Pipeline-in-progress safety.** `processing` / `partial` EnrichedFiles migrate with full state (attempts, processingVersion, queuedAt, progress). After consumer cutover, they continue from where they left off.
- **Migration report** with exact counts per status — surfaces any anomalies.

## Tradeoffs acknowledged

- **`ancestors[]` rewrite costs on move.** Moving a folder with N descendants writes N documents in one transaction. Bounded by MongoDB transaction limits (~1000s of docs practical). Typical moves are <100 descendants. Large subtree moves (post bulk-import) may need batched or eventually-consistent fallback — model supports adding this later.
- **Multi-placement complicates "canonical path" queries.** Answer: there is no canonical path. UIs pick a breadcrumb from whichever placement is contextually relevant.
- **Pipeline cutover is sensitive.** Drain-and-switch window is a few minutes of paused enrichment. Acceptable given low traffic.
- **ACL bypass endpoints exist and v1 does not fix them.** Tree-level `minRole` is advisory until the separate ACL hardening ticket lands.
- **AI categorizer rework is the riskiest part.** Moving from "overwrite an array" to "manage an `aiManaged` subtree" is a behavioural rewrite.
- **Hybrid read layer lives for ~3 phases.** Temporary; deleted in Phase D.
- **File metadata is lazily-populated for legacy records.** `size` and `checksum` null until backfill or next touch. Accept trade-off.
- **MIME allowlist must match current `SupportedMimeTypes`** to avoid silent regressions on non-PDF enrichment.

## Key questions for reviewers (v3)

1. Path-based enrichment derived from current placements: does it introduce any race where a Document can have Enrichment enqueued while already enriching due to a second placement add? Queue-level dedup needed?
2. `Document.aiCategorizable` flips to `false` when a user moves a file out of an `aiManaged` folder. Is that the right trigger, or should it be explicit (context menu "opt out of AI")?
3. Hybrid read layer reads old-shape from surfaces that haven't cut over. During the window, does any writer on a cut-over surface accidentally reach back into old shape (e.g., a new-shape tender resolver writing to `system.specFiles`)? How do we statically catch this?
4. Soft-delete on last placement → tombstone when back-references exist. How do we efficiently check for back-references? (Pricing sheet rows live in a separate collection; chat history in another; MCP logs in another.) Is there a cheap "does any back-reference exist" query?
5. `normalizedName` is computed — server-side on write only, or also mirrored client-side for optimistic UI? If not mirrored, how do we give instant feedback on "name already taken" in drag-drop?
6. Per-entity root auto-creation: what happens if Tender is created but its root folder creation fails (partial write)? Transactional coupling between Tender creation and FileNode root creation?
7. Legacy `File` records with null `uploadedBy` — how do we render the UI for "who added this" on old files? Attribution fallback to parent-entity owner, or explicit "unknown"?

## Non-goals

- File versioning UI (model supports via `Document.currentFileId` — UI v2+).
- Deduplication (content-addressable `File.storageKey = sha256(bytes)`) — model-ready, not v1.
- Real entity-scoped permissions — blocked on broader user-management overhaul.
- ACL hardening of existing download endpoints — separate security ticket.
- Bulk import from external network drive — model allows it, not v1.
- Multi-replica `EntityPresence` (Redis adapter) — deferred.
- Client-side search UI across the whole tree — data supports it, UI deferred.
- Content-based search (find files by summary content) — Enrichment data available, search indexing deferred.

---

Review focus: path-based enrichment under reserved roots, hybrid read layer correctness, migration cutover safety (especially drain-and-switch for the pipeline), the 7 reviewer questions above.
