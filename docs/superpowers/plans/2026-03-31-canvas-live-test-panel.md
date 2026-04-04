# Canvas Live Test Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible, resizable Live Test panel to the left side of CalculatorCanvas that evaluates the active template with scratch inputs and shows live results — never persisting back to the doc.

**Architecture:** Two tasks — first build `LiveTestPanel.tsx` in isolation, then wire it into `index.tsx` with collapse/resize state. No new evaluate logic; reuses `evaluateTemplate`, `debugEvaluateTemplate`, `BreakdownCell`, and `RateRow` from existing files.

**Tech Stack:** React, Chakra UI, existing `evaluate.ts` and `calculatorShared.tsx`

---

## File Map

| File | Change |
|------|--------|
| `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx` | **Create** — new component |
| `client/src/components/pages/developer/CalculatorCanvas/index.tsx` | **Modify** — add state, drag handle, layout |

---

### Task 1: Create LiveTestPanel.tsx

**Files:**
- Create: `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx`

**Context for this task:**

The component receives a `CanvasDocument` and an `onCollapse` callback. It owns all scratch state locally — nothing is ever written back to the doc. On `doc.id` change, state resets to `doc.defaultInputs`.

`CanvasDocument` is defined in `./canvasStorage`:
```typescript
interface CanvasDocument {
  id: string;
  label: string;
  defaultUnit: string;
  parameterDefs: ParameterDef[];   // { id, label, suffix?, defaultValue }
  tableDefs: TableDef[];            // { id, label, rowLabel }
  formulaSteps: FormulaStep[];
  breakdownDefs: BreakdownDef[];
  intermediateDefs: IntermediateDef[];
  defaultInputs: CalculatorInputs; // { params: Record<string,number>, tables: Record<string,RateEntry[]> }
  nodePositions: Record<string, { x: number; y: number }>;
}
```

Reuse these existing components:
- `BreakdownCell` from `../../../../components/TenderPricing/calculatorShared` — props: `label`, `value`, `borderRight?`, `highlight?`
- `RateRow` from same file — props: `entry`, `onChangeName`, `onChangeQty`, `onChangeRate`, `onDelete`
- `evaluateTemplate(doc, inputs, quantity)` from `../../../../components/TenderPricing/calculators/evaluate`
- `debugEvaluateTemplate(doc, inputs, quantity)` from same file — returns `StepDebugInfo[]` where each has `{ id, formula, value, error? }`

- [ ] **Step 1: Create the file with the complete implementation**

