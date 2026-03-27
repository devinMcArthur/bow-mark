import { TenderDocument, TenderModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";

const byId = async (
  Tender: TenderModel,
  id: Id,
  options?: GetByIDOptions
): Promise<TenderDocument | null> => {
  const query = Tender.findById(id)
    .populate({ path: "files", populate: { path: "file" } })
    .populate({ path: "notes.savedBy", select: "name" });
  if (options?.throwError) {
    const tender = await query;
    if (!tender) throw new Error(`Tender ${id} not found`);
    return tender;
  }
  return query;
};

const list = async (Tender: TenderModel): Promise<TenderDocument[]> => {
  return Tender.find().sort({ createdAt: -1 });
};

export default { byId, list };
