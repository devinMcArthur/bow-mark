# Rate Buildup Tender Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Rate Builder canvas system into the Tender Pricing sheet so estimators can attach a rate buildup template to a line item, edit inputs/controllers, and have the unit price computed automatically.

**Architecture:** Each tender pricing row optionally stores a full `RateBuildupSnapshot` (a serialized `CanvasDocument` with `defaultInputs` removed and `params`, `tables`, `controllers`, `paramNotes?` sitting flat on the snapshot alongside `sourceTemplateId`) as a JSON string on `TenderPricingRowClass.rateBuildupSnapshot`. Template definitions carry `hint?` on `ParameterDef` and `ControllerDef` for author-written guidance shown read-only to estimators. The snapshot is lazy-loaded via a dedicated query. A new page at `/tender/[id]/pricing/row/[rowId]` renders `CalculatorCanvas` for canvas + LiveTestPanel editing. `CalculatorCanvas` is refactored to a pure controlled component (`doc + onSave`), with undo/redo living internally.

**Tech Stack:** React 17, Next.js 12, Chakra UI, Apollo Client, Type-GraphQL, Typegoose/Mongoose, expr-eval

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `client/src/components/TenderPricing/calculators/types.ts` | Modify | Add `hint?: string` to `ParameterDef` |
| `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts` | Modify | Add `hint?: string` to `ControllerDef`; add `RateBuildupSnapshot` type + snapshot helpers |
| `client/src/components/pages/developer/CalculatorCanvas/index.tsx` | Modify | Refactor to controlled `doc + onSave`; add internal undo/redo; remove header + template dropdown |
| `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx` | Modify | Add `initialInputs?` + `onInputsChange?` props; show `hint` read-only; show `paramNotes` editable textarea in snapshot context |
| `client/src/pages/pricing/rate-builder/[id].tsx` | Modify | Own the standalone header + undo/redo; pass `doc + onSave` to CalculatorCanvas |
| `server/src/models/TenderPricingSheet/schema/index.ts` | Modify | Add `rateBuildupSnapshot?: string` field to `TenderPricingRowClass` |
| `server/src/typescript/tenderPricingSheet.ts` | Modify | Add `rateBuildupSnapshot?: string` to `ITenderPricingRowUpdate` |
| `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts` | Modify | Add `rateBuildupSnapshot?` to `TenderPricingRowUpdateData` |
| `server/src/models/TenderPricingSheet/class/update.ts` | Modify | Assign `rateBuildupSnapshot` in `updateRow()` |
| `server/src/graphql/resolvers/tenderPricingSheet/index.ts` | Modify | Add `tenderPricingRowSnapshot(sheetId, rowId)` query |
| `client/src/components/TenderPricing/types.ts` | Modify | Add `rateBuildupSnapshot?: string \| null` to `TenderPricingRow` |
| `client/src/components/TenderPricing/PricingSheet.tsx` | Modify | Add `SNAPSHOT_QUERY`; update `handleUpdateRow` to accept `rateBuildupSnapshot` |
| `client/src/components/TenderPricing/LineItemDetail.tsx` | Modify | Replace old `calculatorType`/`CalculatorPanel` UI with rate buildup attach/edit UI |
| `client/src/pages/tender/[id]/pricing/row/[rowId].tsx` | Create | New page — lazy-loads snapshot, renders `CalculatorCanvas` for estimator editing |

---

## Task 1: Add `hint` to template definitions; add `RateBuildupSnapshot` type and helpers

**Files:**
- Modify: `client/src/components/TenderPricing/calculators/types.ts`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts`

`hint` on template definitions is author-written guidance shown read-only to estimators in LiveTestPanel. `RateBuildupSnapshot` stores all canvas structure from `CanvasDocument` (minus `defaultInputs`) with `params`, `tables`, `controllers`, and `paramNotes` sitting flat on the snapshot alongside `sourceTemplateId`.

- [ ] **Step 1: Add `hint?: string` to `ParameterDef` in `types.ts`**

In `client/src/components/TenderPricing/calculators/types.ts`, add to the `ParameterDef` interface:

```ts
hint?: string;
```

- [ ] **Step 2: Add `hint?: string` to `ControllerDef` in `canvasStorage.ts`**

In `canvasStorage.ts`, add to the `ControllerDef` interface:

```ts
hint?: string;
```

- [ ] **Step 3: Add the `RateBuildupSnapshot` type after the `CanvasDocument` interface**

In `canvasStorage.ts`, after the `CanvasDocument` interface, add:

```ts
// ─── RateBuildupSnapshot ──────────────────────────────────────────────────────

import type { RateEntry } from "../../../../components/TenderPricing/calculators/types";

/**
 * A frozen copy of a CanvasDocument attached to a tender pricing row.
 * `params`, `tables`, `controllers` replace `defaultInputs` — these are
 * job-specific values, not template defaults. `paramNotes` holds estimator
 * context notes keyed by param ID. `sourceTemplateId` is the server _id of
 * the template this was forked from.
 */
export interface RateBuildupSnapshot extends Omit<CanvasDocument, "defaultInputs"> {
  sourceTemplateId: string;
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
  controllers: Record<string, number | boolean | string[]>;
  paramNotes?: Record<string, string>;
}
```

- [ ] **Step 4: Add `snapshotFromTemplate` helper**

```ts
/**
 * Instantiate a snapshot from a template. Copies all canvas structure.
 * Controller defaults are seeded from controllerDefs.
 */
