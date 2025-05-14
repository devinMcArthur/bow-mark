import { CrewDocument } from "@models";
import { ICrewUpdate } from "@typescript/crew";
import { Id } from "@typescript/models";
import isEmpty from "@utils/isEmpty";

const document = async (crew: CrewDocument, data: ICrewUpdate) => {
  if (!isEmpty(data.name)) crew.name = data.name;
  if (!isEmpty(data.type)) crew.type = data.type;

  return;
};

const addEmployee = async (crew: CrewDocument, employeeId: Id) => {
  const existingIndex = crew.employees.findIndex(
    (id) => id?.toString() === employeeId.toString()
  );

  if (existingIndex === -1) {
    crew.employees.push(employeeId);
  }

  return;
};

const addVehicle = async (crew: CrewDocument, vehicleId: Id) => {
  const existingIndex = crew.vehicles.findIndex(
    (id) => id?.toString() === vehicleId.toString()
  );

  if (existingIndex === -1) {
    crew.vehicles.push(vehicleId);
  }

  return;
};

const archive = async (crew: CrewDocument) => {
  crew.archivedAt = new Date();

  return;
};

export default {
  document,
  addEmployee,
  addVehicle,
  archive,
};
