import { CompanyModel } from "@models";

const companies = async (Company: CompanyModel) => {
  const paving = await Company.findOne({ isBowMarkPaving: true });
  if (!paving) {
    const bowMarkPaving = new Company({
      name: "Bow Mark Paving",
      isBowMarkPaving: true,
    });

    await bowMarkPaving.save();
  }

  const concrete = await Company.findOne({ isBowMarkConcrete: true });
  if (!concrete) {
    const bowMarkConcrete = new Company({
      name: "Bow Mark Concrete",
      isBowMarkConcrete: true,
    });

    await bowMarkConcrete.save();
  }

  return;
};

export default {
  companies,
};
