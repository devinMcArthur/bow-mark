import { prop } from "@typegoose/typegoose";
import { FilterQuery, Types } from "mongoose";
import { Field, Float, ID, ObjectType, registerEnumType } from "type-graphql";

export interface GetByIDOptions {
  throwError?: boolean;
}

export interface IListOptions<Document> {
  offset?: number;
  pageLimit?: number;
  query?: FilterQuery<Document>;
  showArchived?: boolean;
  dateSort?: "asc" | "desc";
}

export interface ISearchOptions {
  limit?: number;
  blacklistedIds?: string[];
}

export type Id = string | Types.ObjectId;

@ObjectType()
export class RateClass {
  @Field(() => ID, { nullable: true })
  public _id?: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true })
  public date!: Date;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, min: 0 })
  public rate!: number;
}

export interface IRatesData {
  date: Date;
  rate: number;
}

@ObjectType()
export class DefaultRateClass {
  @Field(() => ID, { nullable: true })
  public _id?: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public title!: string;

  @Field(() => [RateClass], { nullable: false })
  @prop({
    type: () => [RateClass],
    required: true,
    default: [],
    validate: {
      validator: (val) => val.length > 0,
      message: "must have at least one rate",
    },
  })
  public rates!: RateClass[];
}

export interface IDefaultRateData {
  _id?: Id;
  title: string;
  rates: IRatesData[];
}

export enum UpdateStatus {
  Requested = "requested",
  Pending = "pending",
  Updated = "updated",
}

registerEnumType(UpdateStatus, {
  name: "UpdateStatus",
});

@ObjectType()
export class UpdateClass {
  @Field(() => ID, { nullable: true })
  public _id?: Types.ObjectId;

  @Field(() => UpdateStatus, { nullable: false })
  @prop({ required: true, enum: UpdateStatus })
  public status!: UpdateStatus;

  @Field({ nullable: true })
  @prop()
  public lastUpdatedAt?: Date;
}
