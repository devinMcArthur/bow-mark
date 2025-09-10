import { InvoiceDocument, JobsiteDocument } from "@models";
import ExcelJS from "exceljs";

const generateCompanyInvoiceReportExcel = async (invoices: InvoiceDocument[]) => {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("Invoice Report");

  // Step 1: sort invoices by date
  const sortedInvoices = invoices.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Get jobsite for each invoice
  interface InvoiceWithJobsite extends InvoiceDocument {
    jobsite: JobsiteDocument | null
  }

  const invoicesWithJobsites: InvoiceWithJobsite[] = await Promise.all(
    sortedInvoices.map(async (invoice) => {
      const jobsite = await invoice.getJobsite();
      // Attach jobsite to the original invoice document
      (invoice as InvoiceWithJobsite).jobsite = jobsite;
      return invoice as InvoiceWithJobsite;
    })
  );

  // Step 2: Create the Data Matrix
  const dataMatrix = invoicesWithJobsites.map(invoice => [
    invoice.invoiceNumber,
    invoice.date.toLocaleDateString(),
    invoice.cost,
    invoice.jobsite ? invoice.jobsite.jobcode : "",
    invoice.description || ""
  ]);

  // Step 3: Add the Table
  worksheet.addTable({
    name: "Invoices",
    ref: worksheet.getRow(1).getCell(1).address,
    totalsRow: true,
    columns: [
      { name: "Invoice Number", filterButton: true },
      { name: "Date", filterButton: true },
      { name: "Amount", filterButton: true, totalsRowFunction: "sum" },
      { name: "Job", filterButton: true },
      { name: "Description", filterButton: true },
    ],
    rows: dataMatrix,
  });

  // Auto Column Width
  worksheet.columns.forEach((column) => {
    let dataMax = 2;

    if (column.values) {
      column.values.forEach((value) => {
        if (
          value &&
          (typeof value === "string" || typeof value === "number") &&
          `${value}`.length > dataMax
        )
          dataMax = `${value}`.length + 4;
      });
    }

    column.width = dataMax;
  });

  return workbook;
};

export default generateCompanyInvoiceReportExcel;
