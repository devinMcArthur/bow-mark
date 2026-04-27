import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

export type AgentScope = "read" | "readwrite";

@ObjectType()
export class AgentApiKeySchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, minlength: 1, trim: true })
  public name!: string;

  // The 8-char prefix is half of the API key — not secret on its own,
  // exposed so operators can visually match the row to the raw key they
  // copied at mint time.
  @Field({ nullable: false })
  @prop({ required: true, index: true, unique: true })
  public keyPrefix!: string;

  // Deliberately NOT a @Field — bcrypt hash should never traverse the
  // GraphQL boundary.
  @prop({ required: true })
  public keyHash!: string;

  @Field({ nullable: false })
  @prop({ required: true, enum: ["read", "readwrite"] as const })
  public scope!: AgentScope;

  @Field(() => Date, { nullable: true })
  @prop({ default: null })
  public lastUsedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  @prop({ default: null })
  public revokedAt?: Date | null;
}
