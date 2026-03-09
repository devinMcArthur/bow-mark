import { CompanyDocument, CompanyModel } from "@models";
import { ICompanyCreate } from "@typescript/company";

const document = async (
  Company: CompanyModel,
  data: ICompanyCreate
): Promise<CompanyDocument> => {
  const existingCompany = await Company.getByName(data.name);
  if (existingCompany) throw new Error("This company already exists");

  const company = new Company({
    ...data,
  });

  return company;
};

export default {
  document,
};
