import { TenderDocument, TenderModel } from "@models";
import { ITenderCreate } from "@typescript/tender";

const document = async (
  Tender: TenderModel,
  data: ITenderCreate
): Promise<TenderDocument> => {
  return new Tender({
    name: data.name,
    jobcode: data.jobcode,
    description: data.description,
    createdBy: data.createdBy,
    status: "bidding",
    files: [],
  });
};

export default { document };