export function snapshotFromTemplate(template: CanvasDocument): RateBuildupSnapshot {
  const controllers: Record<string, number | boolean | string[]> = {};
  for (const c of template.controllerDefs ?? []) {
    if (c.type === "percentage")
      controllers[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
    else if (c.type === "toggle")
      controllers[c.id] = typeof c.defaultValue === "boolean" ? c.defaultValue : false;
    else if (c.type === "selector")
      controllers[c.id] = c.defaultSelected ?? [];
  }
  const { defaultInputs, ...rest } = template;
  return {
    ...rest,
    sourceTemplateId: template.id,
    params: { ...defaultInputs.params },
    tables: { ...defaultInputs.tables },
    controllers,
  };
}
```

- [ ] **Step 5: Add `snapshotToCanvasDoc` and `canvasDocToSnapshot` helpers**

```ts
/**
 * Convert a snapshot back to a CanvasDocument for rendering in CalculatorCanvas.
 * Wraps the flat params/tables back into `defaultInputs` as the canvas expects.
 */
export function snapshotToCanvasDoc(snapshot: RateBuildupSnapshot): CanvasDocument {
  const { sourceTemplateId, params, tables, controllers, paramNotes, ...rest } = snapshot;
  return {
    ...rest,
    defaultInputs: { params, tables },
  };
}

/**
 * Merge an updated CanvasDocument (structural edits) back into a snapshot,
 * preserving params, tables, controllers, and paramNotes from the existing snapshot.
 */
export function canvasDocToSnapshot(
  doc: CanvasDocument,
  existing: RateBuildupSnapshot
): RateBuildupSnapshot {
  const { defaultInputs: _ignored, ...rest } = doc;
  return {
    ...rest,
    sourceTemplateId: existing.sourceTemplateId,
    params: existing.params,
    tables: existing.tables,
    controllers: existing.controllers,
    paramNotes: existing.paramNotes,
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/TenderPricing/calculators/types.ts \
        client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts
git commit -m "feat: add hint to ParameterDef/ControllerDef; add RateBuildupSnapshot type and helpers"
```

---

## Task 2: Refactor `CalculatorCanvas` to controlled `doc + onSave`

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/index.tsx`

Remove `useCanvasDocuments()` from inside this component. Remove the `docId?` prop and multi-doc toolbar. Add `doc: CanvasDocument` + `onSave: (doc: CanvasDocument) => void`. Move undo/redo stacks to internal state. Keep a slim internal undo/redo button row inside the canvas area.

- [ ] **Step 1: Update the Props interface**

Replace:
```ts
interface Props {
  canvasHeight?: string | number;
  docId?: string;
}
```
With:
```ts
interface Props {
  doc: CanvasDocument;
  onSave: (doc: CanvasDocument) => void;
  canvasHeight?: string | number;
}
```

- [ ] **Step 2: Remove `useCanvasDocuments` and add internal undo/redo**

Remove the `useCanvasDocuments()` call and the related state (`docs`, `loading`, `selectedDocId`). Add:

```ts
const CalculatorCanvas: React.FC<Props> = ({ doc, onSave, canvasHeight = "700px" }) => {
  // Internal undo/redo — keyed to doc.id so stacks reset on doc switch
  const [undoStack, setUndoStack] = useState<CanvasDocument[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasDocument[]>([]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
```

- [ ] **Step 3: Replace `saveDocument` with internal state mutation + onSave call**

Replace all `saveDocument(updated)` calls with `handleSave(updated)`:

```ts
const handleSave = useCallback(
  (updated: CanvasDocument) => {
    setUndoStack((prev) => [...prev.slice(-49), doc]);
    setRedoStack([]);
    onSave(updated);
  },
  [doc, onSave]
);

const handleUndo = useCallback(() => {
  if (undoStack.length === 0) return;
  const previous = undoStack[undoStack.length - 1];
  setUndoStack((prev) => prev.slice(0, -1));
  setRedoStack((prev) => [...prev, doc]);
  onSave(previous);
  setPositionResetKey((k) => k + 1);
}, [undoStack, doc, onSave]);

const handleRedo = useCallback(() => {
  if (redoStack.length === 0) return;
  const next = redoStack[redoStack.length - 1];
  setRedoStack((prev) => prev.slice(0, -1));
  setUndoStack((prev) => [...prev, doc]);
  onSave(next);
  setPositionResetKey((k) => k + 1);
}, [redoStack, doc, onSave]);
```

- [ ] **Step 4: Update keyboard shortcuts to use the new internal undo/redo**

Replace:
```ts
if (e.key === "z" && !e.shiftKey) {
  e.preventDefault();
  undo(selectedDocId);
  setPositionResetKey((k) => k + 1);
} else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
  e.preventDefault();
  redo(selectedDocId);
  setPositionResetKey((k) => k + 1);
}
```
With:
```ts
if (e.key === "z" && !e.shiftKey) {
  e.preventDefault();
  handleUndo();
} else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
  e.preventDefault();
  handleRedo();
}
```

- [ ] **Step 5: Update all references to `activeDoc` → `doc`**

`activeDoc` was `docs.find(d => d.id === selectedDocId) ?? docs[0]`. Now it's simply `doc`. Do a search-replace:
- `activeDoc` → `doc`
- Remove the `useEffect` that synced `selectedDocId` from `docs`
- Remove the `useEffect` that locked selection to `docId`
- Remove `selectedDocId` state
- Remove `handleNew`, `handleFork`, `handleDelete`, `handleStandaloneFork`, `handleStandaloneDelete`, `nameEditValue`, `handleNameBlur` (all header-specific logic)

- [ ] **Step 6: Simplify the controllerDefaults + canvasControllers memos**

These were built from `activeDoc.controllerDefs`. They now reference `doc.controllerDefs` directly (just rename the variable):

```ts
const controllerDefaults = useMemo(() => {
  const result: Record<string, number> = {};
  for (const c of (doc.controllerDefs ?? [])) {
    if (c.type === "percentage") result[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
    if (c.type === "toggle") result[c.id] = c.defaultValue ? 1 : 0;
  }
  return result;
}, [doc]);

const canvasControllers = useMemo(() => {
  const result: Record<string, number | boolean | string[]> = {};
  for (const c of (doc.controllerDefs ?? [])) {
    if (c.type === "percentage") result[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
    else if (c.type === "toggle") result[c.id] = c.defaultValue ?? false;
    else if (c.type === "selector") result[c.id] = c.defaultSelected ?? [];
  }
  return result;
}, [doc]);
```

- [ ] **Step 7: Replace the full render return with a single unified render path**

Remove the `if (docId)` / else branching. The new render is just the canvas area with a small internal undo/redo toolbar:

```tsx
if (!doc) return null;

return (
  <Box w="100%" overflow="hidden">
    {/* Internal undo/redo strip — slim, no header chrome */}
    <Flex
      align="center"
      gap={1}
      px={2}
      h="28px"
      bg="#1e293b"
      borderBottom="1px solid"
      borderColor="whiteAlpha.100"
      flexShrink={0}
      justify="flex-end"
    >
      <Tooltip label="Undo (Ctrl+Z)" placement="bottom">
        <Button
          size="xs"
          variant="ghost"
          color="gray.400"
          _hover={{ color: "white" }}
          onClick={handleUndo}
          isDisabled={!canUndo}
          fontFamily="mono"
          fontSize="md"
          px={2}
        >
          ↩
        </Button>
      </Tooltip>
      <Tooltip label="Redo (Ctrl+Y)" placement="bottom">
        <Button
          size="xs"
          variant="ghost"
          color="gray.400"
          _hover={{ color: "white" }}
          onClick={handleRedo}
          isDisabled={!canRedo}
          fontFamily="mono"
          fontSize="md"
          px={2}
        >
          ↪
        </Button>
      </Tooltip>
    </Flex>

    {/* Canvas area */}
    <Flex overflow="hidden" h={canvasHeight}>
      {/* Live Test panel — existing JSX unchanged */}
      ...
      {/* Canvas flow — existing JSX unchanged */}
      ...
      {/* Inspect panel — existing JSX unchanged */}
      ...
    </Flex>
  </Box>
);
```

Keep all the LiveTestPanel, CanvasFlow, and InspectPanel JSX exactly as it was in the existing `docId` branch. Update `h={canvasHeight}` to account for the 28px internal toolbar: `calc(${canvasHeight} - 28px)` if canvasHeight is a string, else `Number(canvasHeight) - 28`.

- [ ] **Step 8: Remove the template toolbar JSX (the Select dropdown / New / Fork / Delete buttons)**

Delete all JSX in the non-standalone mode that showed the template dropdown toolbar. That block no longer exists.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/index.tsx
git commit -m "refactor: CalculatorCanvas → controlled doc+onSave with internal undo/redo"
```

---

## Task 3: Update `/pricing/rate-builder/[id].tsx` to own the header

**Files:**
- Modify: `client/src/pages/pricing/rate-builder/[id].tsx`

The page now owns: the back link, template name editing, fork, delete, and undo/redo is now inside CalculatorCanvas. The page provides `doc + onSave` to `CalculatorCanvas`.

- [ ] **Step 1: Import `useCanvasDocuments` and required hooks**

```tsx
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, Text, Tooltip } from "@chakra-ui/react";
import { useCanvasDocuments } from "../../../components/pages/developer/CalculatorCanvas/canvasStorage";
import CalculatorCanvas from "../../../components/pages/developer/CalculatorCanvas";
import { CanvasDocument } from "../../../components/pages/developer/CalculatorCanvas/canvasStorage";
import ClientOnly from "../../../components/Common/ClientOnly";
import { navbarHeight } from "../../../constants/styles";
```

- [ ] **Step 2: Wire up the page with doc loading and the header**

The CalculatorCanvas internal undo/redo strip is 28px, and the page header is 36px. Canvas height accounts for both:

```tsx
// Header is 36px; CalculatorCanvas has its own 28px undo/redo strip
const CANVAS_HEIGHT = `calc(100vh - ${navbarHeight} - 36px)`;

const RateBuildupEditorPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const { docs, loading, saveDocument, forkDocument, deleteDocument } = useCanvasDocuments();

  // Guard: PM+ only
  useEffect(() => {
    if (user === null) router.replace("/");
    else if (user !== undefined && !hasPermission(user.role, UserRoles.ProjectManager)) router.replace("/");
  }, [user, router]);

  const doc = docs.find((d) => d.id === id || /* check idRemap */ false) ?? null;

  // Inline name editing
  const [nameEditValue, setNameEditValue] = useState<string | null>(null);

  const handleNameBlur = useCallback(() => {
    if (nameEditValue === null || !doc) return;
    const trimmed = nameEditValue.trim();
    if (trimmed && trimmed !== doc.label) saveDocument({ ...doc, label: trimmed });
    setNameEditValue(null);
  }, [nameEditValue, doc, saveDocument]);

  const handleFork = useCallback(async () => {
    if (!doc) return;
    const newId = await forkDocument(doc.id);
    if (newId) router.push(`/pricing/rate-builder/${newId}`);
  }, [doc, forkDocument, router]);

  const handleDelete = useCallback(async () => {
    if (!doc) return;
    if (docs.length <= 1) { window.alert("Cannot delete the only template."); return; }
    if (!window.confirm(`Delete "${doc.label}"? This cannot be undone.`)) return;
    await deleteDocument(doc.id);
    router.push("/pricing");
  }, [doc, docs.length, deleteDocument, router]);

  if (!user || !hasPermission(user.role, UserRoles.ProjectManager)) return null;
  if (!id || typeof id !== "string") return null;
  if (loading) return <Flex align="center" justify="center" h="100vh"><Text color="gray.400">Loading…</Text></Flex>;
  if (!doc) return <Flex align="center" justify="center" h="100vh"><Text color="gray.400">Template not found.</Text></Flex>;

  return (
    <ClientOnly>
      <Box w="100%" overflow="hidden">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <Flex
          align="center"
          gap={2}
          px={3}
          h="36px"
          bg="#1e293b"
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          flexShrink={0}
        >
          <Button
            size="xs" variant="ghost" color="gray.400" _hover={{ color: "white" }}
            onClick={() => router.push("/pricing")}
            px={1} fontWeight="normal" fontSize="xs"
          >
            ← Pricing
          </Button>
          <Box w="1px" h="16px" bg="whiteAlpha.300" />
          {nameEditValue !== null ? (
            <input
              autoFocus
              value={nameEditValue}
              onChange={(e) => setNameEditValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setNameEditValue(null);
              }}
              style={{
                background: "transparent", border: "none",
                borderBottom: "1px solid #4a5568", color: "#f1f5f9",
                fontSize: "13px", fontWeight: 600, fontFamily: "inherit",
                outline: "none", padding: "1px 4px", minWidth: 180,
              }}
            />
          ) : (
            <Text
              fontSize="sm" fontWeight="semibold" color="white"
              cursor="text" _hover={{ color: "gray.200" }}
              onClick={() => setNameEditValue(doc.label)}
              userSelect="none"
            >
              {doc.label}
            </Text>
          )}
          <Box flex={1} />
          <Box w="1px" h="16px" bg="whiteAlpha.200" />
          <Tooltip label="Duplicate this template" placement="bottom">
            <Button size="xs" variant="ghost" color="gray.400" _hover={{ color: "white" }} onClick={handleFork}>
              Fork
            </Button>
          </Tooltip>
          <Tooltip label="Delete this template" placement="bottom">
            <Button size="xs" variant="ghost" color="red.400" _hover={{ color: "red.300" }} onClick={handleDelete}>
              Delete
            </Button>
          </Tooltip>
        </Flex>

        {/* ── Canvas ───────────────────────────────────────────────────── */}
        <CalculatorCanvas
          key={doc.id}
          doc={doc}
          onSave={saveDocument}
          canvasHeight={CANVAS_HEIGHT}
        />
      </Box>
    </ClientOnly>
  );
};
```

Note: `key={doc.id}` ensures CalculatorCanvas fully remounts (resetting internal undo/redo stacks) if the doc ever changes identity.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/pricing/rate-builder/[id].tsx
git commit -m "feat: rate-builder page owns header; pass doc+onSave to CalculatorCanvas"
```

