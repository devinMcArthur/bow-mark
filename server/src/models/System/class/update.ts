import { SystemDocument } from "@models";
import { IDefaultRateData, IRatesData } from "@typescript/models";
import validateRates from "@validation/validateRates";

const unitDefaults = async (
  system: SystemDocument,
  units: string[]
): Promise<SystemDocument> => {
  system.unitDefaults = units;

  return system;
};

const laborTypes = async (system: SystemDocument, types: string[]) => {
  system.laborTypes = types;

  return;
};

const companyVehicleTypeDefaults = async (
  system: SystemDocument,
  data: IDefaultRateData[]
): Promise<SystemDocument> => {
  system.companyVehicleTypeDefaults = data;

  return system;
};

const materialShipmentVehicleTypeDefaults = async (
  system: SystemDocument,
  data: IDefaultRateData[]
): Promise<SystemDocument> => {
  system.materialShipmentVehicleTypeDefaults = data;

  return system;
};

const internalExpenseOverheadRate = async (
  system: SystemDocument,
  rates: IRatesData[]
) => {
  await validateRates(rates);

  system.internalExpenseOverheadRate = rates;
};

export default {
  unitDefaults,
  laborTypes,
  companyVehicleTypeDefaults,
  materialShipmentVehicleTypeDefaults,
  internalExpenseOverheadRate,
};
