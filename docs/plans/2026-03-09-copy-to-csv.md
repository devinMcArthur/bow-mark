# Copy to CSV — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Copy CSV" button to every table in the chat interface — both ReactMarkdown-rendered tables and SourcesDrawer JSON tables.

**Architecture:** Shared pure utility (`csvUtils.ts`) + tiny hook (`useCsvCopy.ts`), consumed by a new `CopyableTable` wrapper component (Markdown tables) and inline in `SourcesDrawer` (JSON tables). No new dependencies — Chakra's `useClipboard` already handles the 2-second reset.

**Tech Stack:** React 17, Chakra UI 1.x (`useClipboard`, `Button`, `Box`), `react-markdown` v8 (mdast `node` prop), TypeScript

---

### Task 1: `csvUtils.ts` — pure CSV serialiser

**Files:**
- Create: `client/src/utils/csvUtils.ts`

No test runner is configured in the client; verification is via `type-check` + manual smoke-test in the browser (Task 5).

**Step 1: Create the file**

```typescript
// client/src/utils/csvUtils.ts

/**
 * Converts a header row + data rows to an RFC 4180-compliant CSV string.
 * Cells containing commas, double-quotes, or newlines are wrapped in quotes;
 * internal double-quotes are escaped by doubling them.
 */
export function arrayToCsv(headers: string[], rows: string[][]): string {
  const escape = (cell: string): string => {
    if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  return [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}
```

**Step 2: Type-check**

```bash
cd client && npm run type-check
```

Expected: no errors.

**Step 3: Commit**

```bash
git add client/src/utils/csvUtils.ts
git commit -m "feat: add arrayToCsv utility (RFC 4180)"
```

---

### Task 2: `useCsvCopy.ts` — clipboard hook

**Files:**
- Create: `client/src/hooks/useCsvCopy.ts`

**Step 1: Check that the hooks directory exists**

```bash
ls client/src/hooks/
```

If the directory doesn't exist yet, create it:

```bash
mkdir -p client/src/hooks
```

**Step 2: Create the hook**

```typescript
// client/src/hooks/useCsvCopy.ts
import { useClipboard } from "@chakra-ui/react";
import { arrayToCsv } from "../utils/csvUtils";

/**
 * Computes the CSV string from headers + rows and wires it to the clipboard.
 * hasCopied resets to false after 2 seconds (Chakra default).
 */
export function useCsvCopy(headers: string[], rows: string[][]) {
  const csv = arrayToCsv(headers, rows);
  const { onCopy, hasCopied } = useClipboard(csv);
  return { onCopy, hasCopied };
}
```

**Step 3: Type-check**

```bash
cd client && npm run type-check
```

Expected: no errors.

**Step 4: Commit**

```bash
git add client/src/hooks/useCsvCopy.ts
git commit -m "feat: add useCsvCopy hook"
```

---

### Task 3: `CopyableTable.tsx` — Markdown table wrapper

**Files:**
- Create: `client/src/components/Chat/CopyableTable.tsx`

**Background — how ReactMarkdown exposes table data:**

ReactMarkdown v8 passes a `node` prop to every custom component. For a `table`, `node` is the raw mdast `Table` node:

```
table (node)
  tableRow          ← node.children[0]: header row
    tableCell       ← cell.children[0].value = header text
    tableCell
    ...
  tableRow          ← node.children[1..]: data rows
    tableCell
    ...
```

Each `tableCell` contains inline nodes (`text`, `inlineCode`, `strong`, etc.) that may be nested. A recursive `extractText` helper is needed to flatten them to a plain string.

**Step 1: Create the component**

