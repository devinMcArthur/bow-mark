import { Company, CompanyDocument } from "@models";
import { Id } from "@typescript/models";
import { Field, InputType } from "type-graphql";

@InputType()
export class CompanyCreateData {
  @Field({ nullable: false })
  public name!: string;
}

const create = async (data: CompanyCreateData): Promise<CompanyDocument> => {
  const company = await Company.createDocument(data);

  await company.save();

  return company;
};

const archive = async (id: Id): Promise<CompanyDocument> => {
  const company = await Company.getById(id);
  if (!company) throw new Error("Unable to find company");

  await company.archive();

  await company.save();

  return company;
};

export default {
  create,
  archive,
};
