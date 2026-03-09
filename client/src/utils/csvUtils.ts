// client/src/utils/csvUtils.ts

/**
 * Converts a header row + data rows to an RFC 4180-compliant CSV string.
 * Cells containing commas, double-quotes, or newlines are wrapped in quotes;
 * internal double-quotes are escaped by doubling them.
 */
export function arrayToCsv(headers: string[], rows: string[][]): string {
  const escape = (cell: unknown): string => {
    const s = cell == null ? "" : String(cell);
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  return [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}
