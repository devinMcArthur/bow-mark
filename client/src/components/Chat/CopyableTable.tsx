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
