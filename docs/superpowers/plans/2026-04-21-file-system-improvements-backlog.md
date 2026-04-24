# File System Improvements — Backlog

Prototype (FileBrowser in /developer tab) is usable; multi-client realtime
sync works via the domainEvent subscription. Actor attribution was wired
alongside this doc (Apollo context fn mutates the ALS frame in-place;
eventfulMutation defaults actorId from ctx.userId).

Items below are deliberately deferred. Listed roughly by effort + value.

## Collaboration / concurrency

### Presence indicators (1–2 hrs)
Wire `entityPresence` + `presenceHeartbeat` (built in Plan 1, untouched
since). On folder navigation, start sending heartbeats with the current
FileNode _id; subscribe to viewers; render stacked avatars in the
toolbar. "3 people viewing this folder".

### Remote-action toasts (30 min, depends on actor attribution — done)
When a `fileNode.*` subscription event arrives from another client, show
a short toast: "Alice renamed Drafts → Archive". Uses event metadata
(oldName / newName / childType) + the newly-populated `actorId`
resolved to a display name. Surfaces that sync is working without the
user needing to know.

### "Undo" toast after destructive actions (30 min)
Gmail-style. After `trashNode` succeeds, the success toast gets an
**Undo** button that calls `restoreNode`. Auto-dismiss after 5s. Same
pattern for `moveNode` — Undo restores the previous parent via another
`moveNode`. Only for actions with natural inverses.

### Full undo/redo across every mutation (half day)
The DomainEvent schema already supports it — `diff: { forward, inverse }`
is the format. Today we store empty patches for FileNode events because
folder-level changes don't map cleanly to JsonPatch field ops. To turn
this on end-to-end: (1) populate real inverse patches for each mutation
type, (2) add a client-side undo stack keyed on the current session,
(3) add an `undoEvent(eventId)` mutation that reads the inverse patch
and applies it. Nice-to-have, non-trivial.

### Optimistic UI (1–2 hrs)
Apollo's `optimisticResponse` to show rename/create/trash results
instantly, then reconcile with the server response. Move is trickier
because multiple Apollo cache entries change; handle with a
`cache.modify` in the mutation's `update` callback. Biggest snappiness
win.

### Subscribe to ancestor breadcrumbs (30 min)
Currently only the current folder's _id is subscribed. If a DISTANT
ancestor (not the current folder) gets renamed or moved, the breadcrumb
stays stale. Fix: open one subscription per ancestor in the breadcrumb
chain and refetch crumbs on any event. Multi-subscription cost, but
ancestor-level mutations are rare.

### Conflict dialogs on OCC failures (30 min)
Today a `StaleVersionError` shows as a raw toast. Better: detect the
version mismatch, refetch the fresh version, prompt the user "this was
edited by <actor> while you were working — retry with their changes?".
Degrades gracefully when actor attribution is missing.

## UX polish

### Download filename for unrenamed files
`File.originalFilename` serves as the download filename today. If the
user renamed the FileNode, the downloaded file matches the display name
(via the `?filename=` query param on `/api/documents`). Double-check
this holds once we start using the FileBrowser from real surfaces.

### Right-click context menu (20 min, desktop-only)
Hybrid approach: keep the ⋮ button as the discoverable path, add
`onContextMenu` on rows to open the SAME menu anchored at the click
coordinates. Requires a hidden anchor element positioned absolutely at
the click point.

### Multi-select + bulk actions
Checkbox column; bulk trash, bulk move, bulk download-as-zip. Zip
download requires server-side archiving (probably stream through a
zip-stream lib).

### Search / filter within current folder
Trivial client-side filter on the name once folders get >20 items.
Server-side full-tree search is a separate feature — leverage
Meilisearch to index FileNode.name + enrichment summaries.

### Sort controls
Column headers clickable to sort by name / updatedAt / type. Currently
rows come back in `sortKey` order only.

### Drag-and-drop upload
Drop files onto a folder row to upload directly into it (instead of the
Upload button). Reuses the existing uploadDocument mutation.

### Drag-to-reorder (manual sortKey manipulation)
The plan's sortKey design (fractional indexing) supports insertion
between siblings without renumbering — when user drags a file between
two existing siblings, compute a new sortKey that fits between them.
Needs a small `updateSortKey` mutation plus drop-zone hit-testing
between rows.

## Real-surface cutovers

Plan 2B's actual goal — not yet started. Replace hand-rolled file
lists with the FileBrowser component in:

- `/tenders/[id]` — tender files + categories
- `/jobsites/[id]` — jobsite enriched files + file objects
- `/system` — spec files
- Daily reports — ReportNote attachments

Each cutover is small (the component works) but needs UX-level
decisions about embedding (inline vs tab vs modal) and scope handoff.
