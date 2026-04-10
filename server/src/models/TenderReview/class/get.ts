import { TenderReviewDocument, TenderReviewModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";

const byTenderId = async (
  TenderReview: TenderReviewModel,
  tenderId: Id
): Promise<TenderReviewDocument | null> => {
  return TenderReview.findOne({ tender: tenderId })
    .populate({ path: "auditLog.changedBy", select: "name" })
    .populate({ path: "comments.author", select: "name" });
};

const byId = async (
  TenderReview: TenderReviewModel,
  id: Id,
  options?: GetByIDOptions
): Promise<TenderReviewDocument | null> => {
  const query = TenderReview.findById(id)
    .populate({ path: "auditLog.changedBy", select: "name" })
    .populate({ path: "comments.author", select: "name" });
  if (options?.throwError) {
    const doc = await query;
    if (!doc) throw new Error(`TenderReview ${id} not found`);
    return doc;
  }
  return query;
};

export default { byTenderId, byId };
