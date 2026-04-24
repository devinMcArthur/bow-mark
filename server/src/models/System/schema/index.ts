import { Types } from "mongoose";
import { prop, Ref } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import SchemaVersions from "@constants/SchemaVersions";
import { DefaultRateClass, RateClass } from "@typescript/models";
import { EnrichedFileClass } from "../../EnrichedFile/class";

@ObjectType()
export class SystemSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field(() => [String], { nullable: false })
  @prop({ type: () => [String], required: true, default: [] })
  public unitExtras!: string[];

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

  /**
   * @deprecated Replaced by FileNodes under `/system/specs`. No
   * GraphQL surface still reads this field — the SystemSpecLibrary
   * UI uses the unified file system via the `systemSpecsRoot` query
   * + FileBrowser. Stored data is preserved as a safety net; field
   * can be removed once a verification pass confirms every legacy
   * entry has a corresponding FileNode placement (see migrate-file-
   * system/04).
   */
  @Field(() => [EnrichedFileClass], { nullable: false })
  @prop({ ref: () => EnrichedFileClass, type: () => [Types.ObjectId], default: [] })
  public specFiles!: Ref<EnrichedFileClass>[];

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: SchemaVersions.System })
  public schemaVersion!: number;
}
