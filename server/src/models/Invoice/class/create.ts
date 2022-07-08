import { InvoiceDocument, InvoiceModel } from "@models";
import { IInvoiceCreate } from "@typescript/invoice";

const document = async (
  Invoice: InvoiceModel,
  data: IInvoiceCreate
): Promise<InvoiceDocument> => {
  const invoice = new Invoice({
    company: data.company._id,
    invoiceNumber: data.invoiceNumber,
    cost: data.cost,
    date: data.date,
    description: data.description,
    internal: data.internal,
    accrual: data.accrual,
  });

  return invoice;
};

export default {
  document,
};
