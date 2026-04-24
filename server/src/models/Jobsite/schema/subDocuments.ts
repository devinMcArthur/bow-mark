import { Types } from "mongoose";
import { DocumentType, prop, Ref } from "@typegoose/typegoose";
import { TruckingRateTypes } from "@typescript/jobsite";
import { DefaultRateClass, RateClass } from "@typescript/models";
import { Field, ID, ObjectType } from "type-graphql";
import { FileClass } from "@models";
import { EnrichedFileClass } from "../../EnrichedFile/class";
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

@ObjectType()
export class JobsiteContractClass {
  @Field(() => ID, { nullable: true })
  public _id?: Types.ObjectId;

  @Field()
  @prop({ required: true })
  public bidValue!: number;

  @Field()
  @prop({ required: true })
  public expectedProfit!: number;

  @Field()
  @prop({ required: true, default: 0 })
  public workOnHand!: number;
}

export type JobsiteFileObjectDocument = DocumentType<JobsiteFileObjectClass>;

/**
 * @deprecated Subdocument shape for the deprecated
 * `Jobsite.enrichedFiles[]` array. Both retire together once the
 * legacy data is no longer needed for verification.
 */
@ObjectType()
export class JobsiteEnrichedFileClass {
  @Field(() => ID, { nullable: true })
  public _id?: Types.ObjectId;

  @Field(() => EnrichedFileClass, { nullable: false })
  @prop({ ref: () => EnrichedFileClass, required: true })
  public enrichedFile!: Ref<EnrichedFileClass>;

  @Field(() => UserRoles, { nullable: false })
  @prop({
    enum: UserRoles,
    required: true,
    default: UserRoles.ProjectManager,
  })
  public minRole!: UserRoles;
}