```tsx
// client/src/components/Chat/CopyableTable.tsx
import React from "react";
import { Box, Button } from "@chakra-ui/react";
import { useCsvCopy } from "../../hooks/useCsvCopy";

// Minimal mdast node shape — only the properties we use
interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
}

/** Recursively flatten an mdast node tree to a plain string. */
function extractText(node: MdastNode): string {
  if (node.value !== undefined) return node.value;
  if (node.children) return node.children.map(extractText).join("");
  return "";
}

interface Props {
  children: React.ReactNode;
  /** Raw mdast Table node injected by ReactMarkdown v8 */
  node?: MdastNode;
}

/**
 * Drop-in replacement for the `table:` ReactMarkdown component.
 * Adds a "Copy CSV" button above the table; the original styling is preserved.
 */
export function CopyableTable({ children, node }: Props) {
  const headers: string[] = [];
  const rows: string[][] = [];

  if (node?.children) {
    const [headerRow, ...dataRows] = node.children;

    if (headerRow?.children) {
      for (const cell of headerRow.children) {
        headers.push(extractText(cell));
      }
    }

    for (const row of dataRows) {
      if (row?.children) {
        rows.push(row.children.map(extractText));
      }
    }
  }

  const { onCopy, hasCopied } = useCsvCopy(headers, rows);

  return (
    <Box mb={2}>
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <Button size="xs" variant="ghost" onClick={onCopy}>
          {hasCopied ? "Copied ✓" : "Copy CSV"}
        </Button>
      </Box>
      <Box overflowX="auto">
        <Box as="table" w="full" fontSize="sm" sx={{ borderCollapse: "collapse" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
```

**Step 2: Type-check**

```bash
cd client && npm run type-check
```

Expected: no errors.

**Step 3: Commit**

```bash
git add client/src/components/Chat/CopyableTable.tsx
git commit -m "feat: add CopyableTable Markdown wrapper with CSV export"
```

---

### Task 4: Wire `SourcesDrawer.tsx`

**Files:**
- Modify: `client/src/components/Chat/SourcesDrawer.tsx:93-119`

The `ToolResultPanel` already computes `columns` (line 84) and `rows` (line 83). We just need to:
1. Import `useCsvCopy`
2. Call the hook inside `ToolResultPanel` (always called, even when `renderTable` is false — hook call must be unconditional; we pass empty arrays when not a table)
3. Add the button above the `<Table>` inside the `renderTable` branch

**Step 1: Add the import**

In `SourcesDrawer.tsx`, add `useCsvCopy` import after the Chakra imports:

```typescript
import { useCsvCopy } from "../../hooks/useCsvCopy";
```

**Step 2: Call the hook unconditionally inside `ToolResultPanel`**

Add these two lines immediately after the `const renderValue` declaration (line 91 area), before the `return` statement:

```typescript
const csvHeaders = renderTable ? columns : [];
const csvRows = renderTable
  ? rows!.map((row) => columns.map((col) => renderValue(row[col])))
  : [];
const { onCopy, hasCopied } = useCsvCopy(csvHeaders, csvRows);
```

**Step 3: Add the Copy CSV button above the `<Table>`**

Replace the opening of the `renderTable` branch (currently `<Box overflowX="auto" mb={3}>`) with:

```tsx
{renderTable ? (
  <Box mb={3}>
    <Box display="flex" justifyContent="flex-end" mb={1}>
      <Button size="xs" variant="ghost" onClick={onCopy}>
        {hasCopied ? "Copied ✓" : "Copy CSV"}
      </Button>
    </Box>
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        ...existing Thead/Tbody...
      </Table>
    </Box>
  </Box>
```

Close the outer `<Box mb={3}>` where `</Box>` currently closes `<Box overflowX="auto" mb={3}>`.

**The complete modified `ToolResultPanel` return block (for reference):**

