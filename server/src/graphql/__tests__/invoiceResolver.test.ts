import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import vitestLogin from "@testing/vitestLogin";
import { Invoice } from "@models";
import { InvoiceData } from "@graphql/resolvers/invoice/mutations";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";

let mongoServer: MongoMemoryServer, documents: SeededDatabase, app: Server;
let adminToken: string;
let pmToken: string;
let foremanToken: string;

const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  mongoServer = await prepareDatabase();

  app = await createApp();

  await setupDatabase();

  adminToken = await vitestLogin(app, "admin@bowmark.ca");
  pmToken = await vitestLogin(app, "pm@bowmark.ca");
  foremanToken = await vitestLogin(app, "baseforeman1@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("Invoice Resolver", () => {
  describe("MUTATIONS", () => {
    describe("invoiceUpdateForJobsite", () => {
      const invoiceUpdate = `
        mutation InvoiceUpdate($id: String!, $jobsiteId: ID!, $data: InvoiceData!) {
          invoiceUpdateForJobsite(id: $id, jobsiteId: $jobsiteId, data: $data) {
            _id
            company {
              name
            }
            cost
            invoiceNumber
            description
            internal
          }
        }
      `;

      const invoiceData: InvoiceData = {
        companyId: _ids.companies.company_1._id.toString(),
        cost: 50,
        date: new Date(),
        internal: true,
        invoiceNumber: "56789",
        description: "new description",
        accrual: false,
      };

      const variables = {
        data: invoiceData,
        id: _ids.invoices.jobsite_3_invoice_1._id.toString(),
        jobsiteId: _ids.jobsites.jobsite_3._id.toString(),
      };

      describe("success", () => {
        test("should successfully update invoice", async () => {
          const token = await vitestLogin(app, documents.users.admin_user.email);

          const data: InvoiceData = {
            companyId: documents.companies.company_1._id.toString(),
            cost: 50,
            date: new Date(),
            internal: true,
            invoiceNumber: "56789",
            description: "new description",
            accrual: false,
          };

          const res = await request(app)
            .post("/graphql")
            .send({
              query: invoiceUpdate,
              variables: {
                data,
                id: documents.invoices.jobsite_3_invoice_1._id,
                jobsiteId: documents.jobsites.jobsite_3._id,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.invoiceUpdateForJobsite._id).toBe(
            documents.invoices.jobsite_3_invoice_1._id.toString()
          );

          const invoice = await Invoice.getById(
            documents.invoices.jobsite_3_invoice_1._id
          );

          expect(invoice).toBeDefined();

          expect(invoice?.company?.toString()).toBe(data.companyId);
          expect(invoice?.cost).toBe(data.cost);
          expect(invoice?.internal).toBe(data.internal);
          expect(invoice?.invoiceNumber).toBe(data.invoiceNumber);
          expect(invoice?.description).toBe(data.description);
        });
      });

      describe("authorization", () => {
        it("rejects ProjectManager", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", pmToken)
            .send({ query: invoiceUpdate, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects Foreman", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({ query: invoiceUpdate, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({ query: invoiceUpdate, variables });
          expect(res.body.errors).toBeDefined();
        });
      });
    });

    describe("invoiceUpdateForJobsiteMaterial", () => {
      const mutation = `
        mutation InvoiceUpdateForJobsiteMaterial($id: String!, $jobsiteMaterialId: ID!, $data: InvoiceData!) {
          invoiceUpdateForJobsiteMaterial(id: $id, jobsiteMaterialId: $jobsiteMaterialId, data: $data) {
            _id
          }
        }
      `;
      const variables = {
        id: _ids.invoices.jobsite_2_material_1_invoice_1._id.toString(),
        jobsiteMaterialId: _ids.jobsiteMaterials.jobsite_2_material_1._id.toString(),
        data: {
          companyId: _ids.companies.company_1._id.toString(),
          cost: 100,
          date: new Date().toISOString(),
          internal: false,
          invoiceNumber: "99999",
          description: "test",
          accrual: false,
        },
      };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects Foreman", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });

    describe("invoiceRemove", () => {
      const mutation = `
        mutation InvoiceRemove($id: ID!) {
          invoiceRemove(id: $id)
        }
      `;
      const variables = {
        id: _ids.invoices.jobsite_3_invoice_2._id.toString(),
      };

      it("rejects Foreman", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });
    });
  });
});
