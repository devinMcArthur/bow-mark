import { RatesData } from "@graphql/types/mutation";
import { Crew, CrewDocument, Employee, EmployeeDocument } from "@models";
import { Id } from "@typescript/models";
import { Field, InputType } from "type-graphql";

@InputType()
export class EmployeeCreateData {
  @Field({ nullable: false })
  public name!: string;

  @Field({ nullable: false })
  public jobTitle!: string;
}

@InputType()
export class EmployeeUpdateData {
  @Field({ nullable: false })
  public name!: string;

  @Field({ nullable: false })
  public jobTitle!: string;
}

const create = async (
  data: EmployeeCreateData,
  crewId?: Id
): Promise<EmployeeDocument> => {
  const employee = await Employee.createDocument(data);

  let crew: CrewDocument | null = null;
  if (crewId) {
    crew = await Crew.getById(crewId, { throwError: true });

    if (!crew) throw new Error("Unable to find crew");

    await crew.addEmployee(employee._id);
  }

  await employee.save();

  if (crew) crew.save();

  return employee;
};

const update = async (
  id: Id,
  data: EmployeeUpdateData
): Promise<EmployeeDocument> => {
  const employee = await Employee.getById(id, { throwError: true });
  if (!employee) throw new Error("Unable to find employee");

  await employee.updateDocument(data);

  await employee.save();

  return employee;
};

const updateRates = async (
  id: string,
  data: RatesData[]
): Promise<EmployeeDocument> => {
  const employee = await Employee.getById(id, { throwError: true });
  if (!employee) throw new Error("Unable to find employee");

  await employee.updateRates(data);

  await employee.save();

  return employee;
};

const archive = async (id: Id) => {
  const employee = await Employee.getById(id);
  if (!employee) throw new Error("Unable to find employee");

  const { crews } = await employee.archive();

  await employee.save();

  for (let i = 0; i < crews.length; i++) {
    crews[i].save();
  }

  return employee;
};

const unarchive = async (id: Id) => {
  const employee = await Employee.getById(id);
  if (!employee) throw new Error("Unable to find vehicle");

  await employee.unarchive();
  await employee.save();

  return employee;
};

export default {
  create,
  update,
  updateRates,
  archive,
  unarchive,
};
