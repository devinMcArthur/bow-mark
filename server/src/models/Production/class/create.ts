import { ProductionDocument, ProductionModel } from "@models";
import { IProductionCreate } from "@typescript/production";

const document = async (
  Production: ProductionModel,
  data: IProductionCreate
): Promise<ProductionDocument> => {
  const production = new Production({
    jobTitle: data.jobTitle,
    quantity: data.quantity,
    unit: data.unit,
    startTime: data.startTime,
    endTime: data.endTime,
    description: data.description,
  });

  await data.dailyReport.addProduction(production);

  return production;
};

export default {
  document,
};
