import request from "supertest";
import { Types } from "mongoose";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import vitestLogin from "@testing/vitestLogin";
import { RateBuildupTemplate } from "@models";
import { Server } from "http";

let documents: SeededDatabase, app: Server;
let adminToken: string;

const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  await prepareDatabase();

  app = await createApp();

  await setupDatabase();

  adminToken = await vitestLogin(app, "admin@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const oid = () => new Types.ObjectId().toString();
const pos = { x: 0, y: 0 };

function templateData(overrides: Record<string, any> = {}) {
  return {
    label: `Test Template ${Date.now()}`,
    defaultUnit: "m2",
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [{ id: "cost", formula: "quantity * 10", position: pos }],
    breakdownDefs: [
      {
        id: "bd1",
        label: "Total",
        items: [{ stepId: "cost", label: "Cost" }],
        position: pos,
      },
    ],
    outputDefs: [],
    controllerDefs: [],
    groupDefs: [],
    ...overrides,
  };
}

// ─── GraphQL strings ─────────────────────────────────────────────────────────

const saveRateBuildupTemplate = `
  mutation SaveRateBuildupTemplate($data: SaveRateBuildupTemplateData!) {
    saveRateBuildupTemplate(data: $data) {
      _id
      label
      defaultUnit
      outputDefs {
        id
        kind
        sourceStepId
        unit
        label
        defaultMaterialId
        defaultCrewKindId
        allowedMaterialIds
        allowedCrewKindIds
      }
    }
  }
`;

const deleteRateBuildupTemplate = `
  mutation DeleteRateBuildupTemplate($id: ID!) {
    deleteRateBuildupTemplate(id: $id)
  }
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RateBuildupTemplate Resolver", () => {
  let firstId: string;

  describe("MUTATIONS", () => {
    describe("saveRateBuildupTemplate", () => {
      test("should create a new template", async () => {
        const data = templateData({ label: "Create Test Template" });

        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: saveRateBuildupTemplate,
            variables: { data },
          });

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.saveRateBuildupTemplate.label).toBe(
          "Create Test Template"
        );
        expect(res.body.data.saveRateBuildupTemplate.defaultUnit).toBe("m2");
        firstId = res.body.data.saveRateBuildupTemplate._id;
      });

      test("should update an existing template", async () => {
        const data = templateData({
          id: firstId,
          label: "Updated Template",
          defaultUnit: "m3",
        });

        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: saveRateBuildupTemplate,
            variables: { data },
          });

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.saveRateBuildupTemplate.label).toBe(
          "Updated Template"
        );
        expect(res.body.data.saveRateBuildupTemplate.defaultUnit).toBe("m3");
        expect(res.body.data.saveRateBuildupTemplate._id).toBe(firstId);
      });

      test("should reject duplicate label", async () => {
        // Create a second template
        const secondData = templateData({ label: "Duplicate Target" });
        await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: saveRateBuildupTemplate,
            variables: { data: secondData },
          });

        // Try to create another with the same label
        const dupData = templateData({ label: "Duplicate Target" });
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: saveRateBuildupTemplate,
            variables: { data: dupData },
          });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain("already exists");
      });
    });

    describe("output whitelist/default invariants", () => {
      test("should reject material default outside allowed list", async () => {
        const matA = oid(), matB = oid(), matC = oid();
        const data = templateData({
          label: `Whitelist Reject Mat ${Date.now()}`,
          outputDefs: [
            {
              id: "out1",
              kind: "Material",
              sourceStepId: "cost",
              unit: "t",
              label: "Aggregate",
              allowedMaterialIds: [matA, matB],
              defaultMaterialId: matC,
              position: pos,
            },
          ],
        });

        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: saveRateBuildupTemplate,
            variables: { data },
          });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain(
          "default material is not in its allowed list"
        );
      });

      test("should reject crewKind default outside allowed list", async () => {
        const ckA = oid(), ckB = oid(), ckC = oid();
        const data = templateData({
          label: `Whitelist Reject Crew ${Date.now()}`,
          outputDefs: [
            {
              id: "out1",
              kind: "CrewHours",
              sourceStepId: "cost",
              unit: "hr",
              label: "Labour",
              allowedCrewKindIds: [ckA, ckB],
              defaultCrewKindId: ckC,
              position: pos,
            },
          ],
        });

        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: saveRateBuildupTemplate,
            variables: { data },
          });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain(
          "default crew kind is not in its allowed list"
        );
      });

      test("should accept default within allowed list", async () => {
        const matA = oid(), matB = oid();
        const data = templateData({
          label: `Whitelist Accept ${Date.now()}`,
          outputDefs: [
            {
              id: "out1",
              kind: "Material",
              sourceStepId: "cost",
              unit: "t",
              label: "Aggregate",
              allowedMaterialIds: [matA, matB],
              defaultMaterialId: matA,
              position: pos,
            },
          ],
        });

        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: saveRateBuildupTemplate,
            variables: { data },
          });

        expect(res.body.errors).toBeUndefined();
        expect(
          res.body.data.saveRateBuildupTemplate.outputDefs[0].defaultMaterialId
        ).toBe(matA);
      });

      test("should accept when no whitelist is set", async () => {
        const matAny = oid();
        const data = templateData({
          label: `No Whitelist ${Date.now()}`,
          outputDefs: [
            {
              id: "out1",
              kind: "Material",
              sourceStepId: "cost",
              unit: "t",
              label: "Aggregate",
              defaultMaterialId: matAny,
              position: pos,
            },
          ],
        });

        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: saveRateBuildupTemplate,
            variables: { data },
          });

        expect(res.body.errors).toBeUndefined();
        expect(
          res.body.data.saveRateBuildupTemplate.outputDefs[0].defaultMaterialId
        ).toBe(matAny);
      });
    });

    describe("deleteRateBuildupTemplate", () => {
      test("should delete a template and return true", async () => {
        // Create a template to delete
        const data = templateData({ label: `To Delete ${Date.now()}` });
        const createRes = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: saveRateBuildupTemplate,
            variables: { data },
          });

        const deleteId = createRes.body.data.saveRateBuildupTemplate._id;

        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: deleteRateBuildupTemplate,
            variables: { id: deleteId },
          });

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.deleteRateBuildupTemplate).toBe(true);

        // Verify it's gone from the database
        const doc = await RateBuildupTemplate.findById(deleteId);
        expect(doc).toBeNull();
      });
    });
  });
});
