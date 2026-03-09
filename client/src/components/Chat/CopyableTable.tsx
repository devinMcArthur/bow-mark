// client/src/components/Chat/CopyableTable.tsx
import React from "react";
import { Box, Button } from "@chakra-ui/react";
import { useCsvCopy } from "../../hooks/useCsvCopy";

// ReactMarkdown v8 passes hast (HTML AST) nodes, not mdast nodes.
// The hast table structure is: table > thead > tr > th, and table > tbody > tr > td.
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
}

/** Recursively flatten a hast node tree to a plain string. */
function extractText(node: HastNode): string {
  if (node.value !== undefined) return node.value;
  if (node.children) return node.children.map(extractText).join("");
  return "";
}

interface Props {
  children: React.ReactNode;
  /** Hast table element injected by ReactMarkdown v8 */
  node?: HastNode;
}

/**
 * Drop-in replacement for the `table:` ReactMarkdown component.
 * Adds a "Copy CSV" button above the table; the original styling is preserved.
 */
export function CopyableTable({ children, node }: Props) {
  const headers: string[] = [];
  const rows: string[][] = [];

  if (node?.children) {
    const thead = node.children.find(
      (c) => c.type === "element" && c.tagName === "thead"
    );
    const tbody = node.children.find(
      (c) => c.type === "element" && c.tagName === "tbody"
    );

    // Headers: thead > tr > th
    const headerRow = thead?.children?.find(
      (c) => c.type === "element" && c.tagName === "tr"
    );
    if (headerRow?.children) {
      for (const cell of headerRow.children) {
        if (cell.type === "element") headers.push(extractText(cell));
      }
    }

    // Data rows: tbody > tr > td
    if (tbody?.children) {
      for (const row of tbody.children) {
        if (row.type === "element" && row.tagName === "tr") {
          rows.push(
            (row.children ?? []).filter((c) => c.type === "element").map(extractText)
          );
        }
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
