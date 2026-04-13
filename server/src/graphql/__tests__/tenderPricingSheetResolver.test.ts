import request from "supertest";
import mongoose from "mongoose";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import vitestLogin from "@testing/vitestLogin";
import { Tender, TenderPricingSheet } from "@models";
import { RateBuildupOutputKind } from "@typescript/tenderPricingSheet";
import { Server } from "http";

let documents: SeededDatabase, app: Server;
let adminToken: string;
let tenderId: string;

const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  await prepareDatabase();

  app = await createApp();

  await setupDatabase();

  adminToken = await vitestLogin(app, "admin@bowmark.ca");

  // Create a Tender for pricing sheet tests
  const tender = await (Tender as any).create({
    name: "Test Tender for Pricing",
    jobcode: `PRICE-${Date.now()}`,
    status: "bidding",
    files: [],
    notes: [],
    createdBy: new mongoose.Types.ObjectId(),
  });
  tenderId = tender._id.toString();
});

afterAll(async () => {
  await disconnectAndStopServer();
});

// ─── GraphQL strings ─────────────────────────────────────────────────────────

const ROW_FIELDS = `
  _id
  type
  description
  itemNumber
  quantity
  unit
  unitPrice
  rateBuildupSnapshot
  rateBuildupOutputs {
    kind
    materialId
    crewKindId
    unit
    perUnitValue
    totalValue
  }
`;

const sheetCreate = `
  mutation TenderPricingSheetCreate($tenderId: ID!) {
    tenderPricingSheetCreate(tenderId: $tenderId) {
      _id
      rows { _id }
    }
  }
`;

const rowCreate = `
  mutation TenderPricingRowCreate($sheetId: ID!, $data: TenderPricingRowCreateData!) {
    tenderPricingRowCreate(sheetId: $sheetId, data: $data) {
      _id
      rows { ${ROW_FIELDS} }
    }
  }
`;

