// client/src/utils/csvUtils.ts

/**
 * Converts a header row + data rows to a tab-separated string suitable for
 * pasting into spreadsheet apps (Excel, LibreOffice Calc). Tabs within cells
 * are replaced with a space since tab is the delimiter.
 */
export function arrayToCsv(headers: string[], rows: string[][]): string {
  const escape = (cell: unknown): string => {
    const s = cell == null ? "" : String(cell);
    return s.replace(/\t/g, " ");
  };

  return [headers, ...rows]
    .map((row) => row.map(escape).join("\t"))
    .join("\n");
}
