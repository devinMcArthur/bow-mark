import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class DomainEventPatchOpClass {
  @Field(() => String)
  @prop({ required: true, enum: ["add", "remove", "replace"] })
  public op!: "add" | "remove" | "replace";

  // JSON Patch (RFC 6902) path. Empty string is valid (refers to document
  // root), so we can't use Mongoose's `required: true` which treats "" as
  // missing. Default to "" so the field is always present on write.
  @Field()
  @prop({ type: String, default: "" })
  public path!: string;

  @Field(() => Object, { nullable: true })
  @prop({ type: () => Object, required: false })
  public value?: unknown;
}

@ObjectType()
export class DomainEventDiffClass {
  @Field(() => [DomainEventPatchOpClass])
  @prop({ type: () => [DomainEventPatchOpClass], required: true, default: [] })
  public forward!: DomainEventPatchOpClass[];

  @Field(() => [DomainEventPatchOpClass])
  @prop({ type: () => [DomainEventPatchOpClass], required: true, default: [] })
  public inverse!: DomainEventPatchOpClass[];
}

@ObjectType()
export class DomainEventRelatedEntityClass {
  @Field()
  @prop({ required: true })
  public entityType!: string;

  @Field(() => ID)
  @prop({ required: true })
  public entityId!: Types.ObjectId;

  @Field()
  @prop({ required: true })
  public role!: string;
}

@ObjectType()
export class DomainEventSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field()
  @prop({ required: true, index: true })
  public type!: string;

  @Field()
  @prop({ required: true, default: 1 })
  public schemaVersion!: number;

  @Field(() => String)
  @prop({ required: true, enum: ["user", "ai", "system"] })
  public actorKind!: "user" | "ai" | "system";

  @Field(() => ID, { nullable: true })
  @prop({ required: false })
  public actorId?: Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ required: false })
  public onBehalfOf?: Types.ObjectId;

  @Field()
  @prop({ required: true })
  public entityType!: string;

  @Field(() => ID)
  @prop({ required: true })
  public entityId!: Types.ObjectId;

  @Field(() => [DomainEventRelatedEntityClass], { nullable: true })
  @prop({ type: () => [DomainEventRelatedEntityClass], required: false, default: [] })
  public relatedEntities?: DomainEventRelatedEntityClass[];

  @Field()
  @prop({ required: true, default: () => new Date() })
  public at!: Date;

  @Field({ nullable: true })
  @prop({ required: false })
  public fromVersion?: number;

  @Field()
  @prop({ required: true })
  public toVersion!: number;

  @Field(() => DomainEventDiffClass)
  @prop({ type: () => DomainEventDiffClass, required: true })
  public diff!: DomainEventDiffClass;

  @Field({ nullable: true })
  @prop({ required: false })
  public requestId?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  public sessionId?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  public correlationId?: string;

  @Field(() => ID, { nullable: true })
  @prop({ required: false })
  public causedByEventId?: Types.ObjectId;

  @Field({ nullable: true })
  @prop({ required: false })
  public idempotencyKey?: string;

  @Field(() => Object, { nullable: true })
  @prop({ type: () => Object, required: false })
  public metadata?: Record<string, unknown>;
}
