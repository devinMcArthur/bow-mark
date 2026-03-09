import { DefaultRateData, RatesData } from "@graphql/types/mutation";
import { System, SystemDocument } from "@models";

const unitDefaults = async (data: string[]): Promise<SystemDocument> => {
  const system = await System.getSystem();

  await system.updateUnitDefaults(data);

  await system.save();

  return system;
};

const laborTypes = async (data: string[]): Promise<SystemDocument> => {
  const system = await System.getSystem();

  await system.updateLaborTypes(data);

  await system.save();

  return system;
};

const fluidTypes = async (data: string[]): Promise<SystemDocument> => {
  const system = await System.getSystem();

  await system.updateFluidTypes(data);

  await system.save();

  return system;
};

const companyVehicleTypeDefaults = async (
  data: DefaultRateData[]
): Promise<SystemDocument> => {
  const system = await System.getSystem();

  await system.updateCompanyVehicleTypeDefaults(data);

  await system.save();

  return system;
};

const materialShipmentVehicleTypeDefaults = async (
  data: DefaultRateData[]
): Promise<SystemDocument> => {
  const system = await System.getSystem();

  await system.updateMaterialShipmentVehicleTypeDefaults(data);

  await system.save();

  return system;
};

const internalExpenseOverheadRate = async (
  rates: RatesData[]
): Promise<SystemDocument> => {
  const system = await System.getSystem();

  await system.updateInternalExpenseOverheadRate(rates);

  await system.save();

  return system;
};

export default {
  unitDefaults,
  laborTypes,
  fluidTypes,
  companyVehicleTypeDefaults,
  materialShipmentVehicleTypeDefaults,
  internalExpenseOverheadRate,
};
