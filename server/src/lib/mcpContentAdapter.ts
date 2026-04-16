/**
 * Adapts MCP tool result content blocks for the Anthropic API.
 *
 * The MCP SDK validates tool results against its own schema (text, image,
 * audio, resource) and rejects Anthropic-specific types like "document".
 * MCP tool handlers encode PDFs as JSON envelopes inside text blocks
 * (marked with __mcp_document). This adapter detects those envelopes and
 * reconstructs native Anthropic document blocks before the content is
 * passed to streamConversation → Claude.
 *
 * Also normalizes plain-string content (spreadsheet branch) into a text
 * block array.
 */

export function adaptMcpContent(
  raw: unknown,
): Array<Record<string, unknown>> {
  // Normalize string → text block array
  const blocks: Array<Record<string, unknown>> =
    typeof raw === "string"
      ? [{ type: "text", text: raw }]
      : Array.isArray(raw)
        ? (raw as Array<Record<string, unknown>>)
        : [];

  // Unwrap __mcp_document envelopes → native Anthropic document blocks
  return blocks.map((block) => {
    if (block.type !== "text" || typeof block.text !== "string") return block;

    // Quick guard: only attempt JSON parse if the text starts with {
    const text = (block.text as string).trim();
    if (!text.startsWith("{")) return block;

    try {
      const parsed = JSON.parse(text);
      if (parsed?.__mcp_document && parsed.source) {
        return {
          type: "document",
          source: parsed.source,
        };
      }
    } catch {
      // Not JSON — return the original text block
    }
    return block;
  });
}

/**
 * Derive a short summary from adapted content blocks for logging.
 */
export function deriveSummary(
  blocks: Array<Record<string, unknown>>,
  toolName: string,
): string {
  const firstText = blocks.find(
    (b) => b.type === "text" && typeof b.text === "string",
  );
  const text = (firstText?.text as string) ?? "";
  return text.length > 200
    ? text.slice(0, 200) + "…"
    : text || `${toolName} completed`;
}
