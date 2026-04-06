import { TenderReviewDocument, TenderReviewModel } from "@models";

const document = async (
  TenderReview: TenderReviewModel,
  tenderId: string
): Promise<TenderReviewDocument> => {
  return new TenderReview({
    tender: tenderId,
    status: "draft",
    auditLog: [],
    comments: [],
  });
};

export default { document };
