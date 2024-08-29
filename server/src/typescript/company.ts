import { CompanyDocument, JobsiteClass, MaterialClass } from "@models";
import { Ref, DocumentType } from "@typegoose/typegoose";
import { Field, Float, ObjectType } from "type-graphql";

export interface ICompanyCreate {
  name: string;
}

export interface ICompanySearchObject {
  score: number;
  company: CompanyDocument;
}

@ObjectType()
export class CompanyMaterialReportJobDay {
  @Field(() => Date)
  date!: Date;

  @Field(() => JobsiteClass)
  jobsite!: Ref<JobsiteClass>;

  @Field(() => Float)
  quantity!: number;
}

export type CompanyMaterialReportJobDayDocument =
  DocumentType<CompanyMaterialReportJobDay>;

@ObjectType()
export class CompanyMaterialReport {
  @Field(() => MaterialClass)
  material!: Ref<MaterialClass>;

  @Field(() => [CompanyMaterialReportJobDay])
  jobDays!: CompanyMaterialReportJobDay[];
}

export type CompanyMaterialReportDocument = DocumentType<CompanyMaterialReport>;
