import { TenderReview } from "@models";
import { TenderReviewClass } from "../../../models/TenderReview/class";
import { Id } from "@typescript/models";
import { TenderReviewStatus } from "@typescript/tenderReview";
import { Arg, Authorized, Ctx, ID, Mutation, Query, Resolver } from "type-graphql";
import { IContext } from "@typescript/graphql";

@Resolver(() => TenderReviewClass)
export default class TenderReviewResolver {
  @Authorized(["ADMIN", "PM"])
  @Query(() => TenderReviewClass)
  async tenderReview(@Arg("tenderId", () => ID) tenderId: Id) {
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderReviewClass)
  async tenderReviewSetStatus(
    @Arg("tenderId", () => ID) tenderId: Id,
    @Arg("status") status: string
  ) {
    const VALID: TenderReviewStatus[] = ["draft", "in_review", "approved"];
    if (!VALID.includes(status as TenderReviewStatus))
      throw new Error(`Invalid status "${status}". Must be one of: ${VALID.join(", ")}`);
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
    review.setStatus(status as TenderReviewStatus);
    await review.save();
    // Re-fetch with population
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderReviewClass)
  async tenderReviewAddComment(
    @Arg("tenderId", () => ID) tenderId: Id,
    @Arg("content") content: string,
    @Ctx() ctx: IContext
  ) {
    if (!ctx.user) throw new Error("Must be logged in");
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
    review.addComment(content, ctx.user._id.toString());
    await review.save();
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderReviewClass)
  async tenderReviewEditComment(
    @Arg("tenderId", () => ID) tenderId: Id,
    @Arg("commentId", () => ID) commentId: Id,
    @Arg("content") content: string
  ) {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
    review.editComment(commentId, content);
    await review.save();
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderReviewClass)
  async tenderReviewDeleteComment(
    @Arg("tenderId", () => ID) tenderId: Id,
    @Arg("commentId", () => ID) commentId: Id
  ) {
    const review = await (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
    review.deleteComment(commentId);
    await review.save();
    return (TenderReview as any).findOrCreateByTenderId(tenderId.toString());
  }
}
