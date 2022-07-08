import { InvoiceDocument } from "@models";
import { IInvoiceUpdate } from "@typescript/invoice";

const document = async (invoice: InvoiceDocument, data: IInvoiceUpdate) => {
  invoice.company = data.company._id;

  invoice.invoiceNumber = data.invoiceNumber;

  invoice.cost = data.cost;

  invoice.date = data.date;

  invoice.description = data.description;

  invoice.internal = data.internal;

  invoice.accrual = data.accrual;

  return;
};

export default {
  document,
};
