# File Split Design: ChatPage.tsx & mcp-server.ts

## Problem

Two files have grown too large to navigate comfortably:
- `client/src/components/Chat/ChatPage.tsx` — 1,073 lines
- `server/src/mcp-server.ts` — 1,887 lines

## Approach

Split by logical component boundaries. Shared concerns (types, SQL helpers) get their own files only when used across multiple files.

---

## ChatPage.tsx

**New structure:**

```
client/src/components/Chat/
  types.ts              # ChatMessage, ConversationSummary, Role, ToolResult
  ConversationItem.tsx  # Sidebar item with inline rename/delete (~95 lines)
  MarkdownContent.tsx   # ReactMarkdown renderer with Chakra component overrides (~60 lines)
  ChatPage.tsx          # Pricing helpers, SUGGESTIONS, state/data logic, full JSX layout
```

**Rules:**
- `types.ts` is imported by `ConversationItem.tsx`, `MarkdownContent.tsx`, and `ChatPage.tsx`
- Pricing constants (`MODEL_RATES`, `calcTotalCost`, `modelLabel`, `ACTIVE_MODEL`) and `SUGGESTIONS` stay in `ChatPage.tsx` — not shared
- `CopyableTable.tsx` and `SourcesDrawer.tsx` already exist as separate files — no change

---

## mcp-server.ts

**New structure:**

```
server/src/
  mcp-server.ts         # createMcpServer() wires up all tool domains; HTTP server bootstrap
  mcp/
    shared.ts           # getTonnesConversion() SQL helper
    tools/
      search.ts         # search_jobsites, list_jobsites
      financial.ts      # get_jobsite_performance, get_dashboard_overview, get_financial_performance
      productivity.ts   # get_crew_benchmarks, get_employee_productivity, get_equipment_utilization
      operational.ts    # get_material_breakdown, get_vehicle_utilization, get_daily_report_activity
```

**Rules:**
- Each `tools/*.ts` exports `register(server: McpServer): void`
- `mcp-server.ts` imports and calls each register function
- Imports (`db`, `sql`, `mongoose`, models) move to whichever files actually use them
- `shared.ts` exports `getTonnesConversion()` for use across tool files that query tonnes