```tsx
// client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Grid, Input, Text } from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import { FiPlus } from "react-icons/fi";
import { CanvasDocument } from "./canvasStorage";
import { RateEntry } from "../../../../components/TenderPricing/calculators/types";
import {
  evaluateTemplate,
  debugEvaluateTemplate,
} from "../../../../components/TenderPricing/calculators/evaluate";
import {
  BreakdownCell,
  RateRow,
} from "../../../../components/TenderPricing/calculatorShared";

interface Props {
  doc: CanvasDocument;
  onCollapse: () => void;
}

const LiveTestPanel: React.FC<Props> = ({ doc, onCollapse }) => {
  const [quantity, setQuantity] = useState(100);
  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      doc.parameterDefs.map((p) => [p.id, doc.defaultInputs.params[p.id] ?? p.defaultValue])
    )
  );
  const [tables, setTables] = useState<Record<string, RateEntry[]>>(
    () => doc.defaultInputs.tables
  );

  // Reset scratch state when the active doc changes
  useEffect(() => {
    setQuantity(100);
    setParams(
      Object.fromEntries(
        doc.parameterDefs.map((p) => [p.id, doc.defaultInputs.params[p.id] ?? p.defaultValue])
      )
    );
    setTables(doc.defaultInputs.tables);
  }, [doc.id]);

  const inputs = useMemo(() => ({ params, tables }), [params, tables]);

  const result = useMemo(
    () => evaluateTemplate(doc, inputs, quantity),
    [doc, inputs, quantity]
  );

  const stepDebug = useMemo(
    () => debugEvaluateTemplate(doc, inputs, quantity),
    [doc, inputs, quantity]
  );

  const updateRow = (
    tableId: string,
    rowId: string,
    field: keyof RateEntry,
    value: string | number
  ) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] ?? []).map((r) =>
        r.id === rowId ? { ...r, [field]: value } : r
      ),
    }));
  };

  const addRow = (tableId: string) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: [
        ...(prev[tableId] ?? []),
        { id: uuidv4(), name: "", qty: 1, ratePerHour: 0 },
      ],
    }));
  };

  const removeRow = (tableId: string, rowId: string) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] ?? []).filter((r) => r.id !== rowId),
    }));
  };

  return (
    <Box h="100%" overflowY="auto" bg="white">
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        borderBottom="1px solid"
        borderColor="gray.100"
        position="sticky"
        top={0}
        bg="white"
        zIndex={1}
      >
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Live Test
        </Text>
        <Button
          size="xs"
          variant="ghost"
          onClick={onCollapse}
          aria-label="Collapse live test panel"
          px={1}
          minW="auto"
          color="gray.400"
          _hover={{ color: "gray.600" }}
        >
          «
        </Button>
      </Flex>

      <Box px={3} py={3}>
        {/* Quantity */}
        <Flex align="center" gap={2} mb={4}>
          <Text fontSize="sm" color="gray.600" flex={1}>
            Quantity
          </Text>
          <Input
            size="sm"
            type="number"
            w="80px"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            textAlign="right"
          />
          <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">
            {doc.defaultUnit}
          </Text>
        </Flex>

        {/* Parameters */}
        {doc.parameterDefs.length > 0 && (
          <>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={2}
            >
              Parameters
            </Text>
            <Grid templateColumns="1fr 80px" gap={2} alignItems="center" mb={4}>
              {doc.parameterDefs.map((p) => (
                <React.Fragment key={p.id}>
                  <Text fontSize="sm" color="gray.700">
                    {p.label}
                    {p.suffix && (
                      <Text as="span" fontSize="xs" color="gray.400">
                        {" "}
                        ({p.suffix})
                      </Text>
                    )}
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    textAlign="right"
                    value={params[p.id] ?? p.defaultValue}
                    onChange={(e) =>
                      setParams((prev) => ({
                        ...prev,
                        [p.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </React.Fragment>
              ))}
            </Grid>
          </>
        )}

        {/* Rate Tables */}
        {doc.tableDefs.map((t) => {
          const rows = tables[t.id] ?? [];
          const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
          return (
            <Box key={t.id} mb={4}>
              <Flex align="center" justify="space-between" mb={1}>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="gray.400"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  {t.label}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  ${ratePerHr.toFixed(2)}/hr
                </Text>
              </Flex>
              <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#F7FAFC" }}>
                      <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500, color: "#718096" }}>
                        {t.rowLabel}
                      </th>
                      <th style={{ textAlign: "center", padding: "4px 4px", fontWeight: 500, color: "#718096", width: "40px" }}>
                        Qty
                      </th>
                      <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "64px" }}>
                        $/hr
                      </th>
                      <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "64px" }}>
                        Total
                      </th>
                      <th style={{ width: "28px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <RateRow
                        key={row.id}
                        entry={row}
                        onChangeName={(v) => updateRow(t.id, row.id, "name", v)}
                        onChangeQty={(v) => updateRow(t.id, row.id, "qty", v)}
                        onChangeRate={(v) => updateRow(t.id, row.id, "ratePerHour", v)}
                        onDelete={() => removeRow(t.id, row.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </Box>
              <Button
                size="xs"
                variant="ghost"
                leftIcon={<FiPlus />}
                mt={1}
                color="gray.500"
                onClick={() => addRow(t.id)}
              >
                Add
              </Button>
            </Box>
          );
        })}

        {/* Summary breakdown */}
        {result.breakdown.length > 0 && (
          <>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={2}
            >
              Summary
            </Text>
            <Grid
              templateColumns={`repeat(${result.breakdown.length + 1}, 1fr)`}
              gap={0}
              borderWidth={1}
              borderColor="gray.200"
              rounded="lg"
              overflow="hidden"
              mb={3}
            >
              {result.breakdown.map((cat) => (
                <BreakdownCell key={cat.id} label={cat.label} value={cat.value} borderRight />
              ))}
              <BreakdownCell label="Unit Price" value={result.unitPrice} highlight />
            </Grid>
          </>
        )}

        {/* Formula step debug */}
        {stepDebug.length > 0 && (
          <Box mt={2}>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={2}
            >
              Formula Steps
            </Text>
            <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#F7FAFC" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600, color: "#718096", fontFamily: "monospace" }}>
                      id
                    </th>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600, color: "#718096", fontFamily: "monospace" }}>
                      formula
                    </th>
                    <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600, color: "#718096", width: "80px" }}>
                      value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stepDebug.map((s) => (
                    <tr
                      key={s.id}
                      style={{
                        background: s.error ? "#FFF5F5" : "white",
                        borderTop: "1px solid #EDF2F7",
                      }}
                    >
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", color: s.error ? "#C53030" : "#4A5568" }}>
                        {s.id}
                      </td>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", color: "#805AD5" }}>
                        {s.formula}
                        {s.error && (
                          <span style={{ color: "#C53030", marginLeft: 8, fontFamily: "sans-serif" }}>
                            ⚠ {s.error}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "4px 8px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: s.error ? "#C53030" : "#1A202C",
                        }}
                      >
                        {s.error ? "—" : s.value.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LiveTestPanel;
```