---

## Task 4: Server — add `rateBuildupSnapshot` field and lazy-load query

**Files:**
- Modify: `server/src/models/TenderPricingSheet/schema/index.ts`
- Modify: `server/src/typescript/tenderPricingSheet.ts`
- Modify: `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`
- Modify: `server/src/models/TenderPricingSheet/class/update.ts`
- Modify: `server/src/graphql/resolvers/tenderPricingSheet/index.ts`

- [ ] **Step 1: Add `rateBuildupSnapshot` to `TenderPricingRowClass` schema**

In `server/src/models/TenderPricingSheet/schema/index.ts`, after the `notes` field, add:

```ts
@Field({ nullable: true })
@prop({ trim: true })
public rateBuildupSnapshot?: string;
```

- [ ] **Step 2: Add `rateBuildupSnapshot` to `ITenderPricingRowUpdate`**

In `server/src/typescript/tenderPricingSheet.ts`, add to the `ITenderPricingRowUpdate` interface:

```ts
rateBuildupSnapshot?: string | null;
```

- [ ] **Step 3: Add `rateBuildupSnapshot` to `TenderPricingRowUpdateData` GraphQL input**

In `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`, add at the end of `TenderPricingRowUpdateData`:

```ts
@Field({ nullable: true })
public rateBuildupSnapshot?: string | null;
```

