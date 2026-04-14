import mongoose, { Types } from "mongoose";
import { TenderPricingSheet, Tender, System, EnrichedFile, File as FileModel } from "@models";
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
      createdBy: new Types.ObjectId(),
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
    expect(parsed.totalCreated).toBe(3);
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

describe("update_pricing_rows", () => {
  let tenderId: string;
  let sheetId: string;
  let rowId: string;
  // seeded EnrichedFile id used in the appendDocRefs dedup test
  let seededEnrichedFileId: string;
  let seededFileModelId: string;

  beforeEach(async () => {
    // Seed a minimal File + EnrichedFile so the appendDocRefs validation
    // can resolve the enrichedFileId from the tender's files array.
    const fileDoc = await FileModel.create({
      mimetype: "application/pdf",
    } as any);
    seededFileModelId = fileDoc._id.toString();
    const enrichedFileDoc = await EnrichedFile.create({
      file: fileDoc._id,
      summaryStatus: "pending",
    } as any);
    seededEnrichedFileId = enrichedFileDoc._id.toString();

    const tender = await Tender.create({
      name: "T",
      jobcode: "T-002",
      files: [enrichedFileDoc._id],
      createdBy: new Types.ObjectId(),
    } as any);
    tenderId = tender._id.toString();
    const rowOid = new mongoose.Types.ObjectId();
    rowId = rowOid.toString();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 15,
      rows: [
        {
          _id: rowOid,
          type: "item",
          sortOrder: 0,
          itemNumber: "A.1",
          description: "Old description",
          indentLevel: 2,
          quantity: 100,
          unit: "m",
          status: "not_started",
          docRefs: [],
        },
      ],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
    if (seededEnrichedFileId) await EnrichedFile.deleteOne({ _id: seededEnrichedFileId });
    if (seededFileModelId) await FileModel.deleteOne({ _id: seededFileModelId });
  });

  it("applies allowlisted updates to a not_started row", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("update_pricing_rows", {
          updates: [{ rowId, description: "New description", quantity: 250 }],
        }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toContain("totalUpdated");

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0].description).toBe("New description");
    expect(sheet!.rows[0].quantity).toBe(250);
  });

  it("rejects the whole batch if any row is not not_started", async () => {
    // Flip the row to in_progress
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(rowId) },
      { $set: { "rows.$.status": "in_progress" } },
    );

    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("update_pricing_rows", {
          updates: [{ rowId, description: "Should not apply" }],
        }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toMatch(/in state 'in_progress'/);

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0].description).toBe("Old description");
  });

  it("appendNotes concatenates with newline separator instead of replacing", async () => {
    // Pre-fill an existing note
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(rowId) },
      { $set: { "rows.$.notes": "Original note" } },
    );

    const srv = makeServer();
    await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("update_pricing_rows", {
          updates: [{ rowId, appendNotes: "Added note" }],
        }),
    );

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0].notes).toBe("Original note\n\nAdded note");
  });

  it("appendDocRefs dedupes against existing (enrichedFileId, page) pairs", async () => {
    // Uses seededEnrichedFileId which is attached to the tender (files array),
    // so the validation accepts it. This ensures the dedup logic — not validation —
    // is what determines the final result.

    // Pre-populate the row with an existing docRef at page 5
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(rowId) },
      {
        $set: {
          "rows.$.docRefs": [
            {
              _id: new mongoose.Types.ObjectId(),
              enrichedFileId: new mongoose.Types.ObjectId(seededEnrichedFileId),
              page: 5,
            },
          ],
        },
      },
    );

    const srv = makeServer();
    await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("update_pricing_rows", {
          updates: [
            {
              rowId,
              appendDocRefs: [
                { enrichedFileId: seededEnrichedFileId, page: 5 }, // duplicate — should be skipped
                { enrichedFileId: seededEnrichedFileId, page: 7 }, // new — should be added
              ],
            },
          ],
        }),
    );

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0].docRefs).toHaveLength(2);
    expect(sheet!.rows[0].docRefs.map((d: any) => d.page).sort()).toEqual([5, 7]);
  });
});

describe("delete_pricing_rows", () => {
  let tenderId: string;
  let sheetId: string;
  let row1Id: string;
  let row2Id: string;

  beforeEach(async () => {
    const tender = await Tender.create({
      name: "T",
      jobcode: "T-003",
      files: [],
      createdBy: new Types.ObjectId(),
    } as any);
    tenderId = tender._id.toString();
    const r1 = new mongoose.Types.ObjectId();
    const r2 = new mongoose.Types.ObjectId();
    row1Id = r1.toString();
    row2Id = r2.toString();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 15,
      rows: [
        { _id: r1, type: "item", sortOrder: 0, description: "A", indentLevel: 0, status: "not_started", docRefs: [] },
        { _id: r2, type: "item", sortOrder: 1, description: "B", indentLevel: 0, status: "not_started", docRefs: [] },
      ],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
  });

  it("deletes both rows when both are not_started", async () => {
    const srv = makeServer();
    await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("delete_pricing_rows", { rowIds: [row1Id, row2Id] }),
    );
    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows).toHaveLength(0);
  });

  it("rejects whole batch if one row is in_progress", async () => {
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(row2Id) },
      { $set: { "rows.$.status": "in_progress" } },
    );
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("delete_pricing_rows", { rowIds: [row1Id, row2Id] }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toMatch(/in state 'in_progress'/);

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows).toHaveLength(2);
  });
});

