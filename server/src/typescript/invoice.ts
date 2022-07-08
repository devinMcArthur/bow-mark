import { Types } from "mongoose";
import { CompanyDocument, InvoiceClass } from "@models";
import { Field, Float, ID, ObjectType } from "type-graphql";
import { DocumentType, prop, Ref } from "@typegoose/typegoose";

export interface IInvoiceCreate {
  company: CompanyDocument;
  invoiceNumber: string;
  cost: number;
  date: Date;
  description?: string;
  internal: boolean;
  accrual: boolean;
}

export interface IInvoiceUpdate {
  company: CompanyDocument;
  invoiceNumber: string;
  cost: number;
  date: Date;
  description?: string;
  internal: boolean;
  accrual: boolean;
}

@ObjectType()
export class InvoiceReportClass {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => InvoiceClass, { nullable: false })
  @prop({ ref: () => InvoiceClass, required: true })
  public invoice!: Ref<InvoiceClass>;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public value!: number;

  @Field(() => Boolean, { nullable: false })
  @prop({ required: true })
  public internal!: boolean;

  @Field(() => Boolean, { nullable: false })
  @prop({ required: true, default: false })
  public accrual!: boolean;
}

export type InvoiceReportDocument = DocumentType<InvoiceReportClass>;
