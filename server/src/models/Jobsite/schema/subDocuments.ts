import { prop } from "@typegoose/typegoose";
import { TruckingRateTypes } from "@typescript/jobsite";
import { DefaultRateClass, RateClass } from "@typescript/models";
import { Field, Float, ObjectType } from "type-graphql";

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
export class LocationClass {
  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public latitude!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public longitude!: number;
}
