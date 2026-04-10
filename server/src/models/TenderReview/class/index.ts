import { ObjectType } from "type-graphql";
import { TenderReviewDocument, TenderReviewModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";
import { TenderReviewStatus, ITenderAuditEventCreate } from "@typescript/tenderReview";
import { TenderReviewSchema } from "../schema";
import get from "./get";
import create from "./create";
import update from "./update";

@ObjectType()
export class TenderReviewClass extends TenderReviewSchema {
  public static async getById(
    this: TenderReviewModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByTenderId(
    this: TenderReviewModel,
    tenderId: Id
  ) {
    return get.byTenderId(this, tenderId);
  }

  public static async createDocument(
    this: TenderReviewModel,
    tenderId: string
  ) {
    return create.document(this, tenderId);
  }

  public static async findOrCreateByTenderId(
    this: TenderReviewModel,
    tenderId: string
  ): Promise<TenderReviewDocument> {
    let review = await get.byTenderId(this, tenderId);
    if (!review) {
      try {
        const doc = await create.document(this, tenderId);
        await (doc as TenderReviewDocument).save();
      } catch (err: any) {
        // Ignore duplicate key — concurrent create won
        if (err?.code !== 11000) throw err;
      }
      review = (await get.byTenderId(this, tenderId))!;
    }
    return review as TenderReviewDocument;
  }

  public static async addAuditEvent(
    this: TenderReviewModel,
    tenderId: string,
    event: ITenderAuditEventCreate
  ) {
    // Use lean find-or-create without population for mutation speed
    let review = await this.findOne({ tender: tenderId });
    if (!review) {
      try {
        const doc = await create.document(this, tenderId);
        update.addAuditEvent(doc as TenderReviewDocument, event);
        await (doc as TenderReviewDocument).save();
        return;
      } catch (err: any) {
        // Duplicate key — concurrent create won, fall through to find + push
        if (err?.code !== 11000) throw err;
        review = await this.findOne({ tender: tenderId });
      }
    }
    update.addAuditEvent(review as TenderReviewDocument, event);
    await (review as TenderReviewDocument).save();
  }

  public setStatus(
    this: TenderReviewDocument,
    status: TenderReviewStatus
  ) {
    return update.setStatus(this, status);
  }

  public addComment(
    this: TenderReviewDocument,
    content: string,
    authorId: string
  ) {
    return update.addComment(this, content, authorId);
  }

  public editComment(
    this: TenderReviewDocument,
    commentId: Id,
    content: string
  ) {
    return update.editComment(this, commentId, content);
  }

  public deleteComment(
    this: TenderReviewDocument,
    commentId: Id
  ) {
    return update.deleteComment(this, commentId);
  }
}
