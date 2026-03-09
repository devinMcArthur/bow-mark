import { RatesData } from "@graphql/types/mutation";
import { Crew, CrewDocument, Vehicle, VehicleDocument } from "@models";
import { Id } from "@typescript/models";
import { Field, InputType } from "type-graphql";

@InputType()
export class VehicleCreateData {
  @Field({ nullable: false })
  public name!: string;

  @Field({ nullable: false })
  public vehicleCode!: string;

  @Field({ nullable: false })
  public vehicleType!: string;

  @Field({ nullable: true })
  public rental?: boolean;

  @Field({ nullable: true })
  public sourceCompany?: string;
}

@InputType()
export class VehicleUpdateData {
  @Field({ nullable: false })
  public name!: string;

  @Field({ nullable: false })
  public vehicleType!: string;

  @Field({ nullable: false })
  public vehicleCode!: string;
}

const create = async (
  data: VehicleCreateData,
  crewId?: Id
): Promise<VehicleDocument> => {
  const vehicle = await Vehicle.createDocument(data);

  let crew: CrewDocument | null = null;
  if (crewId) {
    crew = await Crew.getById(crewId, { throwError: true });

    if (!crew) throw new Error("Unable to find crew");

    await crew.addVehicle(vehicle._id);
  }

  await vehicle.save();

  if (crew) await crew.save();

  return vehicle;
};

const update = async (
  id: Id,
  data: VehicleUpdateData
): Promise<VehicleDocument> => {
  const vehicle = await Vehicle.getById(id, { throwError: true });
  if (!vehicle) throw new Error("Unable to find vehicle");

  await vehicle.updateDocument(data);

  await vehicle.save();

  return vehicle;
};

const updateRates = async (
  id: string,
  data: RatesData[]
): Promise<VehicleDocument> => {
  const vehicle = await Vehicle.getById(id, { throwError: true });
  if (!vehicle) throw new Error("Unable to find vehicle");

  await vehicle.updateRates(data);

  await vehicle.save();

  return vehicle;
};

const archive = async (id: Id) => {
  const vehicle = await Vehicle.getById(id);
  if (!vehicle) throw new Error("Unable to find vehicle");

  const { crews } = await vehicle.archive();

  await vehicle.save();

  for (let i = 0; i < crews.length; i++) {
    crews[i].save();
  }

  return vehicle;
};

const unarchive = async (id: Id) => {
  const vehicle = await Vehicle.getById(id);
  if (!vehicle) throw new Error("Unable to find vehicle");

  await vehicle.unarchive();
  await vehicle.save();

  return vehicle;
};

export default {
  create,
  update,
  updateRates,
  archive,
  unarchive,
};
