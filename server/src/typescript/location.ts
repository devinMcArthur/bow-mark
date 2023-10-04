import { prop } from "@typegoose/typegoose";
import { Field, Float, ID, ObjectType } from "type-graphql";
import { Id } from "./models";

@ObjectType()
export class LocationClass {
  @Field(() => ID, { nullable: true })
  public _id?: Id;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public latitude!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public longitude!: number;
}

export interface ILocationData {
  latitude: number;
  longitude: number;
}
