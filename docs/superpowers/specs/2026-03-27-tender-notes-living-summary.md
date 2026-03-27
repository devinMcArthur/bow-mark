# Tender Notes & Living Job Summary — Design Spec

## Goal

Make the tender chat system two-way: Claude accumulates job context over time rather than being stateless between conversations. Two complementary features: (1) human-sourced **notes** saved mid-conversation with Claude's assistance, and (2) a Claude-authored **living summary** synthesized from documents + notes that stays current as the job evolves.

## Architecture Overview

Three loosely coupled pieces:

1. **Data layer** — two new fields on `TenderSchema`: `notes` (array of discrete facts) and `jobSummary` (Claude's synthesized narrative). Mutations via GraphQL for note CRUD and manual summary regeneration.
2. **MCP tools** — a new `server/src/mcp/tools/tender.ts` registering `save_tender_note` and `delete_tender_note`. Tender chat gets its own MCP server instance.
3. **UI** — tender page restructured into top-level tabs. Job/Summary/Notes share the two-panel layout with chat always visible on the right. Pricing (future) breaks out full-width.

---

## Data Model

### `TenderNoteClass`

```typescript
@ObjectType()
class TenderNoteClass {
  _id: ObjectId
  content: string        // the saved note text (drafted by Claude, confirmed by user)
  savedAt: Date
  savedBy: Ref<User>     // for display in the UI
  conversationId: string // traceability back to source conversation
}
```

### `TenderJobSummaryClass`

```typescript
@ObjectType()
class TenderJobSummaryClass {
  content: string          // markdown narrative (five sections)
  generatedAt: Date
  generatedBy: "auto" | "manual"
  generatedFrom: string[]  // enrichedFile _ids + note _ids used — staleness detection
}
```

### Updated `TenderSchema`

```typescript
notes: TenderNoteClass[]       // default []
jobSummary?: TenderJobSummaryClass
```

**Staleness detection:** compare `jobSummary.generatedFrom` against current ready file IDs + note IDs. If any are missing, the summary is stale and the UI shows a stale indicator.

---

## Summary Generation

### Function: `generateTenderSummary(tenderId: string)`

Located in `server/src/lib/generateTenderSummary.ts`.

**Steps:**
1. Load tender with all `ready` enriched files and all notes
2. Build text-only context from each file's `summary.overview`, `summary.keyTopics`, and `pageIndex` entries — no PDF loads
3. Single Sonnet call with a structured prompt requesting five sections:
   - **Scope** — what work is being done, where, at what scale
   - **Key Requirements** — critical spec constraints, materials, standards
   - **Risks & Gotchas** — site conditions, owner quirks, human-flagged concerns
   - **Addendum Changes** — what changed from the original contract, chronologically
   - **Outstanding Items** — unresolved conflicts, missing information, things Claude flagged as uncertain
4. Write result to `tender.jobSummary` with `generatedFrom` populated

**Triggers:**
- After an enriched file's `summaryStatus` flips to `ready` in `enrichedFileSummaryHandler` — only if the tender has no other files in `pending` or `processing` state
- After a note is saved or deleted (via GraphQL mutation post-hook)
- Manual regeneration via `tenderRegenerateSummary` GraphQL mutation

**Not queued** — synchronous Sonnet call on text-only input, fast enough to run inline.

---

## MCP Tools

New file: `server/src/mcp/tools/tender.ts`

### `save_tender_note`

```
description: "Save an important piece of information to the tender's permanent
job notes. Only call this AFTER the user has confirmed they want to save it.
Always draft the note content in your message first and ask 'Should I save
that to the job notes?' before calling this tool. Never call this tool
without explicit user confirmation."

input: {
  content: string      // note text, already confirmed by user
  conversationId: string
}
```

`tenderId` is injected server-side from the authenticated request — Claude never supplies it.

### `delete_tender_note`

```
description: "Delete a previously saved note from the tender's job notes.
Only call this if the user explicitly asks to remove a specific note."

input: {
  noteId: string
}
```

**Separate MCP server instance** from the analytics MCP server used by PM jobsite chat. Tender chat doesn't need analytics tools; keeping them separate avoids a bloated tool list.

---

## Tender Chat System Prompt

Notes and summary injected after the file index:

```
## Job Notes
{list of notes, one per line: "- {content} (saved by {name}, {date})"}

## Job Summary
{jobSummary.content if exists, else omitted}
```

Claude reads these as context at the start of every conversation, so accumulated knowledge is immediately available without any tool calls.

---

## GraphQL Mutations

- `tenderSaveNote(tenderId, content, conversationId)` — called by MCP tool server-side
- `tenderDeleteNote(tenderId, noteId)` — called by MCP tool and directly by UI delete button
- `tenderRegenerateSummary(tenderId)` — triggers `generateTenderSummary`, returns immediately (client polls)

---

## UI

### Tab Structure

Top-level tabs spanning the full tender page:

```
[ Job ]  [ Summary ]  [ Notes ]  [ Pricing ]
```

- **Job, Summary, Notes** — two-panel layout: left panel (starting at 420px, likely to grow) + right chat panel (always visible regardless of active tab)
- **Pricing** — full-width, chat hidden

### Job Tab
Current layout preserved: TenderOverview at top, Documents below with independent scroll so documents are always reachable without scrolling past overview.

### Summary Tab (left panel)
- Job summary rendered as markdown (five sections)
- "Last generated X ago" timestamp
- Stale indicator when `generatedFrom` doesn't match current files/notes: "New files or notes have been added since this summary was generated — regenerate to update"
- "Regenerate" button → calls `tenderRegenerateSummary` → left panel shows spinner → polls until `generatedAt` updates
- Empty state when no summary exists yet: "No summary generated yet. Add documents and regenerate."

### Notes Tab (left panel)
- List of saved notes, each showing:
  - Note content
  - Saved by (name) + timestamp
  - Delete button (no confirmation modal — Claude already vetted the content on the way in)
- No "add note" form — notes only enter via chat conversation
- Empty state: "No notes saved yet. Claude will suggest saving important context during conversations."

### Chat Panel
- Always visible on Job, Summary, and Notes tabs
- No changes to chat behavior — note saving happens naturally mid-conversation

---

## Enrichment Pipeline Integration

In `enrichedFileSummaryHandler.ts`, after `summaryStatus: "ready"` is written:

```typescript
// Check if this file belongs to a tender and if all tender files are now ready
const tender = await Tender.findOne({ files: enrichedFileId });
if (tender) {
  const allReady = tender.files.every(/* summaryStatus === "ready" */);
  if (allReady) {
    await generateTenderSummary(tender._id.toString());
  }
}
```

Note: the enrichment handler currently doesn't know about tenders. A reverse lookup (`Tender.findOne({ files: enrichedFileId })`) is needed. This is a cheap query and runs after all the heavy work is done.

---

## Out of Scope (this spec)

- Jobsite chat notes/summary — same pattern, built after tender is validated
- Note editing (only save + delete for now)
- Note categorisation / tagging
- Pricing tab implementation (separate feature branch already in progress)
