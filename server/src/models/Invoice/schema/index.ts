import { post, prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { CompanyClass, InvoiceDocument } from "@models";
import { DocumentSchema } from "../../Document/schema";
import SchemaVersions from "@constants/SchemaVersions";
import errorHandler from "@utils/errorHandler";
import { publishInvoiceChange } from "../../../rabbitmq/publisher";

@ObjectType()
@post<InvoiceDocument>("save", async (invoice) => {
  // Publish to RabbitMQ for PostgreSQL sync
  try {
    await publishInvoiceChange("updated", invoice._id.toString());
  } catch (e) {
    errorHandler("Invoice RabbitMQ publish error", e);
  }
})
@post<InvoiceDocument>("remove", async (invoice) => {
  // Publish deletion to RabbitMQ
  try {
    await publishInvoiceChange("deleted", invoice._id.toString());
  } catch (e) {
    errorHandler("Invoice RabbitMQ publish error", e);
  }
})
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

  /**
   * Reference to the Document record holding the uploaded invoice file
   * (PDF / image). Optional — legacy invoices carry nothing here, and
   * new invoices may still be created without a file attached. The
   * linked FileNode placement lives under `/jobsites/<id>/Invoices/
   * {Subcontractor|Revenue}/` so it's both browsable in the file tree
   * and AI-enriched through the standard pipeline.
   */
  @Field(() => ID, { nullable: true })
  @prop({ ref: () => DocumentSchema })
  public documentId?: Ref<DocumentSchema>;

  @Field()
  @prop({ required: true, default: SchemaVersions.Invoice })
  public schemaVersion!: number;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;
}
