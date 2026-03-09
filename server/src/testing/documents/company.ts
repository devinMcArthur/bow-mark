import { Company, CompanyDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededCompanies {
  company_1: CompanyDocument;
}

const createCompanies = async (): Promise<SeededCompanies> => {
  const company_1 = new Company({
    _id: _ids.companies.company_1._id,
    name: "Supplier Company 1",
  });

  const companies = {
    company_1,
  };

  for (let i = 0; i < Object.values(companies).length; i++) {
    await Object.values(companies)[i].save();
  }

  return companies;
};

export default createCompanies;
