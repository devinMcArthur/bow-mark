import { Employee, EmployeeWorkDocument, EmployeeWorkModel } from "@models";
import { IEmployeeWorkCreate } from "@typescript/employeeWork";
import { Id } from "@typescript/models";
import isEmpty from "@utils/isEmpty";

const document = async (
  EmployeeWork: EmployeeWorkModel,
  data: IEmployeeWorkCreate
): Promise<EmployeeWorkDocument> => {
  // validate employee
  const employee = await Employee.getById(data.employeeId);
  if (!employee)
    throw new Error("EmployeeWork.createDocument: unable to find employee");

  if (isEmpty(data.jobTitle)) {
    throw new Error(
      "EmployeeWork.createDocument: must provide a valid job title"
    );
  }

  const employeeWork = new EmployeeWork({
    jobTitle: data.jobTitle,
    startTime: data.startTime,
    endTime: data.endTime,
    employee: data.employeeId,
  });

  await employeeWork.validateDocument();

  await data.dailyReport.addEmployeeWork(employeeWork);

  return employeeWork;
};

const perEmployee = async (
  EmployeeWork: EmployeeWorkModel,
  data: Omit<IEmployeeWorkCreate, "employeeId">,
  employees: Id[]
): Promise<EmployeeWorkDocument[]> => {
  const employeeWorks: EmployeeWorkDocument[] = [];

  if (employees.length === 0)
    throw new Error(
      "EmployeeWork.createPerEmployee: must provide an employees array"
    );

  for (let i = 0; i < employees.length; i++) {
    employeeWorks.push(
      await EmployeeWork.createDocument({
        ...data,
        employeeId: employees[i],
      })
    );
  }

  return employeeWorks;
};

export default {
  document,
  perEmployee,
};
