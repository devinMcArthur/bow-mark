import { TenderPricingSheetDocument, TenderPricingSheetModel } from "@models";
import { ITenderPricingSheetCreate } from "@typescript/tenderPricingSheet";

const document = async (
  TenderPricingSheet: TenderPricingSheetModel,
  data: ITenderPricingSheetCreate
): Promise<TenderPricingSheetDocument> => {
  return new TenderPricingSheet({
    tender: data.tenderId,
    defaultMarkupPct: 15,
    rows: [],
  });
};

export default { document };
