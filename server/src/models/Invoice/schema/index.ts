import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { CompanyClass } from "@models";
import SchemaVersions from "@constants/SchemaVersions";

@ObjectType()
export class InvoiceSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field(() => CompanyClass, { nullable: false })
  @prop({ ref: () => CompanyClass, required: true })
  public company!: Ref<CompanyClass>;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public invoiceNumber!: string;

  @Field({ nullable: false })
  @prop({ required: true })
  public cost!: number;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public internal!: boolean;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public accrual!: boolean;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public date!: Date;

  @Field()
  @prop({ required: true, default: SchemaVersions.Invoice })
  public schemaVersion!: number;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;
}
