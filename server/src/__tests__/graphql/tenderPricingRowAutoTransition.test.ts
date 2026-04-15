import mongoose from "mongoose";
import { Types } from "mongoose";
import { TenderPricingSheet, Tender } from "@models";
import TenderPricingSheetResolver from "../../graphql/resolvers/tenderPricingSheet";

// Minimal context shim — the resolver only uses ctx.user for audit logging,
// which is conditional. Tests can pass undefined to skip audit writes.
const noCtx = { user: undefined } as any;

describe("tenderPricingRowUpdate auto-transition", () => {
  let resolver: TenderPricingSheetResolver;
  let tenderId: string;
  let sheetId: string;
  let rowId: string;

  beforeEach(async () => {
    resolver = new TenderPricingSheetResolver();
    const tender = await Tender.create({
      name: "T",
      jobcode: "T-AT",
      files: [],
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
          type: "Item",
          sortOrder: 0,
          itemNumber: "A.1",
          description: "Item",
          indentLevel: 0,
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
  });

  async function reload() {
    const s = await TenderPricingSheet.findById(sheetId).lean();
    return s!.rows[0] as any;
  }

  it("editing only quantity on a not_started row keeps it not_started", async () => {
    await resolver.tenderPricingRowUpdate(sheetId as any, rowId as any, { quantity: 200 } as any, noCtx);
    expect((await reload()).status).toBe("not_started");
  });

  it("editing unitPrice on a not_started row flips to in_progress", async () => {
    await resolver.tenderPricingRowUpdate(sheetId as any, rowId as any, { unitPrice: 99.5 } as any, noCtx);
    expect((await reload()).status).toBe("in_progress");
  });

  it("editing description + unitPrice flips to in_progress (any non-allowlist triggers)", async () => {
    await resolver.tenderPricingRowUpdate(
      sheetId as any,
      rowId as any,
      { description: "New", unitPrice: 50 } as any,
      noCtx,
    );
    expect((await reload()).status).toBe("in_progress");
  });

  it("editing quantity on an in_progress row stays in_progress (no flip)", async () => {
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(rowId) },
      { $set: { "rows.$.status": "in_progress" } },
    );
    await resolver.tenderPricingRowUpdate(sheetId as any, rowId as any, { quantity: 300 } as any, noCtx);
    expect((await reload()).status).toBe("in_progress");
  });

  it("editing quantity + explicit status: 'review' becomes review (explicit wins)", async () => {
    await resolver.tenderPricingRowUpdate(
      sheetId as any,
      rowId as any,
      { quantity: 250, status: "review" } as any,
      noCtx,
    );
    expect((await reload()).status).toBe("review");
  });

  it("editing only allowlisted fields (description) on a not_started row stays not_started", async () => {
    await resolver.tenderPricingRowUpdate(
      sheetId as any,
      rowId as any,
      { description: "Renamed" } as any,
      noCtx,
    );
    expect((await reload()).status).toBe("not_started");
  });
});
