import { ProductionDocument } from "@models";

const fullDelete = async (production: ProductionDocument) => {
  const dailyReport = await production.getDailyReport();

  if (dailyReport) {
    await dailyReport.removeProduction(production);

    await dailyReport.save();
  }

  await production.remove();

  return;
};

export default {
  fullDelete,
};