describe("reorder_pricing_rows", () => {
  let tenderId: string;
  let sheetId: string;
  let r1Id: string;
  let r2Id: string;
  let r3Id: string;

  beforeEach(async () => {
    const tender = await Tender.create({ name: "T", jobcode: "T-004", files: [], createdBy: new Types.ObjectId() } as any);
    tenderId = tender._id.toString();
    const r1 = new mongoose.Types.ObjectId();
    const r2 = new mongoose.Types.ObjectId();
    const r3 = new mongoose.Types.ObjectId();
    r1Id = r1.toString();
    r2Id = r2.toString();
    r3Id = r3.toString();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 15,
      rows: [
        { _id: r1, type: "item", sortOrder: 0, description: "A", indentLevel: 0, status: "not_started", docRefs: [] },
        { _id: r2, type: "item", sortOrder: 1, description: "B", indentLevel: 0, status: "in_progress", docRefs: [] },
        { _id: r3, type: "item", sortOrder: 2, description: "C", indentLevel: 0, status: "not_started", docRefs: [] },
      ],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
  });

  it("reorders the full list and reassigns sortOrder", async () => {
    const srv = makeServer();
    await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("reorder_pricing_rows", { rowIds: [r3Id, r1Id, r2Id] }),
    );
    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows.map((r: any) => r._id.toString())).toEqual([r3Id, r1Id, r2Id]);
    expect(sheet!.rows.map((r: any) => r.sortOrder)).toEqual([0, 1, 2]);
  });

  it("allows reordering even when a row is in_progress", async () => {
    // r2 is in_progress in beforeEach; reorder should still succeed
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("reorder_pricing_rows", { rowIds: [r2Id, r3Id, r1Id] }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toContain("reordered");

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0]._id.toString()).toBe(r2Id);
    expect(sheet!.rows[0].status).toBe("in_progress");
  });

  it("rejects partial reorders (missing row)", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("reorder_pricing_rows", { rowIds: [r1Id, r2Id] }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toMatch(/does not match sheet\.rows\.length/);
  });
});

describe("get_tender_pricing_rows", () => {
  let tenderId: string;
  let sheetId: string;

  beforeEach(async () => {
    const tender = await Tender.create({
      name: "T",
      jobcode: "T-005",
      files: [],
      createdBy: new Types.ObjectId(),
    } as any);
    tenderId = tender._id.toString();
    const r1 = new mongoose.Types.ObjectId();
    const r2 = new mongoose.Types.ObjectId();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 12,
      rows: [
        {
          _id: r1,
          type: "item",
          sortOrder: 0,
          description: "Item with template",
          indentLevel: 0,
          status: "not_started",
          docRefs: [],
          rateBuildupSnapshot: '{"version":1}',
        },
        {
          _id: r2,
          type: "item",
          sortOrder: 1,
          description: "Item without template",
          indentLevel: 0,
          status: "not_started",
          docRefs: [],
        },
      ],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
  });

  it("returns rows with hasTemplate flag and strips rateBuildupSnapshot", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("get_tender_pricing_rows", {}),
    );
    const text = (result.content[0] as any).text;
    const parsed = JSON.parse(text);

    expect(parsed.rows).toHaveLength(2);
    expect(parsed.totalRows).toBe(2);
    expect(parsed.defaultMarkupPct).toBe(12);

    const withTemplate = parsed.rows.find((r: any) => r.description === "Item with template");
    const withoutTemplate = parsed.rows.find((r: any) => r.description === "Item without template");

    expect(withTemplate.hasTemplate).toBe(true);
    expect(withoutTemplate.hasTemplate).toBe(false);

    // rateBuildupSnapshot must never leak into the response
    for (const row of parsed.rows) {
      expect(row).not.toHaveProperty("rateBuildupSnapshot");
    }
  });
});

describe("save_tender_note", () => {
  let tenderId: string;

  beforeEach(async () => {
    const tender = await Tender.create({
      name: "T",
      jobcode: "T-006",
      files: [],
      createdBy: new Types.ObjectId(),
    } as any);
    tenderId = tender._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
  });

  it("appends a note with content, savedBy, savedAt, conversationId", async () => {
    const userId = new Types.ObjectId().toString();
    const conversationId = "conv-abc-123";
    const srv = makeServer();
    await runWithContext(
      { userId, role: UserRoles.ProjectManager, tenderId, conversationId },
      () => srv.call("save_tender_note", { content: "test note" }),
    );

    const tender = await Tender.findById(tenderId).lean();
    expect((tender as any)!.notes).toHaveLength(1);
    const note = (tender as any)!.notes[0];
    expect(note.content).toBe("test note");
    expect(note.savedBy.toString()).toBe(userId);
    expect(note.savedAt).toBeInstanceOf(Date);
    expect(note.conversationId).toBe(conversationId);
  });
});

describe("delete_tender_note", () => {
  let tenderId: string;
  let noteId: string;

  beforeEach(async () => {
    const noteOid = new mongoose.Types.ObjectId();
    noteId = noteOid.toString();
    const tender = await Tender.create({
      name: "T",
      jobcode: "T-007",
      files: [],
      createdBy: new Types.ObjectId(),
      notes: [
        {
          _id: noteOid,
          content: "existing note",
          savedAt: new Date(),
          conversationId: "conv-existing",
        },
      ],
    } as any);
    tenderId = tender._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
  });

  it("removes the note from the tender's notes array", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("delete_tender_note", { noteId }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toContain("deleted");

    const tender = await Tender.findById(tenderId).lean();
    expect((tender as any)!.notes).toHaveLength(0);
  });
});
