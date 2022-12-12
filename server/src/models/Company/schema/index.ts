import SchemaVersions from "@constants/SchemaVersions";
import { ES_updateCompany } from "@elasticsearch/helpers/company";
import { CompanyDocument } from "@models";
import { post, prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@post<CompanyDocument>("save", async (company) => {
  await ES_updateCompany(company);
})
export class CompanySchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, immutable: true, trim: true, unique: true })
  public name!: string;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public isBowMarkPaving!: boolean;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public isBowMarkConcrete!: boolean;

  @Field()
  @prop({ required: true, default: SchemaVersions.Company })
  public schemaVersion!: number;

  @Field(() => Date)
  @prop({ required: false })
  public archivedAt!: Date;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;
}
