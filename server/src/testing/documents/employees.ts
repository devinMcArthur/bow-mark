import { Employee, EmployeeDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededEmployees {
  base_foreman_1: EmployeeDocument;
  base_foreman_2: EmployeeDocument;
  base_operator_1: EmployeeDocument;
  base_laborer_1: EmployeeDocument;
  base_laborer_2: EmployeeDocument;
  base_laborer_3: EmployeeDocument;
  temp_1: EmployeeDocument;
  temp_2: EmployeeDocument;
  office_admin: EmployeeDocument;
  pm_employee: EmployeeDocument;
}

const createEmployees = async (): Promise<SeededEmployees> => {
  const base_foreman_1 = new Employee({
    _id: _ids.employees.base_foreman_1._id,
    name: "Base Foreman 1",
    jobTitle: "Foreman",
    crews: [_ids.crews.base_1._id],
    rates: [
      {
        date: new Date("2022-01-01"),
        rate: 25,
      },
      {
        date: new Date("2021-01-01"),
        rate: 20,
      },
    ],
  });

  const base_foreman_2 = new Employee({
    _id: _ids.employees.base_foreman_2._id,
    name: "Base Foreman 2",
    jobTitle: "Foreman",
    crews: [_ids.crews.base_2._id],
    rates: [
      {
        date: new Date("2022-01-01"),
        rate: 26,
      },
    ],
  });

  const base_operator_1 = new Employee({
    _id: _ids.employees.base_operator_1._id,
    name: "Base Operator 1",
    jobTitle: "Operator",
    crews: [_ids.crews.base_1._id],
    rates: [
      {
        date: new Date("2022-01-01"),
        rate: 28,
      },
    ],
  });

  const base_laborer_1 = new Employee({
    _id: _ids.employees.base_laborer_1._id,
    name: "Base Laborer 1",
    jobTitle: "Laborer",
    crews: [_ids.crews.base_1._id],
    rates: [
      {
        date: new Date("2022-01-01"),
        rate: 22,
      },
    ],
  });

  const base_laborer_2 = new Employee({
    _id: _ids.employees.base_laborer_2._id,
    name: "Base Laborer 2",
    jobTitle: "Laborer",
    crews: [_ids.crews.base_1._id],
    rates: [
      {
        date: new Date("2022-01-01"),
        rate: 22,
      },
    ],
  });

  const base_laborer_3 = new Employee({
    _id: _ids.employees.base_laborer_3._id,
    name: "Base Laborer 3",
    jobTitle: "Laborer",
    crews: [_ids.crews.base_1._id],
    rates: [
      {
        date: new Date("2022-01-01"),
        rate: 22,
      },
    ],
  });

  const temp_1 = new Employee({
    _id: _ids.employees.temp_1._id,
    name: "Temporary Employee 1",
    jobTitle: "Laborer",
  });

  const temp_2 = new Employee({
    _id: _ids.employees.temp_2._id,
    name: "Temporary Employee 2",
    jobTitle: "Laborer",
  });

  const office_admin = new Employee({
    _id: _ids.employees.office_admin._id,
    name: "Office Employee",
    jobTitle: "Admin",
  });

  const pm_employee = new Employee({
    _id: _ids.employees.pm_employee._id,
    name: "PM Employee",
    jobTitle: "Project Manager",
    rates: [
      {
        date: new Date("2022-01-01"),
        rate: 35,
      },
    ],
  });

  const employees = {
    base_foreman_1,
    base_foreman_2,
    base_operator_1,
    base_laborer_1,
    base_laborer_2,
    base_laborer_3,
    temp_1,
    temp_2,
    office_admin,
    pm_employee,
  };

  for (let i = 0; i < Object.values(employees).length; i++) {
    await Object.values(employees)[i].save();
  }

  return employees;
};

export default createEmployees;
