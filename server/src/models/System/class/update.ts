import { SystemDocument } from "@models";
import { IDefaultRateData, IRatesData } from "@typescript/models";
import validateRates from "@validation/validateRates";

const unitExtras = async (
  system: SystemDocument,
  units: string[]
): Promise<SystemDocument> => {
  system.unitExtras = units;

  return system;
};

const laborTypes = async (system: SystemDocument, types: string[]) => {
  system.laborTypes = types;

  return;
};

const fluidTypes = async (system: SystemDocument, types: string[]) => {
  system.fluidTypes = types;

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
  unitExtras,
  laborTypes,
  fluidTypes,
  companyVehicleTypeDefaults,
  materialShipmentVehicleTypeDefaults,
  internalExpenseOverheadRate,
};