```tsx
return (
  <Box>
    {renderTable ? (
      <Box mb={3}>
        <Box display="flex" justifyContent="flex-end" mb={1}>
          <Button size="xs" variant="ghost" onClick={onCopy}>
            {hasCopied ? "Copied ✓" : "Copy CSV"}
          </Button>
        </Box>
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                {columns.map((col) => (
                  <Th key={col} fontSize="xs" textTransform="none" fontFamily="mono">
                    {col}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {rows!.map((row, i) => (
                <Tr key={i}>
                  {columns.map((col) => (
                    <Td key={col} fontSize="xs" fontFamily="mono" whiteSpace="nowrap">
                      {renderValue(row[col])}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
    ) : (
      // key-value rendering — unchanged
      <Box mb={3}>
        {Object.entries(parsed as Record<string, unknown>).map(([key, val]) => (
          <Box key={key} display="flex" gap={2} mb={1} fontSize="sm">
            <Text as="span" fontWeight="bold" color="gray.700" flexShrink={0}>
              {key}:
            </Text>
            <Text as="span" color="gray.600" fontFamily="mono" fontSize="xs" wordBreak="break-all">
              {renderValue(val)}
            </Text>
          </Box>
        ))}
      </Box>
    )}

    {/* Raw JSON toggle — unchanged */}
    <Button
      variant="ghost"
      size="xs"
      color="gray.500"
      fontWeight="normal"
      onClick={() => setShowRaw((prev) => !prev)}
      mb={showRaw ? 2 : 0}
    >
      {showRaw ? "Hide raw JSON" : "Raw JSON"}
    </Button>
    {showRaw && (
      <Code
        display="block"
        whiteSpace="pre-wrap"
        fontSize="xs"
        p={3}
        borderRadius="md"
        bg="gray.50"
        border="1px solid"
        borderColor="gray.200"
        overflowX="auto"
        w="full"
      >
        {JSON.stringify(parsed, null, 2)}
      </Code>
    )}
  </Box>
);
```

**Step 4: Type-check**

```bash
cd client && npm run type-check
```

Expected: no errors.

**Step 5: Commit**

```bash
git add client/src/components/Chat/SourcesDrawer.tsx
git commit -m "feat: add Copy CSV button to SourcesDrawer table renders"
```

---

### Task 5: Wire `chat.tsx` — swap `table:` for `CopyableTable`

**Files:**
- Modify: `client/src/pages/chat.tsx:93-157`

**Step 1: Add the import** at the top of the file (near other component imports):

```typescript
import { CopyableTable } from "../components/Chat/CopyableTable";
```

**Step 2: Replace the `table:` custom component**

Current code (lines 122-126):

```tsx
table: ({ children }) => (
  <Box overflowX="auto" mb={2}>
    <Box as="table" w="full" fontSize="sm" sx={{ borderCollapse: "collapse" }}>{children}</Box>
  </Box>
),
```

Replace with:

```tsx
table: (props) => <CopyableTable {...props} />,
```

That's it. `CopyableTable` receives `children` (the rendered thead/tbody) and `node` (the mdast AST) from ReactMarkdown automatically via the spread. It reproduces the same `overflowX="auto"` wrapper and table styling internally.

**Step 3: Type-check**

```bash
cd client && npm run type-check
```

Expected: no errors.

**Step 4: Manual smoke-test in the browser**

1. Open the chat page (`http://localhost:3000/chat` or wherever it's served in Tilt)
2. Send a message that produces a Markdown table in the response
3. Confirm "Copy CSV" button appears top-right of the table
4. Click it — label should briefly show "Copied ✓" then revert
5. Paste into a spreadsheet or text editor — data should appear as comma-separated values
6. Open a message with tool results in the SourcesDrawer that renders as a table
7. Repeat steps 3-5

**Step 5: Commit**

```bash
git add client/src/pages/chat.tsx
git commit -m "feat: wire CopyableTable into chat Markdown renderer"
```

---

## Summary of files changed

| Action | Path |
|--------|------|
| Create | `client/src/utils/csvUtils.ts` |
| Create | `client/src/hooks/useCsvCopy.ts` |
| Create | `client/src/components/Chat/CopyableTable.tsx` |
| Modify | `client/src/components/Chat/SourcesDrawer.tsx` |
| Modify | `client/src/pages/chat.tsx` |
