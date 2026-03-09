import { CrewDocument, EmployeeDocument } from "@models";
import { IEmployeeUpdate } from "@typescript/employee";
import { IRatesData } from "@typescript/models";
import validateRates from "@validation/validateRates";

const document = async (employee: EmployeeDocument, data: IEmployeeUpdate) => {
  employee.name = data.name;

  employee.jobTitle = data.jobTitle;

  return;
};

const rates = async (employee: EmployeeDocument, data: IRatesData[]) => {
  await validateRates(data);

  employee.rates = data;

  return;
};

const archive = async (
  employee: EmployeeDocument
): Promise<{ crews: CrewDocument[] }> => {
  employee.archivedAt = new Date();

  const crews = await employee.getCrews();

  for (let i = 0; i < crews.length; i++) {
    await crews[i].removeEmployee(employee._id);
  }

  return { crews };
};

const unarchive = async (employee: EmployeeDocument): Promise<void> => {
  employee.archivedAt = undefined;
};

export default {
  document,
  rates,
  archive,
  unarchive,
};
