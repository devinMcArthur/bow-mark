import {
  DailyReport,
  DailyReportDocument,
  ProductionDocument,
  ProductionModel,
} from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import populateOptions from "@utils/populateOptions";

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  Production: ProductionModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<ProductionDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const production = await Production.findById(id);

  if (!production && options.throwError) {
    throw new Error("Production.getById: unable to find production");
  }

  return production;
};

const dailyReport = async (
  production: ProductionDocument
): Promise<DailyReportDocument | null> => {
  const dailyReport = await DailyReport.findOne({
    production: production._id,
  });

  return dailyReport;
};

export default {
  byId,
  dailyReport,
};
