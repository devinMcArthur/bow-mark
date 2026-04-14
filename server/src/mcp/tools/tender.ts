import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Per-MCP-session state for the document tools — preserves the per-turn
 * page-budget + dedup behavior that the legacy `makeReadDocumentExecutor`
 * closure provided. A fresh object is allocated for each new MCP session.
 */
export interface TenderToolsSessionState {
  pdfPagesLoaded: number;
  loadedRangeKeys: Set<string>;
}

export function makeSessionState(): TenderToolsSessionState {
  return { pdfPagesLoaded: 0, loadedRangeKeys: new Set() };
}

/**
 * Registers all tender-scoped MCP tools:
 *   - get_tender_pricing_rows (read)
 *   - create_pricing_rows / update_pricing_rows / delete_pricing_rows / reorder_pricing_rows (write, PM+)
 *   - save_tender_note / delete_tender_note (write, PM+)
 *   - list_document_pages / read_document (read)
 *
 * All tools pull the active tender + user from `getRequestContext()` and never
 * accept tenderId/userId as Claude-visible parameters (prompt-injection guard).
 *
 * The `sessionState` argument carries per-MCP-session state (page budget +
 * dedup) for the document tools — fresh per session, never shared.
 */
export function register(
  _server: McpServer,
  _sessionState: TenderToolsSessionState,
): void {
  // Tools added in subsequent tasks.
}
