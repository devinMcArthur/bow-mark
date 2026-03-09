import SchemaVersions from "@constants/SchemaVersions";
import { CrewClass, VehicleDocument } from "@models";
import { search_UpdateVehicle } from "@search";
import { post, prop, Ref } from "@typegoose/typegoose";
import { RateClass } from "@typescript/models";
import errorHandler from "@utils/errorHandler";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@post<VehicleDocument>("save", async (vehicle) => {
  try {
    await vehicle.requestReportUpdate();
  } catch (e) {
    errorHandler("Vehicle post save report error", e);
  }
  try {
    await search_UpdateVehicle(vehicle);
  } catch (e) {
    errorHandler("Vehicle post save ES error", e);
  }
})
export class VehicleSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, minlength: 2, trim: true })
  public name!: string;

  @Field({ nullable: false })
  @prop({ required: true, trim: true, default: "noCode" })
  public vehicleCode!: string;

  @Field({ nullable: false })
  @prop({ required: true, trim: true, default: "General" })
  public vehicleType!: string;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public rental!: boolean;

  @Field({ nullable: false })
  @prop({ required: true, trim: true, minlength: 1, default: "Bow Mark" })
  public sourceCompany!: string;

  @Field(() => [RateClass], { nullable: false })
  @prop({ type: () => [RateClass], default: [], required: true })
  public rates!: RateClass[];

  @Field()
  @prop({ required: true, default: SchemaVersions.Vehicle })
  public schemaVersion!: number;

  @Field(() => Date, { nullable: true })
  @prop({ required: false })
  public archivedAt?: Date;

  /**
   * @deprecated don't need bidirection link, crew already holds vehicle link
   */
  @Field(() => [CrewClass])
  @prop({ ref: () => CrewClass })
  public crews!: Ref<CrewClass>[];
}
