import { Invoice, InvoiceDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededInvoices {
  jobsite_3_invoice_1: InvoiceDocument;
  jobsite_3_invoice_2: InvoiceDocument;
  jobsite_2_material_1_invoice_1: InvoiceDocument;
  jobsite_2_material_1_invoice_2: InvoiceDocument;
  sync_invoice_for_shipment_rate: InvoiceDocument;
  sync_invoice_revenue_1: InvoiceDocument;
  sync_invoice_expense_1: InvoiceDocument;
}

const createInvoices = async (): Promise<SeededInvoices> => {
  const jobsite_3_invoice_1 = new Invoice({
    _id: _ids.invoices.jobsite_3_invoice_1._id,
    company: _ids.companies.company_1._id,
    invoiceNumber: "INV-001",
    cost: 5000,
    internal: false,
    description: "Revenue Invoice",
  });

  const jobsite_3_invoice_2 = new Invoice({
    _id: _ids.invoices.jobsite_3_invoice_2._id,
    company: _ids.companies.company_1._id,
    invoiceNumber: "INV-002",
    cost: 500,
    internal: false,
    description: "Expense Invoice",
  });

  const jobsite_2_material_1_invoice_1 = new Invoice({
    _id: _ids.invoices.jobsite_2_material_1_invoice_1._id,
    company: _ids.companies.company_1._id,
    invoiceNumber: "83-393",
    cost: 5000,
    internal: false,
    description: "Material Invoice",
    date: new Date("2022-02-26 7:00 am"),
  });

  const jobsite_2_material_1_invoice_2 = new Invoice({
    _id: _ids.invoices.jobsite_2_material_1_invoice_2._id,
    company: _ids.companies.company_1._id,
    invoiceNumber: "83-394",
    cost: 10000,
    internal: false,
    description: "Material Invoice",
    date: new Date("2022-03-05 7:00 am"),
  });

  const sync_invoice_for_shipment_rate = new Invoice({
    _id: _ids.invoices.sync_invoice_for_shipment_rate._id,
    company: _ids.companies.company_1._id,
    invoiceNumber: "INV-SYNC-001",
    date: new Date("2022-02-01"),
    cost: 500,
    internal: false,
  });

  const sync_invoice_revenue_1 = new Invoice({
    _id: _ids.invoices.sync_invoice_revenue_1._id,
    company: _ids.companies.company_1._id,
    invoiceNumber: "INV-REV-001",
    date: new Date("2022-03-01"),
    cost: 25000,
    internal: false,
  });

  const sync_invoice_expense_1 = new Invoice({
    _id: _ids.invoices.sync_invoice_expense_1._id,
    company: _ids.companies.company_1._id,
    invoiceNumber: "INV-EXP-001",
    date: new Date("2022-03-01"),
    cost: 8000,
    internal: true,
  });

  const invoices = {
    jobsite_3_invoice_1,
    jobsite_3_invoice_2,
    jobsite_2_material_1_invoice_1,
    jobsite_2_material_1_invoice_2,
    sync_invoice_for_shipment_rate,
    sync_invoice_revenue_1,
    sync_invoice_expense_1,
  };

  for (let i = 0; i < Object.values(invoices).length; i++) {
    await Object.values(invoices)[i].save();
  }

  return invoices;
};

export default createInvoices;
