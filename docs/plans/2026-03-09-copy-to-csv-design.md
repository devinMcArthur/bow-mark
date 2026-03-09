# Copy to CSV — Design

**Date:** 2026-03-09
**Scope:** Chat message Markdown tables + SourcesDrawer JSON tables

## Problem

Tables rendered in two places (chat Markdown and SourcesDrawer tool results) have no way to export their data. Users want to copy table contents as CSV to paste into spreadsheets.

## Solution

Shared utility + hook, consumed by both table locations. Button sits top-right of each table; label flips to "Copied ✓" on click and resets after 2 seconds.

## Files

### New

- `client/src/utils/csvUtils.ts` — `arrayToCsv(headers, rows)` pure function
- `client/src/hooks/useCsvCopy.ts` — `useCsvCopy(headers, rows)` hook
- `client/src/components/Chat/CopyableTable.tsx` — Markdown table wrapper component

### Modified

- `client/src/components/Chat/SourcesDrawer.tsx` — add Copy CSV button to table renders
- `client/src/pages/chat.tsx` — swap `table:` ReactMarkdown component for `CopyableTable`

## Detailed Design

### `csvUtils.ts`

```ts
export function arrayToCsv(headers: string[], rows: string[][]): string
```

- Joins cells with commas, joins rows with `\r\n`
- Wraps any cell containing `,`, `"`, or `\n` in double-quotes
- Escapes internal double-quotes by doubling them (RFC 4180)

### `useCsvCopy.ts`

```ts
export function useCsvCopy(headers: string[], rows: string[][]) {
  const csv = arrayToCsv(headers, rows);
  const { onCopy, hasCopied } = useClipboard(csv);
  return { onCopy, hasCopied };
}
```

Returns `{ onCopy, hasCopied }`. `hasCopied` resets after 2 seconds (Chakra default).

### `CopyableTable.tsx`

Wraps the existing Markdown `table` custom component. Recursively extracts text from React children to build `headers` (from `th` nodes) and `rows` (from `td` nodes). Renders:

```
[Copy CSV button — top right]
[original table unchanged]
```

Uses `React.Children` traversal + recursive text extraction from element/string nodes.

### SourcesDrawer changes

When `renderMode === "table"`, add the Copy CSV button above the Chakra `Table`. Data source: `headers` from `Object.keys(data[0])`, `rows` from `data.map(obj => headers.map(h => String(obj[h] ?? "")))`.

### Button appearance (both locations)

```tsx
<Button size="xs" variant="ghost" onClick={onCopy}>
  {hasCopied ? "Copied ✓" : "Copy CSV"}
</Button>
```

Positioned with `display="flex"` + `justifyContent="flex-end"` wrapper `Box` above the table.

## Non-Goals

- No download-to-file (clipboard only)
- No CSV formatting options
- No support for key-value renders in SourcesDrawer (only array/table mode)