const rowUpdate = `
  mutation TenderPricingRowUpdate($sheetId: ID!, $rowId: ID!, $data: TenderPricingRowUpdateData!) {
    tenderPricingRowUpdate(sheetId: $sheetId, rowId: $rowId, data: $data) {
      _id
      rows { ${ROW_FIELDS} }
    }
  }
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TenderPricingSheet Resolver", () => {
  let sheetId: string;
  let rowId: string;

  describe("Sheet + row creation", () => {
    test("should create a pricing sheet for a tender", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: sheetCreate,
          variables: { tenderId },
        });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.tenderPricingSheetCreate._id).toBeTruthy();
      expect(res.body.data.tenderPricingSheetCreate.rows).toEqual([]);
      sheetId = res.body.data.tenderPricingSheetCreate._id;
    });

    test("should add a row to the sheet", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: rowCreate,
          variables: {
            sheetId,
            data: {
              type: "Item",
              itemNumber: "1",
              description: "Test Item Row",
              indentLevel: 0,
              sortOrder: 0,
            },
          },
        });

      expect(res.body.errors).toBeUndefined();
      const rows = res.body.data.tenderPricingRowCreate.rows;
      expect(rows.length).toBe(1);
      expect(rows[0].type).toBe("Item");
      expect(rows[0].description).toBe("Test Item Row");
      rowId = rows[0]._id;
    });
  });

  describe("Row update — kind/field validation", () => {
    // The updateRow class method is async, so validation throws are surfaced
    // as rejected promises. We test the model layer directly to confirm
    // the validation logic fires correctly.
    test("should reject Material output with crewKindId", async () => {
      const sheet = await TenderPricingSheet.findById(sheetId);
      expect(sheet).toBeTruthy();

      await expect(
        sheet!.updateRow(rowId, {
          rateBuildupOutputs: [
            {
              kind: RateBuildupOutputKind.Material,
              crewKindId: new mongoose.Types.ObjectId().toString(),
              unit: "t",
              perUnitValue: 10,
              totalValue: 10,
            },
          ],
        })
      ).rejects.toThrow(/Material.*cannot have crewKindId/);
    });

    test("should reject CrewHours output with materialId", async () => {
      const sheet = await TenderPricingSheet.findById(sheetId);
      expect(sheet).toBeTruthy();

      await expect(
        sheet!.updateRow(rowId, {
          rateBuildupOutputs: [
            {
              kind: RateBuildupOutputKind.CrewHours,
              materialId: new mongoose.Types.ObjectId().toString(),
              unit: "hr",
              perUnitValue: 5,
              totalValue: 5,
            },
          ],
        })
      ).rejects.toThrow(/CrewHours.*cannot have materialId/);
    });

    test("should clear outputs when null is sent", async () => {
      // First set valid outputs via GraphQL
      const setRes = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: rowUpdate,
          variables: {
            sheetId,
            rowId,
            data: {
              rateBuildupOutputs: [
                {
                  kind: "Material",
                  materialId: new mongoose.Types.ObjectId().toString(),
                  unit: "t",
                  perUnitValue: 10,
                  totalValue: 100,
                },
              ],
            },
          },
        });

      expect(setRes.body.errors).toBeUndefined();
      const rowBefore = setRes.body.data.tenderPricingRowUpdate.rows.find(
        (r: any) => r._id === rowId
      );
      expect(rowBefore.rateBuildupOutputs.length).toBe(1);

      // Now send null to clear
      const clearRes = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: rowUpdate,
          variables: {
            sheetId,
            rowId,
            data: {
              rateBuildupOutputs: null,
            },
          },
        });

      expect(clearRes.body.errors).toBeUndefined();
      const rowAfter = clearRes.body.data.tenderPricingRowUpdate.rows.find(
        (r: any) => r._id === rowId
      );
      expect(rowAfter.rateBuildupOutputs).toEqual([]);
    });
  });

  describe("Integration: snapshot + outputs persist", () => {
    const snapshotJson = JSON.stringify({
      id: "tmpl_1",
      sourceTemplateId: "tmpl_1",
      label: "Test Template",
      defaultUnit: "m2",
      parameterDefs: [
        {
          id: "rate",
          label: "Rate",
          defaultValue: 120,
          position: { x: 0, y: 0 },
        },
      ],
      tableDefs: [],
      formulaSteps: [
        {
          id: "cost",
          formula: "quantity * rate",
          position: { x: 0, y: 0 },
        },
      ],
      breakdownDefs: [
        {
          id: "bd1",
          label: "T",
          items: [{ stepId: "cost", label: "C" }],
          position: { x: 0, y: 0 },
        },
      ],
      outputDefs: [],
      specialPositions: {
        quantity: { x: 0, y: 0 },
        unitPrice: { x: 0, y: 0 },
      },
      groupDefs: [],
      controllerDefs: [],
      params: { rate: 120 },
      tables: {},
      controllers: {},
    });

    const materialId = new mongoose.Types.ObjectId().toString();

    test("should update a row with snapshot and outputs and verify via GraphQL", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: rowUpdate,
          variables: {
            sheetId,
            rowId,
            data: {
              quantity: 50,
              unit: "m2",
              unitPrice: 120,
              rateBuildupSnapshot: snapshotJson,
              rateBuildupOutputs: [
                {
                  kind: "Material",
                  materialId,
                  unit: "t",
                  perUnitValue: 2.4,
                  totalValue: 120,
                },
              ],
            },
          },
        });

      expect(res.body.errors).toBeUndefined();
      const row = res.body.data.tenderPricingRowUpdate.rows.find(
        (r: any) => r._id === rowId
      );
      expect(row.quantity).toBe(50);
      expect(row.unit).toBe("m2");
      expect(row.unitPrice).toBe(120);
      expect(row.rateBuildupSnapshot).toBe(snapshotJson);
      expect(row.rateBuildupOutputs.length).toBe(1);
      expect(row.rateBuildupOutputs[0].kind).toBe("Material");
      expect(row.rateBuildupOutputs[0].materialId).toBe(materialId);
      expect(row.rateBuildupOutputs[0].unit).toBe("t");
      expect(row.rateBuildupOutputs[0].perUnitValue).toBe(2.4);
      expect(row.rateBuildupOutputs[0].totalValue).toBe(120);
    });

    test("should persist snapshot and outputs to the database", async () => {
      const doc = await TenderPricingSheet.findById(sheetId).lean();
      expect(doc).toBeTruthy();

      const row = doc!.rows.find(
        (r: any) => r._id.toString() === rowId
      );
      expect(row).toBeTruthy();
      expect(row!.quantity).toBe(50);
      expect(row!.unit).toBe("m2");
      expect(row!.unitPrice).toBe(120);
      expect(row!.rateBuildupSnapshot).toBe(snapshotJson);
      expect((row as any).rateBuildupOutputs.length).toBe(1);
      expect((row as any).rateBuildupOutputs[0].kind).toBe("Material");
      expect((row as any).rateBuildupOutputs[0].materialId.toString()).toBe(
        materialId
      );
      expect((row as any).rateBuildupOutputs[0].unit).toBe("t");
      expect((row as any).rateBuildupOutputs[0].perUnitValue).toBe(2.4);
      expect((row as any).rateBuildupOutputs[0].totalValue).toBe(120);
    });
  });
});
