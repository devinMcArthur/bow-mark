import { EmployeeDocument, EmployeeModel } from "@models";
import { IEmployeeCreate } from "@typescript/employee";

const document = async (
  Employee: EmployeeModel,
  data: IEmployeeCreate
): Promise<EmployeeDocument> => {
  const sameName = await Employee.getByName(data.name);
  if (sameName)
    throw new Error(
      "Employee.createDocument: employee already exists with this name"
    );

  const employee = new Employee({
    ...data,
  });

  return employee;
};

export default {
  document,
};