- [ ] **Step 4: Handle `rateBuildupSnapshot` in `updateRow()`**

In `server/src/models/TenderPricingSheet/class/update.ts`, add after the `row.calculatorType` line:

```ts
if (data.rateBuildupSnapshot !== undefined) row.rateBuildupSnapshot = data.rateBuildupSnapshot ?? undefined;
```

- [ ] **Step 5: Add `tenderPricingRowSnapshot` query to the resolver**

In `server/src/graphql/resolvers/tenderPricingSheet/index.ts`, add this query after `tenderPricingSheet`:

```ts
@Authorized(["ADMIN", "PM"])
@Query(() => String, { nullable: true })
async tenderPricingRowSnapshot(
  @Arg("sheetId", () => ID) sheetId: Id,
  @Arg("rowId", () => ID) rowId: Id
): Promise<string | null> {
  const sheet = await TenderPricingSheet.findById(sheetId, { rows: { $elemMatch: { _id: rowId } } });
  const row = sheet?.rows?.[0];
  return row?.rateBuildupSnapshot ?? null;
}
```

Also add `String` to the import from `"type-graphql"`:
```ts
import { Arg, Authorized, Float, ID, Int, Mutation, Query, Resolver, String } from "type-graphql";
```

Wait — `String` is a built-in TypeScript type and not imported from `type-graphql`. The return type annotation `() => String` refers to the JavaScript `String` global. This is correct as-is.

- [ ] **Step 6: Verify server starts cleanly**

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=30
```

Expected: no `TSError` or `CrashLoopBackOff`.

- [ ] **Step 7: Commit**

```bash
git add server/src/models/TenderPricingSheet/schema/index.ts \
        server/src/typescript/tenderPricingSheet.ts \
        server/src/graphql/resolvers/tenderPricingSheet/mutations.ts \
        server/src/models/TenderPricingSheet/class/update.ts \
        server/src/graphql/resolvers/tenderPricingSheet/index.ts
