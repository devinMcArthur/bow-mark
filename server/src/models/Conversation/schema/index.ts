import { JobsiteClass } from "../../Jobsite/class";
import { TenderClass } from "../../Tender/class";
import { UserClass } from "../../User/class";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class ConversationToolResultClass {
  @Field()
  @prop({ required: true })
  public toolName!: string;

  @Field()
  @prop({ required: true })
  public result!: string;
}

@ObjectType()
export class ConversationMessageClass {
  @Field()
  @prop({ required: true, enum: ["user", "assistant"] })
  public role!: "user" | "assistant";

  @Field()
  @prop({ required: true })
  public content!: string;

  @Field({ nullable: true })
  @prop()
  public model?: string;

  @Field({ nullable: true })
  @prop()
  public inputTokens?: number;

  @Field({ nullable: true })
  @prop()
  public outputTokens?: number;

  @Field(() => [ConversationToolResultClass], { nullable: true })
  @prop({ type: () => [ConversationToolResultClass], default: undefined })
  public toolResults?: ConversationToolResultClass[];
}

@ObjectType()
export class ConversationSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => UserClass)
  @prop({ ref: () => UserClass, required: true, index: true })
  public user!: Ref<UserClass>;

  @Field(() => TenderClass, { nullable: true })
  @prop({ ref: () => TenderClass, index: true })
  public tenderId?: Ref<TenderClass>;

  @Field(() => JobsiteClass, { nullable: true })
  @prop({ ref: () => JobsiteClass, index: true })
  public jobsiteId?: Ref<JobsiteClass>;

  @Field()
  @prop({ required: true, default: "New conversation" })
  public title!: string;

  @Field()
  @prop({ required: true })
  public aiModel!: string;

  @Field(() => [ConversationMessageClass])
  @prop({ type: () => [ConversationMessageClass], default: [] })
  public messages!: ConversationMessageClass[];

  @Field()
  @prop({ required: true, default: 0 })
  public totalInputTokens!: number;

  @Field()
  @prop({ required: true, default: 0 })
  public totalOutputTokens!: number;

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
