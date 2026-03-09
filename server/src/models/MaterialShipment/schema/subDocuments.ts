import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class VehicleObjectClass {
  @Field({ nullable: true })
  @prop({ trim: true })
  public source!: string;

  @Field({ nullable: true })
  @prop({ trim: true, default: "Truck" })
  public vehicleType?: string;

  @Field(() => ID, { nullable: true })
  @prop({ type: Types.ObjectId, required: false })
  public truckingRateId?: Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ type: Types.ObjectId, required: false })
  public deliveredRateId?: Types.ObjectId;

  @Field({ nullable: true })
  @prop({ trim: true })
  public vehicleCode?: string;
}
