import mongoose, { Types } from "mongoose";
import { TenderPricingSheet, Tender, System } from "@models";
import { UserRoles } from "@typescript/user";
import { runWithContext } from "../../mcp/context";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register as registerTender, makeSessionState } from "../../mcp/tools/tender";

// Helper: spin up an in-memory McpServer with the tender tools registered,
// expose a `call(name, args)` shortcut that bypasses the transport layer.
function makeServer() {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerTender(server, makeSessionState());
  // The MCP SDK stores registered tool handlers in `_registeredTools[name].handler`
  // (confirmed against @modelcontextprotocol/sdk dist/cjs/server/mcp.js).
  return {
    call: async (name: string, args: Record<string, unknown>) => {
      const reg = (server as any)._registeredTools?.[name];
      if (!reg) throw new Error(`Tool ${name} not registered`);
      return reg.handler(args);
    },
  };
}

describe("create_pricing_rows", () => {
  let tenderId: string;
  let sheetId: string;

  beforeEach(async () => {
    // Set up minimal in-memory tender + empty pricing sheet.
    const tender = await Tender.create({
      name: "Test Tender",
      jobcode: "T-001",
      files: [],
    } as any);
    tenderId = tender._id.toString();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 15,
      rows: [],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
  });

  it("creates a mixed batch of schedule + group + item in order", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("create_pricing_rows", {
          rows: [
            { type: "schedule", description: "Earthworks", indentLevel: 0, itemNumber: "A" },
            { type: "group", description: "Excavation", indentLevel: 1, itemNumber: "A.1" },
            {
              type: "item",
              description: "Bulk excavation",
              indentLevel: 2,
              itemNumber: "A.1.1",
              quantity: 500,
              unit: "m³",
            },
          ],
        }),
    );
    const text = (result.content[0] as any).text;
    const parsed = JSON.parse(text);
    expect(parsed.totalRows).toBe(3);
    expect(parsed.created).toHaveLength(3);

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows).toHaveLength(3);
    expect(sheet!.rows[0].type).toBe("schedule");
    expect(sheet!.rows[2].quantity).toBe(500);
    expect(sheet!.rows[0].sortOrder).toBe(0);
    expect(sheet!.rows[1].sortOrder).toBe(1);
    expect(sheet!.rows[2].sortOrder).toBe(2);
    expect(sheet!.rows.every((r: any) => r.status === "not_started")).toBe(true);
  });

  it("rejects the whole batch if a schedule row has quantity", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("create_pricing_rows", {
          rows: [
            { type: "schedule", description: "OK schedule", indentLevel: 0 },
            {
              type: "schedule",
              description: "Bad schedule with quantity",
              indentLevel: 0,
              quantity: 100,
            } as any,
          ],
        }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toMatch(/validation failed/);
    expect(text).toMatch(/quantity\/unit only allowed on items/);

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows).toHaveLength(0);
  });

  it("rejects PM role check when user role < ProjectManager", async () => {
    const srv = makeServer();
    await expect(
      runWithContext(
        { userId: new Types.ObjectId().toString(), role: UserRoles.User, tenderId },
        () =>
          srv.call("create_pricing_rows", {
            rows: [{ type: "schedule", description: "Earthworks", indentLevel: 0 }],
          }),
      ),
    ).rejects.toThrow(/Forbidden: PM or Admin role required/);
  });
});
