import { MongoMemoryServer } from "mongodb-memory-server";

import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/jestDB";
import { Jobsite, JobsiteMaterial } from "@models";

let documents: SeededDatabase, mongoServer: MongoMemoryServer;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  mongoServer = await prepareDatabase();

  await setupDatabase();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("Invoice Class", () => {
  describe("REMOVE", () => {
    describe("removeDocument", () => {
      describe("success", () => {
        test("should successfully remove revenue invoice and all of it's connections", async () => {
          const invoice = documents.invoices.jobsite_3_invoice_1;

          const jobsite = documents.jobsites.jobsite_3;
          expect(jobsite.revenueInvoices).toContain(invoice._id);

          await invoice.removeDocument();

          const newJobsite = await Jobsite.getById(jobsite._id);
          expect(newJobsite?.revenueInvoices.length).toBe(0);
        });

        test("should successfully remove expense invoice and all of it's connections", async () => {
          const invoice = documents.invoices.jobsite_3_invoice_2;

          const jobsite = documents.jobsites.jobsite_3;
          expect(jobsite.expenseInvoices).toContain(invoice._id);

          await invoice.removeDocument();

          const newJobsite = await Jobsite.getById(jobsite._id);
          expect(newJobsite?.expenseInvoices.length).toBe(0);
        });

        test("should successfully remove jobsite material invoice and all of it's connections", async () => {
          const invoice = documents.invoices.jobsite_2_material_1_invoice_1;

          const jobsiteMaterial =
            documents.jobsiteMaterials.jobsite_2_material_2;
          expect(jobsiteMaterial.invoices).toContain(invoice._id);
          expect(jobsiteMaterial.invoices.length).toBe(2);

          await invoice.removeDocument();

          const newJobsiteMaterial = await JobsiteMaterial.getById(
            jobsiteMaterial._id
          );
          expect(newJobsiteMaterial?.invoices.length).toBe(1);
        });
      });
    });
  });
});
