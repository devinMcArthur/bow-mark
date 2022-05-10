import { Production, ProductionDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededProduction {
  jobsite_1_base_1_1_production_1: ProductionDocument;
}

const createProductions = async (): Promise<SeededProduction> => {
  const jobsite_1_base_1_1_production_1 = new Production({
    _id: _ids.productions.jobsite_1_base_1_1_production_1._id,
    jobTitle: "Base Prep",
    quantity: 150,
    unit: "m2",
    startTime: new Date("2022-02-23 9:00 AM"),
    endTime: new Date("2022-02-23 2:00 PM"),
    description: "This is the description",
  });

  const production = {
    jobsite_1_base_1_1_production_1,
  };

  for (let i = 0; i < Object.values(production).length; i++) {
    await Object.values(production)[i].save();
  }

  return production;
};

export default createProductions;
