import { Material, MaterialDocument } from "@models";
import { Id } from "@typescript/models";
import { Field, InputType } from "type-graphql";

@InputType()
export class MaterialCreateData {
  @Field({ nullable: false })
  public name!: string;
}

@InputType()
export class MaterialUpdateData {
  @Field({ nullable: false })
  public name!: string;
}

const create = async (data: MaterialCreateData): Promise<MaterialDocument> => {
  const material = await Material.createDocument(data);

  await material.save();

  return material;
};

const update = async (
  id: Id,
  data: MaterialUpdateData
): Promise<MaterialDocument> => {
  const material = await Material.getById(id);
  if (!material) throw new Error("Unable to find Material");

  await material.updateDocument(data);

  await material.save();

  return material;
};

const remove = async (id: Id) => {
  const material = await Material.getById(id);
  if (!material) throw new Error("Unable to find material");

  await material.removeIfPossible();

  return true;
};

const archive = async (id: Id): Promise<MaterialDocument> => {
  const material = await Material.getById(id);
  if (!material) throw new Error("Unable to find material");

  await material.archive();

  await material.save();

  return material;
};

export default {
  create,
  update,
  remove,
  archive,
};
