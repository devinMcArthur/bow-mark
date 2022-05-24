import { Types } from "mongoose";
import { DocumentType, prop, Ref } from "@typegoose/typegoose";
import { TruckingRateTypes } from "@typescript/jobsite";
import { DefaultRateClass, RateClass } from "@typescript/models";
import { Field, ID, ObjectType } from "type-graphql";
import { FileClass } from "@models";
import { UserRoles } from "@typescript/user";

@ObjectType()
export class TruckingRateClass extends RateClass {
  @Field(() => TruckingRateTypes, { nullable: false })
  @prop({
    enum: TruckingRateTypes,
    required: true,
    default: TruckingRateTypes.Hour,
  })
  public type!: TruckingRateTypes;
}

@ObjectType()
export class TruckingTypeRateClass extends DefaultRateClass {
  @Field(() => [TruckingRateClass], { nullable: false })
  @prop({
    type: () => [TruckingRateClass],
    required: true,
    default: [],
    validate: {
      validator: (val) => val.length > 0,
      message: "must have at least one rate",
    },
  })
  public rates!: TruckingRateClass[];
}

@ObjectType()
export class JobsiteFileObjectClass {
  @Field(() => ID, { nullable: true })
  public _id?: Types.ObjectId;

  @Field(() => FileClass, { nullable: false })
  @prop({ ref: () => FileClass, required: true })
  public file!: Ref<FileClass>;

  @Field(() => UserRoles, { nullable: false })
  @prop({
    enum: UserRoles,
    required: true,
    default: UserRoles.User,
  })
  public minRole!: UserRoles;
}

export type JobsiteFileObjectDocument = DocumentType<JobsiteFileObjectClass>;
