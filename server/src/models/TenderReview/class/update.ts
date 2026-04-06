import { Types } from "mongoose";
import { TenderReviewDocument } from "@models";
import { TenderReviewStatus, ITenderAuditEventCreate } from "@typescript/tenderReview";
import { Id } from "@typescript/models";

const setStatus = (
  review: TenderReviewDocument,
  status: TenderReviewStatus
): TenderReviewDocument => {
  review.status = status;
  review.updatedAt = new Date();
  return review;
};

const addAuditEvent = (
  review: TenderReviewDocument,
  event: ITenderAuditEventCreate
): TenderReviewDocument => {
  (review.auditLog as any).push({
    _id: new Types.ObjectId(),
    rowId: new Types.ObjectId(event.rowId),
    rowDescription: event.rowDescription,
    action: event.action,
    changedFields: event.changedFields,
    changedBy: new Types.ObjectId(event.changedBy),
    changedAt: new Date(),
  });
  review.updatedAt = new Date();
  return review;
};

const addComment = (
  review: TenderReviewDocument,
  content: string,
  authorId: string
): TenderReviewDocument => {
  (review.comments as any).push({
    _id: new Types.ObjectId(),
    content,
    author: new Types.ObjectId(authorId),
    createdAt: new Date(),
  });
  review.updatedAt = new Date();
  return review;
};

const editComment = (
  review: TenderReviewDocument,
  commentId: Id,
  content: string
): TenderReviewDocument => {
  const comment = (review.comments as any[]).find(
    (c: any) => c._id.toString() === commentId.toString()
  );
  if (!comment) throw new Error(`Comment ${commentId} not found`);
  comment.content = content;
  comment.editedAt = new Date();
  review.updatedAt = new Date();
  return review;
};

const deleteComment = (
  review: TenderReviewDocument,
  commentId: Id
): TenderReviewDocument => {
  (review as any).comments = (review.comments as any[]).filter(
    (c: any) => c._id.toString() !== commentId.toString()
  );
  review.updatedAt = new Date();
  return review;
};

export default { setStatus, addAuditEvent, addComment, editComment, deleteComment };
