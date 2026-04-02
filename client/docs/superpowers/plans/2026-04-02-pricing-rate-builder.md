# Pricing / Rate Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Graduate the Rate Builder canvas from the developer prototype tab into a first-class `/pricing` section accessible to PM and Admin users, with a list page and a full-screen canvas editor per template.

**Architecture:** The existing `CalculatorCanvas` component is reused — a new `docId` prop locks it to a specific template and switches it from its built-in toolbar into a slim header bar mode (back link, inline-editable name, fork, delete). A new `/pricing` list page calls `useCanvasDocuments()` directly to list templates and create new ones. A new `/pricing/rate-builder/[id]` page renders `<CalculatorCanvas docId={id} />` at full viewport height. No state-lifting or shared context is needed because the list page and editor page are separate routes.

**Tech Stack:** Next.js 12, React 17, Chakra UI, Apollo Client, `useCanvasDocuments` hook (already exists in `canvasStorage.ts`), `hasPermission` utility (already exists), `useAuth` hook (already exists).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/pages/developer/CalculatorCanvas/index.tsx` | Modify | Add `docId` prop — locks to one template and renders slim header instead of toolbar |
| `src/pages/pricing/index.tsx` | Create | `/pricing` list page — shows all templates, "+ New Template" creates and navigates |
| `src/pages/pricing/rate-builder/[id].tsx` | Create | `/pricing/rate-builder/[id]` — access guard + `CalculatorCanvas` at full viewport height |
| `src/pages/developer/index.tsx` | Modify | Remove the "Canvas" tab |
| `src/pages/tenders.tsx` | Modify | Add "Rate Builder →" link button in the page header |

---

### Task 1: Add `docId` prop to `CalculatorCanvas` — standalone header bar mode

**Files:**
- Modify: `src/components/pages/developer/CalculatorCanvas/index.tsx`

This task adds a `docId?: string` prop. When present, `CalculatorCanvas` locks to that doc and renders a slim dark header bar (back to `/pricing`, inline-editable template name, Fork button, Delete button with confirm) instead of the existing toolbar. The existing toolbar renders unchanged when `docId` is absent.

- [ ] **Step 1: Add `docId` to the Props interface and import `useRouter`**

In `src/components/pages/developer/CalculatorCanvas/index.tsx`, change the imports and Props:

```tsx
import { useRouter } from "next/router";
```

Change:
```tsx
interface Props {
  /** Height of the canvas + inspect-panel area. Defaults to 700px. */
  canvasHeight?: string | number;
}

