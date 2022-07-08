import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import jestLogin from "@testing/jestLogin";
import { Invoice } from "@models";
import { InvoiceData } from "@graphql/resolvers/invoice/mutations";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

let mongoServer: MongoMemoryServer, documents: SeededDatabase, app: Server;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  mongoServer = await prepareDatabase();

  app = await createApp();

  await setupDatabase();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("Invoice Resolver", () => {
  describe("MUTATIONS", () => {
    describe("invoiceUpdate", () => {
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

      describe("success", () => {
        test("should successfully update invoice", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

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
    });
  });
});
