import { TenderDocument, TenderModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";

const byId = async (
  Tender: TenderModel,
  id: Id,
  options?: GetByIDOptions
): Promise<TenderDocument | null> => {
  if (options?.throwError) {
    const tender = await Tender.findById(id);
    if (!tender) throw new Error(`Tender ${id} not found`);
    return tender;
  }
  return Tender.findById(id);
};

const list = async (Tender: TenderModel): Promise<TenderDocument[]> => {
  return Tender.find().sort({ createdAt: -1 });
};

export default { byId, list };
