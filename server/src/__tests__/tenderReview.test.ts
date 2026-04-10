import mongoose from "mongoose";
import { TenderReview } from "@models";
import { prepareDatabase } from "@testing/vitestDB";

beforeAll(async () => {
  await prepareDatabase();
});

const fakeTenderId = () => new mongoose.Types.ObjectId().toString();
const fakeUserId = () => new mongoose.Types.ObjectId().toString();

describe("TenderReview.findOrCreateByTenderId", () => {
  it("creates a document with draft status if none exists", async () => {
    const tenderId = fakeTenderId();
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    expect(review).not.toBeNull();
    expect(review.status).toBe("draft");
    expect(review.auditLog).toHaveLength(0);
    expect(review.comments).toHaveLength(0);
  });

  it("returns existing document on second call", async () => {
    const tenderId = fakeTenderId();
    const r1 = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    const r2 = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    expect(r1._id.toString()).toBe(r2._id.toString());
  });
});

describe("TenderReview.addAuditEvent", () => {
  it("appends an audit event and creates the review if needed", async () => {
    const tenderId = fakeTenderId();
    const rowId = new mongoose.Types.ObjectId().toString();
    await (TenderReview as any).addAuditEvent(tenderId, {
      rowId,
      rowDescription: "Supply HMA",
      action: "row_added",
      changedFields: [],
      changedBy: fakeUserId(),
    });
    const review = await TenderReview.findOne({ tender: tenderId });
    expect(review!.auditLog).toHaveLength(1);
    expect(review!.auditLog[0].action).toBe("row_added");
    expect(review!.auditLog[0].rowDescription).toBe("Supply HMA");
  });
});

describe("TenderReview instance methods", () => {
  let tenderId: string;

  beforeEach(async () => {
    tenderId = fakeTenderId();
    await (TenderReview as any).findOrCreateByTenderId(tenderId);
  });

  it("setStatus updates the status field", async () => {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    review.setStatus("in_review");
    await review.save();
    const refetched = await TenderReview.findOne({ tender: tenderId });
    expect(refetched!.status).toBe("in_review");
  });

  it("addComment appends a comment", async () => {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    const authorId = fakeUserId();
    review.addComment("Check the trucking rate", authorId);
    await review.save();
    const refetched = await TenderReview.findOne({ tender: tenderId });
    expect(refetched!.comments).toHaveLength(1);
    expect(refetched!.comments[0].content).toBe("Check the trucking rate");
  });

  it("editComment updates content and sets editedAt", async () => {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    review.addComment("Original text", fakeUserId());
    await review.save();
    const saved = await TenderReview.findOne({ tender: tenderId });
    const commentId = saved!.comments[0]._id;
    saved!.editComment(commentId, "Updated text");
    await saved!.save();
    const refetched = await TenderReview.findOne({ tender: tenderId });
    expect(refetched!.comments[0].content).toBe("Updated text");
    expect(refetched!.comments[0].editedAt).toBeDefined();
  });

  it("deleteComment removes the comment", async () => {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId);
    review.addComment("To be deleted", fakeUserId());
    await review.save();
    const saved = await TenderReview.findOne({ tender: tenderId });
    const commentId = saved!.comments[0]._id;
    saved!.deleteComment(commentId);
    await saved!.save();
    const refetched = await TenderReview.findOne({ tender: tenderId });
    expect(refetched!.comments).toHaveLength(0);
  });
});
