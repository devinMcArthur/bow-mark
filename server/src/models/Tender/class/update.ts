import { TenderDocument } from "@models";
import { ITenderUpdate } from "@typescript/tender";

const fields = async (
  tender: TenderDocument,
  data: ITenderUpdate
): Promise<TenderDocument> => {
  if (data.name !== undefined) tender.name = data.name;
  if (data.description !== undefined) tender.description = data.description;
  if (data.status !== undefined) tender.status = data.status;
  if (data.jobsiteId !== undefined) {
    tender.jobsite = data.jobsiteId ? (data.jobsiteId as any) : undefined;
  }
  return tender;
};

export default { fields };