git commit -m "feat: add rateBuildupSnapshot field to TenderPricingRow + lazy-load query"
```

---

## Task 5: Client — update GQL types, add snapshot query, run codegen

**Files:**
- Modify: `client/src/components/TenderPricing/types.ts`
- Modify: `client/src/components/TenderPricing/PricingSheet.tsx`
- Run codegen

- [ ] **Step 1: Add `rateBuildupSnapshot` to the client `TenderPricingRow` type**

In `client/src/components/TenderPricing/types.ts`, add to `TenderPricingRow`:

```ts
rateBuildupSnapshot?: string | null;
```

- [ ] **Step 2: Add `SNAPSHOT_QUERY` to `PricingSheet.tsx`**

In `client/src/components/TenderPricing/PricingSheet.tsx`, add after the existing GQL constants:

```ts
export const SNAPSHOT_QUERY = gql`
  query TenderPricingRowSnapshot($sheetId: ID!, $rowId: ID!) {
    tenderPricingRowSnapshot(sheetId: $sheetId, rowId: $rowId)
  }
`;
```

Export it so the tender pricing page and the row editing page can import it.

- [ ] **Step 3: Run codegen to regenerate GraphQL types**

```bash
cd client && npm run codegen
```

This regenerates `client/src/generated/graphql.ts` to include `tenderPricingRowSnapshot` and the updated `TenderPricingRowUpdateData` type.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/TenderPricing/types.ts \
        client/src/components/TenderPricing/PricingSheet.tsx \
        client/src/generated/graphql.ts
git commit -m "feat: add rateBuildupSnapshot to client TenderPricingRow type + snapshot GQL query"
```

---

## Task 6: Update `LiveTestPanel.tsx` — hints, paramNotes, and external input callbacks

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx`

Three additions: (1) show `hint` from `ParameterDef`/`ControllerDef` as read-only grey italic text under each field; (2) show an editable `paramNotes` textarea per param when in snapshot editing context; (3) add `initialInputs` + `onInputsChange` props so the tender row page can seed and save input state.

- [ ] **Step 1: Add optional props to LiveTestPanel**

Find the existing Props type for LiveTestPanel and add:

```ts
interface LiveTestPanelProps {
  doc: CanvasDocument;
  onCollapse: () => void;
  /** Seed values from snapshot (params, tables, controllers). Used in tender row context. */
  initialInputs?: {
    params?: Record<string, number>;
    tables?: Record<string, RateEntry[]>;
    controllers?: Record<string, number | boolean | string[]>;
  };
  /** Fires whenever any param, table, or controller value changes. */
  onInputsChange?: (
    params: Record<string, number>,
    tables: Record<string, RateEntry[]>,
    controllers: Record<string, number | boolean | string[]>
  ) => void;
  /** Current paramNotes from snapshot. Only present in tender row context. */
  paramNotes?: Record<string, string>;
  /** Fires when a param note changes. */
  onParamNoteChange?: (paramId: string, note: string) => void;
}
```

- [ ] **Step 2: Seed initial values from `initialInputs` prop**

Change the `useState` initializers to prefer `initialInputs` over `doc.defaultInputs`:

```ts
const [params, setParams] = useState<Record<string, number>>(() => {
  const seed = initialInputs?.params ?? doc.defaultInputs?.params ?? {};
  const result: Record<string, number> = {};
  for (const p of doc.parameterDefs) {
    result[p.id] = seed[p.id] ?? p.defaultValue;
  }
  return result;
});

const [tables, setTables] = useState<Record<string, RateEntry[]>>(() => {
  const seed = initialInputs?.tables ?? doc.defaultInputs?.tables ?? {};
  const result: Record<string, RateEntry[]> = {};
  for (const t of doc.tableDefs) {
    result[t.id] = seed[t.id] ?? [];
  }
  return result;
});
```

For controllers: check `initialInputs?.controllers?.[c.id]` before falling back to `c.defaultValue` — apply the same pattern.

- [ ] **Step 3: Call `onInputsChange` on every change**

After each setter call, propagate the updated values:

```ts
// inside param change handler:
onInputsChange?.(newParams, tables, controllers);

// inside table change handler:
onInputsChange?.(params, newTables, controllers);

