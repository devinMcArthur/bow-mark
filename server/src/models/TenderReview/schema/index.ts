import { TenderReviewStatus, TenderAuditAction } from "@typescript/tenderReview";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { UserClass } from "../../User/class";

@ObjectType()
export class TenderAuditEventClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => ID)
  @prop({ required: true })
  public rowId!: Types.ObjectId;

  // Not marked required because mongoose treats "" as a missing value under
  // `required: true`, and rows can legitimately be created with an empty
  // description (the user fills it in after). Audit entries for descriptionless
  // rows simply store an empty string — it's metadata, not a hard constraint.
  @Field()
  @prop({ default: "" })
  public rowDescription!: string;

  @Field(() => String)
  @prop({ required: true })
  public action!: TenderAuditAction;

  @Field(() => [String])
  @prop({ type: () => [String], default: [] })
  public changedFields!: string[];

  @Field(() => UserClass, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public changedBy?: Ref<UserClass>;

  @Field()
  @prop({ required: true })
  public changedAt!: Date;

  @Field(() => String, { nullable: true })
  @prop({ trim: true })
  public statusTo?: string;
}

@ObjectType()
export class TenderReviewCommentClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field()
  @prop({ required: true })
  public content!: string;

  @Field(() => UserClass, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public author?: Ref<UserClass>;

  @Field()
  @prop({ required: true })
  public createdAt!: Date;

  @Field({ nullable: true })
  @prop()
  public editedAt?: Date;
}

@ObjectType()
export class TenderReviewSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  // Not exposed as a GQL field — queried via tenderReview(tenderId)
  @prop({ required: true, unique: true })
  public tender!: Types.ObjectId;

  @Field(() => String)
  @prop({ required: true, default: "draft" })
  public status!: TenderReviewStatus;

  @Field(() => [TenderAuditEventClass])
  @prop({ type: () => [TenderAuditEventClass], default: [] })
  public auditLog!: TenderAuditEventClass[];

  @Field(() => [TenderReviewCommentClass])
  @prop({ type: () => [TenderReviewCommentClass], default: [] })
  public comments!: TenderReviewCommentClass[];

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