- [ ] **Step 2: Verify the file type-checks**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | grep -A2 "LiveTestPanel"
```

Expected: no errors referencing `LiveTestPanel.tsx`. Other pre-existing errors are fine to ignore.

- [ ] **Step 3: Commit**

```bash
cd /home/dev/work/bow-mark && git add client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx && git commit -m "feat: add LiveTestPanel component with scratch inputs and live evaluation"
```

---

### Task 2: Wire LiveTestPanel into index.tsx

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/index.tsx`

**Context for this task:**

The current layout inside the `<Flex>` is:
```
[Canvas (flex:1)] | [4px right drag handle, only when node selected] | [Inspect panel, 0px when no node]
```

Target layout:
```
[Live Test (280px) or 32px strip] | [4px left drag handle, only when open] | [Canvas (flex:1)] | [4px right drag handle] | [Inspect panel]
```

The existing right-side resize uses refs `dragStartX` and `dragStartWidth` (both `useRef`). The left drag handle needs its own `liveTestDragStartWidth` ref; it can share `dragStartX` since only one drag can be active at a time. The direction is mirrored: dragging right = wider (add delta), vs the right handle where dragging left = wider (subtract delta).

Current `onResizeStart` for reference:
```typescript
const onResizeStart = useCallback((e: React.MouseEvent) => {
  dragStartX.current = e.clientX;
  dragStartWidth.current = inspectWidth;
  const onMove = (ev: MouseEvent) => {
    if (dragStartX.current === null) return;
    const delta = dragStartX.current - ev.clientX; // left = wider for right panel
    setInspectWidth(Math.max(200, Math.min(600, dragStartWidth.current + delta)));
  };
  ...
}, [inspectWidth]);
```

- [ ] **Step 1: Add new state and refs**

In `index.tsx`, add after the existing `dragStartWidth` ref declaration:

```typescript
const [liveTestOpen, setLiveTestOpen] = useState(true);
const [liveTestWidth, setLiveTestWidth] = useState(280);
const liveTestDragStartWidth = useRef(280);
```

- [ ] **Step 2: Add the left drag handle callback**

Add after the existing `onResizeStart` callback:

```typescript
const onLiveTestResizeStart = useCallback((e: React.MouseEvent) => {
  dragStartX.current = e.clientX;
  liveTestDragStartWidth.current = liveTestWidth;
  const onMove = (ev: MouseEvent) => {
    if (dragStartX.current === null) return;
    const delta = ev.clientX - dragStartX.current; // right = wider for left panel
    setLiveTestWidth(Math.max(200, Math.min(600, liveTestDragStartWidth.current + delta)));
  };
  const onUp = () => {
    dragStartX.current = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}, [liveTestWidth]);
```