// inside controller change handler:
onInputsChange?.(params, tables, newControllers);
```

- [ ] **Step 4: Render `hint` under each param field and each controller**

For params, after the numeric input element, add:
```tsx
{p.hint && (
  <Text fontSize="xs" color="gray.400" fontStyle="italic" mt="2px">{p.hint}</Text>
)}
```

For controllers, after the controller input/toggle/select element, add:
```tsx
{c.hint && (
  <Text fontSize="xs" color="gray.400" fontStyle="italic" mt="2px">{c.hint}</Text>
)}
```

- [ ] **Step 5: Render `paramNotes` textarea under each param when `onParamNoteChange` is provided**

After the hint text (if any), when `onParamNoteChange` is provided, show a collapsible note field per param:

```tsx
{onParamNoteChange && (
  <Textarea
    size="xs"
    placeholder="Add a note…"
    value={paramNotes?.[p.id] ?? ""}
    onChange={(e) => onParamNoteChange(p.id, e.target.value)}
    mt={1}
    rows={1}
    resize="vertical"
    fontSize="xs"
    color="gray.600"
    bg="gray.50"
    border="1px solid"
    borderColor="gray.200"
    _focus={{ borderColor: "blue.300", bg: "white" }}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx
git commit -m "feat: LiveTestPanel shows hints, paramNotes textarea, initialInputs + onInputsChange props"
```

---

## Task 7: Update `LineItemDetail.tsx` — Rate Buildup attach/edit UI

**Files:**
- Modify: `client/src/components/TenderPricing/LineItemDetail.tsx`

Replace the old `calculatorType`/`CalculatorPanel` UI with a rate buildup section. Estimators can:
1. Attach a template → creates a snapshot and saves it to the row
2. Open "Edit Buildup" → navigates to `/tender/[tenderId]/pricing/row/[rowId]`
3. Detach the buildup → clears snapshot and unit price

We need the `tenderId` for navigation. It must be threaded in via props (from the pricing page).

- [ ] **Step 1: Add `tenderId` to `LineItemDetailProps`**

```ts
interface LineItemDetailProps {
  row: TenderPricingRow;
  defaultMarkupPct: number;
  sheetId: string;
  tenderId: string;
  onUpdate: (rowId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}
```

Update the call site in `PricingSheet.tsx` to pass `sheetId={sheet._id}` and `tenderId` (which the pricing page must pass down to PricingSheet — add it to `PricingSheetProps` and the pricing page).

- [ ] **Step 2: Wire `tenderId` + `sheetId` through `PricingSheet.tsx` and `pricing.tsx`**

In `PricingSheet.tsx`:
```ts
interface PricingSheetProps {
  sheet: TPricingSheet;
  tenderId: string;
  onUpdate: (updated: TPricingSheet) => void;
}
```

Pass `tenderId` down to `LineItemDetail`:
```tsx
<LineItemDetail
  row={selectedRow}
  defaultMarkupPct={sheet.defaultMarkupPct}
  sheetId={sheet._id}
  tenderId={tenderId}
  onUpdate={handleUpdateRow}
  onClose={() => setSelectedRowId(null)}
/>
```

In `client/src/pages/tender/[id]/pricing.tsx`, extract `tenderId` from router and pass to `PricingSheet`:
```tsx
const { id: tenderId } = router.query;
// ...
<PricingSheet sheet={sheet} tenderId={tenderId as string} onUpdate={setSheet} />
```

- [ ] **Step 3: Replace the old calculator UI in `LineItemDetail.tsx`**

Remove the import of `useCalculatorTemplates`, `CalculatorPanel`, `migrateInputs`, and all references to `calculatorType`, `handleSelectType`, `handleCalculatorSave`.

Add imports:
```ts
import { useRouter } from "next/router";
import { RateBuildupTemplatesDocument } from "../../generated/graphql";
import { useApolloClient } from "@apollo/client";
import {
  snapshotFromTemplate,
} from "../pages/developer/CalculatorCanvas/canvasStorage";
```

Add the rate buildup section to the form (replacing the old Type toggle section):

```tsx
{/* ── Rate Buildup ────────────────────────────────────────────── */}
<Box mb={4}>
  <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={2}>Rate Buildup</Text>
  {row.rateBuildupSnapshot ? (
    <Flex align="center" gap={2}>
      <Text fontSize="sm" color="gray.700" fontWeight="medium">
        {(() => {
          try {
            return JSON.parse(row.rateBuildupSnapshot).label ?? "Buildup";
          } catch {
            return "Buildup";
          }
        })()}
      </Text>
      <Button
        size="xs"
        colorScheme="blue"
        variant="outline"
        as="a"
        href={`/tender/${tenderId}/pricing/row/${row._id}`}
        onClick={(e) => {
          e.preventDefault();
          router.push(`/tender/${tenderId}/pricing/row/${row._id}`);
        }}
      >
        Edit Buildup →
      </Button>
      <Button
        size="xs"
        variant="ghost"
        color="red.400"
        _hover={{ color: "red.600" }}
        onClick={() => onUpdate(row._id, { rateBuildupSnapshot: null, unitPrice: null })}
      >
        Detach
      </Button>
    </Flex>
  ) : (
    <AttachTemplateButton
      onAttach={(templateDoc) => {
        const snapshot = snapshotFromTemplate(templateDoc);
        onUpdate(row._id, {
          rateBuildupSnapshot: JSON.stringify(snapshot),
          unit: row.unit || templateDoc.defaultUnit || null,
        });
      }}
    />
  )}
</Box>
```

- [ ] **Step 4: Add `AttachTemplateButton` component (inline in the same file)**

```tsx
// ── AttachTemplateButton ───────────────────────────────────────────────────────

import { RateBuildupTemplatesDocument } from "../../generated/graphql";
import { fragmentToDoc } from "../pages/developer/CalculatorCanvas/canvasStorage";

// Note: fragmentToDoc is not currently exported — export it from canvasStorage.ts
// (Add `export` keyword to `function fragmentToDoc(...)` in canvasStorage.ts)

const AttachTemplateButton: React.FC<{
  onAttach: (doc: import("../pages/developer/CalculatorCanvas/canvasStorage").CanvasDocument) => void;
}> = ({ onAttach }) => {
  const client = useApolloClient();
  const [templates, setTemplates] = useState<import("../pages/developer/CalculatorCanvas/canvasStorage").CanvasDocument[]>([]);
  const [open, setOpen] = useState(false);

  const handleOpen = async () => {
    const { data } = await client.query({
      query: RateBuildupTemplatesDocument,
      fetchPolicy: "network-only",
    });
    setTemplates((data?.rateBuildupTemplates ?? []).map(fragmentToDoc));
    setOpen(true);
  };

  return (
    <>
      <Button size="xs" colorScheme="blue" variant="outline" onClick={handleOpen}>
        + Attach Template
      </Button>
      {open && (
        <Box
          position="fixed" inset={0} zIndex={100}
          bg="blackAlpha.600"
          display="flex" alignItems="center" justifyContent="center"
          onClick={() => setOpen(false)}
        >
          <Box
            bg="white" rounded="md" p={4} minW="300px" maxW="400px"
            onClick={(e) => e.stopPropagation()}
          >
            <Text fontWeight="semibold" mb={3} fontSize="sm">Select a Rate Buildup Template</Text>
            {templates.length === 0 ? (
              <Text fontSize="sm" color="gray.400">No templates found.</Text>
            ) : (
              templates.map((t) => (
                <Button
                  key={t.id}
                  variant="ghost"
                  size="sm"
                  w="100%"
                  justifyContent="flex-start"
                  onClick={() => { onAttach(t); setOpen(false); }}
                >
                  {t.label}
                </Button>
              ))
            )}
          </Box>
        </Box>
      )}
    </>
  );
};
```

- [ ] **Step 5: Export `fragmentToDoc` from `canvasStorage.ts`**

In `canvasStorage.ts`, change:
```ts
function fragmentToDoc(
```
to:
```ts
export function fragmentToDoc(
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/TenderPricing/LineItemDetail.tsx \
        client/src/components/TenderPricing/PricingSheet.tsx \
        client/src/pages/tender/[id]/pricing.tsx \
        client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts
git commit -m "feat: LineItemDetail shows rate buildup attach/edit UI"
```

---

## Task 8: Create `/tender/[id]/pricing/row/[rowId].tsx`

**Files:**
- Create: `client/src/pages/tender/[id]/pricing/row/[rowId].tsx`

This page lets estimators edit a line item's rate buildup canvas. It lazy-loads the snapshot, renders `CalculatorCanvas` (for structural edits), and saves changes back to the row.

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p client/src/pages/tender/\[id\]/pricing/row
```

- [ ] **Step 2: Write the page component**

```tsx
// client/src/pages/tender/[id]/pricing/row/[rowId].tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useAuth } from "../../../../contexts/Auth";
import { UserRoles } from "../../../../generated/graphql";
import hasPermission from "../../../../utils/hasPermission";
import ClientOnly from "../../../../components/Common/ClientOnly";
import CalculatorCanvas from "../../../../components/pages/developer/CalculatorCanvas";
import {
  CanvasDocument,
  RateBuildupSnapshot,
  snapshotToCanvasDoc,
  canvasDocToSnapshot,
  computeInactiveNodeIds,
} from "../../../../components/pages/developer/CalculatorCanvas/canvasStorage";
import { evaluateTemplate } from "../../../../components/TenderPricing/calculators/evaluate";
import type { RateEntry } from "../../../../components/TenderPricing/calculators/types";
import { navbarHeight } from "../../../../constants/styles";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const SNAPSHOT_QUERY = gql`
  query TenderPricingRowSnapshotForEdit($sheetId: ID!, $rowId: ID!) {
    tenderPricingRowSnapshot(sheetId: $sheetId, rowId: $rowId)
  }
`;

// We need the sheet ID — look it up by tenderId
const SHEET_ID_QUERY = gql`
  query TenderPricingSheetId($tenderId: ID!) {
    tenderPricingSheet(tenderId: $tenderId) {
      _id
    }
  }
`;

const UPDATE_ROW = gql`
  mutation TenderRowSnapshotUpdate($sheetId: ID!, $rowId: ID!, $data: TenderPricingRowUpdateData!) {
    tenderPricingRowUpdate(sheetId: $sheetId, rowId: $rowId, data: $data) {
      _id
    }
  }
`;

// ─── Canvas height ────────────────────────────────────────────────────────────
// Page header = 36px; CalculatorCanvas internal undo strip = 28px
const CANVAS_HEIGHT = `calc(100vh - ${navbarHeight} - 36px)`;

// ─── Page ────────────────────────────────────────────────────────────────────

const TenderRowCanvasPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();
  const { id: tenderId, rowId } = router.query;

  useEffect(() => {
    if (user === null) router.replace("/");
    else if (user !== undefined && !hasPermission(user.role, UserRoles.ProjectManager)) router.replace("/");
  }, [user, router]);

  // Step 1: get sheetId from tenderId
  const { data: sheetData, loading: sheetLoading } = useQuery(SHEET_ID_QUERY, {
    variables: { tenderId },
    skip: !tenderId,
  });
  const sheetId = sheetData?.tenderPricingSheet?._id ?? null;

  // Step 2: lazy-load the snapshot
  const { data: snapData, loading: snapLoading } = useQuery(SNAPSHOT_QUERY, {
    variables: { sheetId, rowId },
    skip: !sheetId || !rowId,
    fetchPolicy: "network-only",
  });

  const [updateRow] = useMutation(UPDATE_ROW);

  // Parse snapshot
  const [snapshot, setSnapshot] = useState<RateBuildupSnapshot | null>(null);

  useEffect(() => {
    const raw = snapData?.tenderPricingRowSnapshot;
    if (!raw) return;
    try {
      const parsed: RateBuildupSnapshot = JSON.parse(raw);
      setSnapshot(parsed);
    } catch {
      console.error("[TenderRowCanvasPage] Failed to parse snapshot JSON");
    }
  }, [snapData]);

  // Debounced save to server
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (updatedSnapshot: RateBuildupSnapshot) => {
      if (!sheetId || !rowId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        // Compute unit price from the current snapshot
        const doc = snapshotToCanvasDoc(updatedSnapshot);
        const inactiveNodeIds = computeInactiveNodeIds(doc, updatedSnapshot.controllers);
        const controllerNumericValues: Record<string, number> = {};
        for (const [k, v] of Object.entries(updatedSnapshot.controllers)) {
          if (typeof v === "number") controllerNumericValues[k] = v;
          else if (typeof v === "boolean") controllerNumericValues[k] = v ? 1 : 0;
        }
        const result = evaluateTemplate(
          doc,
          { params: updatedSnapshot.params, tables: updatedSnapshot.tables },
          1, // quantity = 1; real quantity is on the row itself
          controllerNumericValues,
          inactiveNodeIds
        );
        try {
          await updateRow({
            variables: {
              sheetId,
              rowId,
              data: {
                rateBuildupSnapshot: JSON.stringify(updatedSnapshot),
                unitPrice: parseFloat(result.unitPrice.toFixed(4)) || null,
              },
            },
          });
        } catch (err) {
          console.error("[TenderRowCanvasPage] save failed", err);
        }
      }, 1500);
    },
    [sheetId, rowId, updateRow]
  );

  // Called when CalculatorCanvas makes a structural change
  const handleCanvasSave = useCallback(
    (updatedDoc: CanvasDocument) => {
      if (!snapshot) return;
      const updatedSnapshot = canvasDocToSnapshot(updatedDoc, snapshot);
      setSnapshot(updatedSnapshot);
      scheduleSave(updatedSnapshot);
    },
    [snapshot, scheduleSave]
  );

  // Called when LiveTestPanel changes params/tables/controllers
  const handleInputsChange = useCallback(
    (
      params: Record<string, number>,
      tables: Record<string, RateEntry[]>,
      controllers: Record<string, number | boolean | string[]>
    ) => {
      if (!snapshot) return;
      const updatedSnapshot: RateBuildupSnapshot = { ...snapshot, params, tables, controllers };
      setSnapshot(updatedSnapshot);
      scheduleSave(updatedSnapshot);
    },
    [snapshot, scheduleSave]
  );

  // Called when LiveTestPanel changes a param note
  const handleParamNoteChange = useCallback(
    (paramId: string, note: string) => {
      if (!snapshot) return;
      const updatedSnapshot: RateBuildupSnapshot = {
        ...snapshot,
        paramNotes: { ...snapshot.paramNotes, [paramId]: note },
      };
      setSnapshot(updatedSnapshot);
      scheduleSave(updatedSnapshot);
    },
    [snapshot, scheduleSave]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!user || !hasPermission(user.role, UserRoles.ProjectManager)) return null;

  const loading = sheetLoading || snapLoading;

  if (loading) {
    return (
      <Flex align="center" justify="center" h="100vh">
        <Spinner color="blue.500" />
      </Flex>
    );
  }

  if (!snapshot) {
    return (
      <Flex align="center" justify="center" h="100vh" direction="column" gap={3}>
        <Text color="gray.400">No rate buildup found for this row.</Text>
        <Button size="sm" onClick={() => router.back()}>← Back</Button>
      </Flex>
    );
  }

  const canvasDoc = snapshotToCanvasDoc(snapshot);

  return (
    <ClientOnly>
      <Box w="100%" overflow="hidden">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <Flex
          align="center"
          gap={2}
          px={3}
          h="36px"
          bg="#1e293b"
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          flexShrink={0}
        >
          <Button
            size="xs" variant="ghost" color="gray.400" _hover={{ color: "white" }}
            onClick={() => router.back()}
            px={1} fontWeight="normal" fontSize="xs"
          >
            ← Back to Pricing
          </Button>
          <Box w="1px" h="16px" bg="whiteAlpha.300" />
          <Text fontSize="sm" fontWeight="semibold" color="white">
            {snapshot.label}
          </Text>
          <Text fontSize="xs" color="gray.500" ml={1}>
            (line item buildup)
          </Text>
        </Flex>

        {/* ── Canvas ───────────────────────────────────────────────────── */}
        <CalculatorCanvas
          key={`${rowId}-snapshot`}
          doc={canvasDoc}
          onSave={handleCanvasSave}
          canvasHeight={CANVAS_HEIGHT}
          initialInputs={{ params: snapshot.params, tables: snapshot.tables, controllers: snapshot.controllers }}
          onInputsChange={handleInputsChange}
          paramNotes={snapshot.paramNotes}
          onParamNoteChange={handleParamNoteChange}
        />
      </Box>
    </ClientOnly>
  );
};

export default TenderRowCanvasPage;
```

- [ ] **Step 3: Thread snapshot props through `CalculatorCanvas` to `LiveTestPanel`**

`CalculatorCanvas` needs to accept and forward these new props. Add to the Props interface:

```ts
initialInputs?: {
  params?: Record<string, number>;
  tables?: Record<string, RateEntry[]>;
  controllers?: Record<string, number | boolean | string[]>;
};
onInputsChange?: (
  params: Record<string, number>,
  tables: Record<string, RateEntry[]>,
  controllers: Record<string, number | boolean | string[]>
) => void;
paramNotes?: Record<string, string>;
onParamNoteChange?: (paramId: string, note: string) => void;
```

Pass them to LiveTestPanel:
```tsx
<LiveTestPanel
  doc={doc}
  onCollapse={() => setLiveTestOpen(false)}
  initialInputs={initialInputs}
  onInputsChange={onInputsChange}
  paramNotes={paramNotes}
  onParamNoteChange={onParamNoteChange}
/>
```

- [ ] **Step 4: Check server pod logs after changes**

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=30
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/tender/\[id\]/pricing/row/\[rowId\].tsx \
        client/src/components/pages/developer/CalculatorCanvas/index.tsx
git commit -m "feat: add /tender/[id]/pricing/row/[rowId] canvas editor for estimators"
```

---

## Self-Review

**Spec coverage:**
- ✅ `RateBuildupSnapshot` type with flat `params`, `tables`, `controllers`, `paramNotes?`, `sourceTemplateId`
- ✅ `hint?` on `ParameterDef` and `ControllerDef` — shown read-only in LiveTestPanel
- ✅ `paramNotes` — estimator-editable per-param textarea in snapshot context
- ✅ `CalculatorCanvas` refactored to `doc + onSave`
- ✅ Undo/redo inside CalculatorCanvas (internal state)
- ✅ Standalone header on `/pricing/rate-builder/[id]`
- ✅ Server: `rateBuildupSnapshot` field + lazy query
- ✅ `LineItemDetail`: attach/detach UI + "Edit Buildup →" navigation
- ✅ `/tender/[id]/pricing/row/[rowId]` page with canvas + input editing
- ✅ `unitPrice` computed on save from `evaluateTemplate` (quantity=1, pre-markup)
- ✅ `nodePositions` kept in snapshot for full canvas editing
- ✅ Old `calculatorType`/`CalculatorPanel` UI removed from LineItemDetail

**Gaps noted:**
- Task 7 passes `initialInputs`/`onInputsChange` to CalculatorCanvas — Task 2 must accept and thread them to LiveTestPanel (this is covered in Task 8 Step 3).
- `fragmentToDoc` needs to be exported from `canvasStorage.ts` (covered in Task 7 Step 5).

**Type consistency check:**
- `SnapshotInputs.controllers` → `Record<string, number | boolean | string[]>` ✅ (matches `computeInactiveNodeIds` signature)
- `snapshotFromTemplate` returns `RateBuildupSnapshot` ✅
- `canvasDocToSnapshot(doc, sourceTemplateId, inputs)` → `RateBuildupSnapshot` ✅
- `snapshotToCanvasDoc(snapshot)` → `CanvasDocument` ✅
- `CalculatorCanvas` props: `doc: CanvasDocument`, `onSave: (doc: CanvasDocument) => void` ✅

**Placeholder scan:** No TBD/TODO markers found.
