import { CrewDocument } from "@models";
import { Id } from "@typescript/models";

const employee = async (crew: CrewDocument, employeeId: Id) => {
  const index = crew.employees.findIndex(
    (id) => employeeId.toString() === id?.toString()
  );

  if (index !== -1) {
    crew.employees.splice(index, 1);
  }

  return;
};

const vehicle = async (crew: CrewDocument, vehicleId: Id) => {
  const index = crew.vehicles.findIndex(
    (id) => vehicleId.toString() === id?.toString()
  );

  if (index !== -1) {
    crew.vehicles.splice(index, 1);
  }

  return;
};

export default {
  employee,
  vehicle,
};
