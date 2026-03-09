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