- [ ] **Step 3: Add the LiveTestPanel import**

At the top of `index.tsx`, add:

```typescript
import LiveTestPanel from "./LiveTestPanel";
```

- [ ] **Step 4: Replace the canvas Flex layout**

Replace the entire `<Flex borderWidth={1} ...>` block (currently lines ~244–302) with:

```tsx
{activeDoc && (
  <Flex
    borderWidth={1}
    borderColor="gray.200"
    rounded="lg"
    overflow="hidden"
    h={canvasHeight}
  >
    {/* Live Test panel or collapsed strip */}
    {liveTestOpen ? (
      <>
        <Box
          w={`${liveTestWidth}px`}
          flexShrink={0}
          h="100%"
          overflowY="auto"
          borderRight="1px solid"
          borderColor="gray.200"
        >
          <LiveTestPanel
            doc={activeDoc}
            onCollapse={() => setLiveTestOpen(false)}
          />
        </Box>
        <Box
          w="4px"
          flexShrink={0}
          h="100%"
          bg="gray.200"
          cursor="col-resize"
          onMouseDown={onLiveTestResizeStart}
          _hover={{ bg: "purple.300" }}
          transition="background 0.15s"
        />
      </>
    ) : (
      <Box
        w="32px"
        flexShrink={0}
        h="100%"
        bg="gray.50"
        borderRight="1px solid"
        borderColor="gray.200"
        display="flex"
        alignItems="flex-start"
        justifyContent="center"
        pt={2}
      >
        <Button
          size="xs"
          variant="ghost"
          onClick={() => setLiveTestOpen(true)}
          aria-label="Expand live test panel"
          px={1}
          minW="auto"
          color="gray.400"
          _hover={{ color: "gray.600" }}
        >
          »
        </Button>
      </Box>
    )}

    {/* Canvas */}
    <Box flex={1} h="100%" bg="#0f172a">
      <CanvasFlow
        doc={activeDoc}
        edges={edges}
        stepDebug={stepDebug}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onUpdateDoc={handleUpdateDoc}
        clipboard={clipboard}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDeleteNodes={handleDeleteNodes}
        onCreateNode={handleCreateNode}
        positionResetKey={positionResetKey}
      />
    </Box>

    {/* Right drag handle — only shown when a node is selected */}
    {selectedNodeId && (
      <Box
        w="4px"
        flexShrink={0}
        h="100%"
        bg="gray.200"
        cursor="col-resize"
        onMouseDown={onResizeStart}
        _hover={{ bg: "purple.300" }}
        transition="background 0.15s"
      />
    )}

    <Box
      w={selectedNodeId ? `${inspectWidth}px` : "0px"}
      flexShrink={0}
      h="100%"
      overflowY="auto"
      overflowX="hidden"
      bg="white"
      transition="width 0.15s"
    >
      <InspectPanel
        template={activeDoc}
        selectedNodeId={selectedNodeId}
        stepDebug={stepDebug}
        edges={edges}
        onUpdateDoc={handleUpdateDocFromPanel}
      />
    </Box>
  </Flex>
)}
```

- [ ] **Step 5: Type-check the full file**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: no new errors. If you see `liveTestDragStartWidth` or `onLiveTestResizeStart` errors, check the ref/callback declarations from Steps 1–2.

- [ ] **Step 6: Verify visually**

Open the calculator canvas in the browser. Confirm:
1. Live Test panel appears on the left, ~280px wide, with params/tables/summary sections populated from the active doc's defaults
2. Dragging the left drag handle resizes the panel between 200px and 600px
3. Clicking `«` collapses to a 32px strip with a `»` button
4. Clicking `»` re-expands to the previous width, scratch values intact
5. Switching to a different template resets all scratch values to the new doc's defaults
6. Inspect panel on the right still works normally (click a node, drag, etc.)

- [ ] **Step 7: Commit**

```bash
cd /home/dev/work/bow-mark && git add client/src/components/pages/developer/CalculatorCanvas/index.tsx && git commit -m "feat: wire LiveTestPanel into CalculatorCanvas with collapse and resize"
```