const CalculatorCanvas: React.FC<Props> = ({ canvasHeight = "700px" }) => {
```

To:
```tsx
interface Props {
  /** Height of the canvas + inspect-panel area. Defaults to 700px. */
  canvasHeight?: string | number;
  /**
   * When set, locks the editor to this document ID and renders a slim
   * standalone header bar instead of the multi-doc toolbar.
   */
  docId?: string;
}

const CalculatorCanvas: React.FC<Props> = ({ canvasHeight = "700px", docId }) => {
  const router = useRouter();
```

- [ ] **Step 2: Lock `selectedDocId` to `docId` when in standalone mode**

The existing `useEffect` on line ~71 already syncs `selectedDocId` when docs load. Below it, add a new effect that keeps `selectedDocId` pinned to `docId` when provided:

```tsx
// When a docId is provided (standalone page mode), pin selection to it
useEffect(() => {
  if (docId && docs.find((d) => d.id === docId)) {
    setSelectedDocId(docId);
    setSelectedNodeId(null);
  }
}, [docId, docs]);
```

Add this immediately after the existing `useEffect` that calls `setSelectedDocId(docs[0].id)`.

- [ ] **Step 3: Add `nameEditValue` state and the inline rename handler**

After the `controllerDefaults` useMemo (around line 86), add:

```tsx
// ─── Standalone header: inline name editing ──────────────────────────────────
const [nameEditValue, setNameEditValue] = useState<string | null>(null);

const handleNameBlur = useCallback(() => {
  if (nameEditValue === null || !activeDoc) return;
  const trimmed = nameEditValue.trim();
  if (trimmed && trimmed !== activeDoc.label) {
    saveDocument({ ...activeDoc, label: trimmed });
  }
  setNameEditValue(null);
}, [nameEditValue, activeDoc, saveDocument]);
```

- [ ] **Step 4: Add the standalone fork and delete handlers**

After `handleNameBlur`, add:

```tsx
const handleStandaloneFork = useCallback(async () => {
  if (!activeDoc) return;
  const newId = await forkDocument(activeDoc.id);
  if (newId) router.push(`/pricing/rate-builder/${newId}`);
}, [activeDoc, forkDocument, router]);

const handleStandaloneDelete = useCallback(async () => {
  if (!activeDoc) return;
  if (!window.confirm(`Delete "${activeDoc.label}"? This cannot be undone.`)) return;
  await deleteDocument(activeDoc.id);
  router.push("/pricing");
}, [activeDoc, deleteDocument, router]);
```

- [ ] **Step 5: Replace the toolbar JSX with a conditional render**

Find the `{/* Template toolbar */}` section (the `<Flex align="center" gap={3} mb={4}>` block, lines ~213–285). Replace the entire `return (...)` in the component so that:
- When `docId` is set → render slim header bar (no `mb` gap, part of the same box as the canvas)
- When `docId` is not set → render the existing toolbar

Replace the outer `return (` wrapper:

```tsx
if (loading) {
  return (
    <Flex align="center" justify="center" h="400px">
      <Text color="gray.400" fontSize="sm">Loading templates…</Text>
    </Flex>
  );
}

// ─── Standalone mode (full-page editor at /pricing/rate-builder/[id]) ─────────
if (docId) {
  return (
    <Box>
      {/* Slim header bar */}
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
          size="xs"
          variant="ghost"
          color="gray.400"
          _hover={{ color: "white" }}
          onClick={() => router.push("/pricing")}
          px={1}
          fontWeight="normal"
          fontSize="xs"
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
              if (e.key === "Escape") { setNameEditValue(null); }
            }}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "1px solid #4a5568",
              color: "#f1f5f9",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "inherit",
              outline: "none",
              padding: "1px 4px",
              minWidth: 180,
            }}
          />
        ) : (
          <Text
            fontSize="sm"
            fontWeight="semibold"
            color="white"
            cursor="text"
            _hover={{ color: "gray.200" }}
            onClick={() => setNameEditValue(activeDoc?.label ?? "")}
            userSelect="none"
          >
            {activeDoc?.label ?? "…"}
          </Text>
        )}
        <Box flex={1} />
        {/* Undo / Redo */}
        <Tooltip label="Undo (Ctrl+Z)" placement="bottom">
          <Button
            size="xs"
            variant="ghost"
            color="gray.400"
            _hover={{ color: "white" }}
            onClick={() => { undo(selectedDocId); setPositionResetKey((k) => k + 1); }}
            isDisabled={!canUndo(selectedDocId)}
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
            onClick={() => { redo(selectedDocId); setPositionResetKey((k) => k + 1); }}
            isDisabled={!canRedo(selectedDocId)}
            fontFamily="mono"
            fontSize="md"
            px={2}
          >
            ↪
          </Button>
        </Tooltip>
        <Box w="1px" h="16px" bg="whiteAlpha.200" />
        <Tooltip label="Duplicate this template" placement="bottom">
          <Button
            size="xs"
            variant="ghost"
            color="gray.400"
            _hover={{ color: "white" }}
            onClick={handleStandaloneFork}
          >
            Fork
          </Button>
        </Tooltip>
        <Tooltip label="Delete this template" placement="bottom">
          <Button
            size="xs"
            variant="ghost"
            color="red.400"
            _hover={{ color: "red.300" }}
            onClick={handleStandaloneDelete}
          >
            Delete
          </Button>
        </Tooltip>
      </Flex>

      {/* Canvas area */}
      {activeDoc && (
        <Flex
          borderWidth={0}
          rounded="none"
          overflow="hidden"
          h={canvasHeight}
        >
          {/* Live Test panel or collapsed strip */}
          {liveTestOpen ? (
            <>
              <Box
                w={`${liveTestWidth}px`}
                flexShrink={0}
                overflowY="auto"
                bg="white"
                borderRight="1px solid"
                borderColor="gray.200"
              >
                <LiveTestPanel
                  doc={activeDoc}
                  onUpdateDoc={handleUpdateDoc}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                />
              </Box>
              <Box
                w="4px"
                cursor="col-resize"
                bg="gray.100"
                _hover={{ bg: "blue.100" }}
                onMouseDown={onLiveTestResizeStart}
                flexShrink={0}
              />
            </>
          ) : (
            <Box
              w="28px"
              flexShrink={0}
              bg="gray.50"
              borderRight="1px solid"
              borderColor="gray.200"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onClick={() => setLiveTestOpen(true)}
              title="Open Live Test panel"
            >
              <Text
                fontSize="9px"
                color="gray.400"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                LIVE TEST
              </Text>
            </Box>
          )}

          <Box flex={1} minW={0} bg="#0f172a" position="relative">
            <CanvasFlow
              doc={activeDoc}
              edges={edges}
              stepDebug={stepDebug}
              selectedNodeId={selectedNodeId}
              positionResetKey={positionResetKey}
              onSelectNode={setSelectedNodeId}
              onUpdateDoc={handleUpdateDoc}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onDeleteNodes={handleDeleteNodes}
              onCreateNode={handleCreateNode}
              liveTestOpen={liveTestOpen}
              onToggleLiveTest={() => setLiveTestOpen((v) => !v)}
            />
          </Box>

          {selectedNodeId && (
            <>
              <Box
                w="4px"
                cursor="col-resize"
                bg="gray.100"
                _hover={{ bg: "blue.100" }}
                onMouseDown={onResizeStart}
                flexShrink={0}
              />
              <Box
                w={`${inspectWidth}px`}
                flexShrink={0}
                overflowY="auto"
                bg="white"
                borderLeft="1px solid"
                borderColor="gray.200"
              >
                <InspectPanel
                  doc={activeDoc}
                  nodeId={selectedNodeId}
                  edges={edges}
                  onUpdateDoc={handleUpdateDocFromPanel}
                  onClose={() => setSelectedNodeId(null)}
                />
              </Box>
            </>
          )}
        </Flex>
      )}
    </Box>
  );
}
```

Then keep the existing `return (` for the non-`docId` case (the current toolbar + canvas) unchanged after this block. The existing return starts at the `<Box>` that wraps the `{/* Template toolbar */}` Flex — it is untouched. The `if (docId) { return (...) }` block should be placed immediately before that existing `return (`.

- [ ] **Step 6: Verify the developer page still works**

Run: `npm run type-check` in `client/`
Expected: no TypeScript errors

Navigate to `http://localhost:3000/developer`, click the Canvas tab. It should look and work exactly as before (toolbar visible, template switcher works).

- [ ] **Step 7: Commit**

```bash
git add src/components/pages/developer/CalculatorCanvas/index.tsx
git commit -m "feat: add docId prop to CalculatorCanvas for standalone header bar mode"
```

---

### Task 2: Create `/pricing` list page

**Files:**
- Create: `src/pages/pricing/index.tsx`

This page lists all rate builder templates. Access is restricted to `UserRoles.ProjectManager` and above. "+ New Template" creates a blank doc and navigates to its canvas. Each row navigates to `/pricing/rate-builder/[id]`.

- [ ] **Step 1: Create the file**

Create `src/pages/pricing/index.tsx`:

```tsx
// src/pages/pricing/index.tsx
import React from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import Container from "../../components/Common/Container";
import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";
import hasPermission from "../../utils/hasPermission";
import { useCanvasDocuments } from "../../components/pages/developer/CalculatorCanvas/canvasStorage";

const PricingPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();
  const { docs, loading, createDocument } = useCanvasDocuments();

  React.useEffect(() => {
    if (user === null) {
      router.replace("/");
    } else if (user !== undefined && !hasPermission(user.role, UserRoles.ProjectManager)) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || !hasPermission(user.role, UserRoles.ProjectManager)) return null;

  const handleNewTemplate = async () => {
    const newId = await createDocument();
    router.push(`/pricing/rate-builder/${newId}`);
  };

  return (
    <Container>
      <Flex align="center" justify="space-between" mb={6}>
        <Box>
          <Heading size="md" color="gray.800">Rate Builder</Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Reusable pricing templates for tender estimates
          </Text>
        </Box>
        <Button colorScheme="teal" size="sm" onClick={handleNewTemplate}>
          + New Template
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}>
          <Spinner color="teal.500" />
        </Flex>
      ) : docs.length === 0 ? (
        <Text color="gray.400" fontSize="sm">No templates yet.</Text>
      ) : (
        <Box borderWidth={1} borderColor="gray.200" rounded="lg" overflow="hidden">
          {docs.map((doc, i) => {
            const paramCount = doc.parameterDefs.length;
            const tableCount = doc.tableDefs.length;
            const formulaCount = doc.formulaSteps.length;
            return (
              <Flex
                key={doc.id}
                align="center"
                px={4}
                py={3}
                borderTopWidth={i === 0 ? 0 : 1}
                borderColor="gray.100"
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => router.push(`/pricing/rate-builder/${doc.id}`)}
                gap={3}
              >
                <Box w="3px" h="32px" bg="teal.400" borderRadius="full" flexShrink={0} />
                <Box flex={1} minW={0}>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.800" noOfLines={1}>
                    {doc.label || "Untitled"}
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt={0.5}>
                    {paramCount} param{paramCount !== 1 ? "s" : ""} ·{" "}
                    {tableCount} table{tableCount !== 1 ? "s" : ""} ·{" "}
                    {formulaCount} formula{formulaCount !== 1 ? "s" : ""}
                  </Text>
                </Box>
              </Flex>
            );
          })}
        </Box>
      )}
    </Container>
  );
};

export default PricingPage;
```

- [ ] **Step 2: Verify type-check passes**

Run: `npm run type-check` in `client/`
Expected: no errors

- [ ] **Step 3: Manual smoke test**

Navigate to `http://localhost:3000/pricing`. You should see the list of existing templates. Click a template — it should navigate to `/pricing/rate-builder/[id]` (404 for now, that's fine). Click "+ New Template" — should navigate to `/pricing/rate-builder/new_[timestamp]` (404 for now).

- [ ] **Step 4: Commit**

```bash
git add src/pages/pricing/index.tsx
git commit -m "feat: add /pricing list page for rate builder templates"
```

---

### Task 3: Create `/pricing/rate-builder/[id]` canvas editor page

**Files:**
- Create: `src/pages/pricing/rate-builder/[id].tsx`

This page renders `CalculatorCanvas` in standalone mode at full viewport height.

- [ ] **Step 1: Create the file**

Create `src/pages/pricing/rate-builder/[id].tsx`:

```tsx
// src/pages/pricing/rate-builder/[id].tsx
import React from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/Auth";
import { UserRoles } from "../../../generated/graphql";
import hasPermission from "../../../utils/hasPermission";
import ClientOnly from "../../../components/Common/ClientOnly";
import CalculatorCanvas from "../../../components/pages/developer/CalculatorCanvas";

// Navbar is 3.4rem, header bar is 36px
const CANVAS_HEIGHT = "calc(100vh - 3.4rem - 36px)";

const RateBuildupEditorPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  React.useEffect(() => {
    if (user === null) {
      router.replace("/");
    } else if (user !== undefined && !hasPermission(user.role, UserRoles.ProjectManager)) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || !hasPermission(user.role, UserRoles.ProjectManager)) return null;
  if (!id || typeof id !== "string") return null;

  return (
    <ClientOnly>
      <CalculatorCanvas docId={id} canvasHeight={CANVAS_HEIGHT} />
    </ClientOnly>
  );
};

export default RateBuildupEditorPage;
```

- [ ] **Step 2: Verify type-check passes**

Run: `npm run type-check` in `client/`
Expected: no errors

- [ ] **Step 3: Manual smoke test end-to-end**

1. Navigate to `http://localhost:3000/pricing`
2. Click a template row — should navigate to `/pricing/rate-builder/[id]`
3. The page should show the dark slim header bar with `← Pricing`, the template name, Fork, Delete buttons
4. The ReactFlow canvas should fill the remaining height
5. Click the template name in the header — it should become an editable input
6. Edit the name and press Enter or click away — the name should update
7. Click `← Pricing` — should navigate back to `/pricing`
8. Click Fork — should navigate to a new template `/pricing/rate-builder/new_[timestamp]`
9. Click Delete → confirm → should navigate back to `/pricing` and the template should be gone

- [ ] **Step 4: Commit**

```bash
git add src/pages/pricing/rate-builder/\[id\].tsx
git commit -m "feat: add /pricing/rate-builder/[id] full-screen canvas editor page"
```

---

### Task 4: Remove Canvas tab from `/developer`

**Files:**
- Modify: `src/pages/developer/index.tsx`

- [ ] **Step 1: Remove the Canvas tab**

In `src/pages/developer/index.tsx`, make these changes:

Remove the import:
```tsx
import CalculatorCanvas from "../../components/pages/developer/CalculatorCanvas";
```

Change the tabs from 3 tabs to 2:
```tsx
// Before
<Tabs variant="enclosed" colorScheme="blue" index={tabIndex} onChange={(i) => { setTabIndex(i); localStorage.setItem("developer:tab", String(i)); }}>
  <TabList>
    <Tab>Ratings Review</Tab>
    <Tab>Calculator Templates</Tab>
    <Tab>Canvas</Tab>
  </TabList>
  <TabPanels>
    <TabPanel px={0}>
      <RatingsReview />
    </TabPanel>
    <TabPanel px={0}>
      <CalculatorTemplates />
    </TabPanel>
    <TabPanel px={0}>
      <CalculatorCanvas />
    </TabPanel>
  </TabPanels>
</Tabs>

// After
<Tabs variant="enclosed" colorScheme="blue" index={tabIndex} onChange={(i) => { setTabIndex(i); localStorage.setItem("developer:tab", String(i)); }}>
  <TabList>
    <Tab>Ratings Review</Tab>
    <Tab>Calculator Templates</Tab>
  </TabList>
  <TabPanels>
    <TabPanel px={0}>
      <RatingsReview />
    </TabPanel>
    <TabPanel px={0}>
      <CalculatorTemplates />
    </TabPanel>
  </TabPanels>
</Tabs>
```

Also remove the `useState` import for `tabIndex` if it's only used for the tab — wait, it's still needed for 2 tabs. Leave the `useState` in place.

- [ ] **Step 2: Verify type-check passes**

Run: `npm run type-check` in `client/`
Expected: no errors

- [ ] **Step 3: Manual check**

Navigate to `http://localhost:3000/developer`. Should show only 2 tabs: "Ratings Review" and "Calculator Templates". No "Canvas" tab.

- [ ] **Step 4: Commit**

```bash
git add src/pages/developer/index.tsx
git commit -m "feat: remove Canvas tab from /developer, now lives at /pricing"
```

---

### Task 5: Add Rate Builder link to `/tenders` page

**Files:**
- Modify: `src/pages/tenders.tsx`

- [ ] **Step 1: Add a link to the tenders page header**

In `src/pages/tenders.tsx`, import `Link` from Next.js and add the Rate Builder button to the header `Flex`. The existing header is:

```tsx
<Flex
  w="100%"
  flexDir="row"
  justifyContent="space-between"
  alignItems="center"
  mb={4}
>
  <Breadcrumbs
    crumbs={[{ title: "Tenders", isCurrentPage: true }]}
  />
  <Button colorScheme="blue" size="sm" onClick={onOpen}>
    New Tender
  </Button>
</Flex>
```

Add `NextLink` import at the top of the file:
```tsx
import NextLink from "next/link";
```

Change the header to:
```tsx
<Flex
  w="100%"
  flexDir="row"
  justifyContent="space-between"
  alignItems="center"
  mb={4}
>
  <Breadcrumbs
    crumbs={[{ title: "Tenders", isCurrentPage: true }]}
  />
  <Flex gap={2} align="center">
    <NextLink href="/pricing" passHref>
      <Button as="a" size="sm" variant="outline" colorScheme="teal">
        Rate Builder
      </Button>
    </NextLink>
    <Button colorScheme="blue" size="sm" onClick={onOpen}>
      New Tender
    </Button>
  </Flex>
</Flex>
```

- [ ] **Step 2: Verify type-check passes**

Run: `npm run type-check` in `client/`
Expected: no errors

- [ ] **Step 3: Manual check**

Navigate to `http://localhost:3000/tenders`. The "Rate Builder" outline button should appear to the left of "New Tender". Clicking it should navigate to `/pricing`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/tenders.tsx
git commit -m "feat: add Rate Builder link to tenders page"
```
