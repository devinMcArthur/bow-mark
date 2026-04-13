import { CrewKind, CrewKindDocument } from "@models";
import { Id } from "@typescript/models";
import { Field, InputType } from "type-graphql";

@InputType()
export class CrewKindCreateData {
  @Field({ nullable: false })
  public name!: string;

  @Field({ nullable: true })
  public description?: string;
}

@InputType()
export class CrewKindUpdateData {
  @Field({ nullable: true })
  public name?: string;

  @Field({ nullable: true })
  public description?: string;
}

const create = async (data: CrewKindCreateData): Promise<CrewKindDocument> => {
  const crewKind = await CrewKind.createDocument(data);
  await crewKind.save();
  return crewKind;
};

const update = async (
  id: Id,
  data: CrewKindUpdateData
): Promise<CrewKindDocument> => {
  const crewKind = await CrewKind.getById(id);
  if (!crewKind) throw new Error("Unable to find CrewKind");

  if (data.name && data.name !== crewKind.name) {
    const duplicate = await CrewKind.getByName(data.name);
    if (duplicate && duplicate._id.toString() !== crewKind._id.toString()) {
      throw new Error("A crew kind with this name already exists");
    }
  }

  await crewKind.updateDocument(data);
  await crewKind.save();
  return crewKind;
};

const archive = async (id: Id): Promise<CrewKindDocument> => {
  const crewKind = await CrewKind.getById(id);
  if (!crewKind) throw new Error("Unable to find CrewKind");

  await crewKind.archive();
  await crewKind.save();
  return crewKind;
};

const unarchive = async (id: Id): Promise<CrewKindDocument> => {
  const crewKind = await CrewKind.findById(id);
  if (!crewKind) throw new Error("Unable to find CrewKind");
  if (!crewKind.archivedAt) throw new Error("CrewKind is not archived");

  await crewKind.unarchive();
  await crewKind.save();
  return crewKind;
};

const remove = async (id: Id) => {
  const crewKind = await CrewKind.getById(id);
  if (!crewKind) throw new Error("Unable to find CrewKind");

  await crewKind.removeIfPossible();
  return true;
};

export default {
  create,
  update,
  archive,
  unarchive,
  remove,
};
