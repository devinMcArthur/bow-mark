import { TenderPricingSheetDocument, TenderPricingSheetModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";

const byId = async (
  TenderPricingSheet: TenderPricingSheetModel,
  id: Id,
  options?: GetByIDOptions
): Promise<TenderPricingSheetDocument | null> => {
  const query = TenderPricingSheet.findById(id);
  if (options?.throwError) {
    const sheet = await query;
    if (!sheet) throw new Error(`TenderPricingSheet ${id} not found`);
    return sheet;
  }
  return query;
};

const byTenderId = async (
  TenderPricingSheet: TenderPricingSheetModel,
  tenderId: Id
): Promise<TenderPricingSheetDocument | null> => {
  return TenderPricingSheet.findOne({ tender: tenderId });
};

export default { byId, byTenderId };
