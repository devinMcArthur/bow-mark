import { Crew, CrewDocument } from "@models";
import { CrewTypes } from "@typescript/crew";
import { Id } from "@typescript/models";
import { Field, InputType } from "type-graphql";

@InputType()
export class CrewCreateData {
  @Field({ nullable: false })
  public name!: string;

  @Field(() => CrewTypes, { nullable: false })
  public type!: CrewTypes;
}

@InputType()
export class CrewUpdateData {
  @Field({ nullable: false })
  public name!: string;

  @Field(() => CrewTypes, { nullable: false })
  public type!: CrewTypes;
}

const create = async (data: CrewCreateData): Promise<CrewDocument> => {
  const crew = await Crew.createDocument(data);

  await crew.save();

  return crew;
};

const update = async (id: Id, data: CrewUpdateData): Promise<CrewDocument> => {
  const crew = await Crew.getById(id, { throwError: true });
  if (!crew) throw new Error("Unable to find crew");

  await crew.updateDocument(data);

  await crew.save();

  return crew;
};

const addEmployee = async (
  crewId: Id,
  employeeId: Id
): Promise<CrewDocument> => {
  const crew = await Crew.getById(crewId, { throwError: true });

  if (!crew) throw new Error("Unable to find crew");

  await crew.addEmployee(employeeId);

  await crew.save();

  return crew;
};

const addVehicle = async (crewId: Id, vehicleId: Id): Promise<CrewDocument> => {
  const crew = await Crew.getById(crewId, { throwError: true });

  if (!crew) throw new Error("Unable to find crew");

  await crew.addVehicle(vehicleId);

  await crew.save();

  return crew;
};

const removeEmployee = async (
  crewId: Id,
  employeeId: Id
): Promise<CrewDocument> => {
  const crew = await Crew.getById(crewId, { throwError: true });

  if (!crew) throw new Error("Unable to find crew");

  await crew.removeEmployee(employeeId);

  await crew.save();

  return crew;
};

const removeVehicle = async (
  crewId: Id,
  vehicleId: Id
): Promise<CrewDocument> => {
  const crew = await Crew.getById(crewId, { throwError: true });

  if (!crew) throw new Error("Unable to find crew");

  await crew.removeVehicle(vehicleId);

  await crew.save();

  return crew;
};

const archive = async (id: Id) => {
  const crew = await Crew.getById(id);
  if (!crew) throw new Error("Unable to find crew");

  await crew.archive();

  await crew.save();

  return crew;
};

export default {
  create,
  update,
  addEmployee,
  addVehicle,
  removeEmployee,
  removeVehicle,
  archive,
};
