import { Types } from "mongoose";
import { prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import SchemaVersions from "@constants/SchemaVersions";
import { DefaultRateClass, RateClass } from "@typescript/models";
import { EnrichedFileClass } from "../../Tender/schema";

@ObjectType()
export class SystemSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field(() => [String], { nullable: false })
  @prop({ type: () => [String], required: true, default: [] })
  public unitDefaults!: string[];

  @Field(() => [String], { nullable: false })
  @prop({ type: () => [String], required: true, default: [] })
  public laborTypes!: string[];

  @Field(() => [String], { nullable: false })
  @prop({ type: () => [String], required: true, default: [] })
  public fluidTypes!: string[];

  @Field(() => [DefaultRateClass], { nullable: false })
  @prop({ type: () => [DefaultRateClass], required: true, default: [] })
  public companyVehicleTypeDefaults!: DefaultRateClass[];

  @Field(() => [DefaultRateClass], { nullable: false })
  @prop({ type: () => [DefaultRateClass], required: true, default: [] })
  public materialShipmentVehicleTypeDefaults!: DefaultRateClass[];

  @Field(() => [RateClass], {
    nullable: false,
    description:
      "Percent overhead to be added to internal expenses when calculating total expenses",
  })
  @prop({
    type: [RateClass],
    required: true,
    validate: {
      validator: (val) => val.length > 0,
      message: "must have at least one rate",
    },
  })
  public internalExpenseOverheadRate!: RateClass[];

  @Field({ nullable: false })
  @prop({ required: true, default: "America/Edmonton" })
  public timezone!: string;

  @Field(() => [EnrichedFileClass], { nullable: false })
  @prop({ type: () => [EnrichedFileClass], default: [] })
  public specFiles!: EnrichedFileClass[];

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: SchemaVersions.System })
  public schemaVersion!: number;
}
