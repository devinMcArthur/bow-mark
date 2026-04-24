import mongoose from "mongoose";
import { FileNode, InvoiceDocument } from "@models";
import { IInvoiceUpdate } from "@typescript/invoice";

const document = async (invoice: InvoiceDocument, data: IInvoiceUpdate) => {
  invoice.company = data.company._id;

  invoice.invoiceNumber = data.invoiceNumber;

  invoice.cost = data.cost;

  invoice.date = data.date;

  invoice.description = data.description;

  invoice.internal = data.internal;

  invoice.accrual = data.accrual;

  // Only touch documentId when the caller explicitly supplies a value.
  // `undefined` means "leave unchanged" (common when the form doesn't
  // offer file changes); `null` clears the link; a string replaces it.
  if (data.documentId !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previousDocumentId = (invoice as any).documentId as
      | mongoose.Types.ObjectId
      | undefined;
    const nextDocumentId = data.documentId
      ? new mongoose.Types.ObjectId(data.documentId)
      : undefined;

    // File replaced or cleared → soft-trash any FileNode placements
    // pointing at the old Document so the tree doesn't accumulate
    // orphan attachments outliving their owning invoice. Document +
    // File records stay intact (recoverable from Trash).
    if (
      previousDocumentId &&
      previousDocumentId.toString() !== nextDocumentId?.toString()
    ) {
      await FileNode.updateMany(
        { documentId: previousDocumentId, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoice as any).documentId = nextDocumentId;
  }

  return;
};

export default {
  document,
};
