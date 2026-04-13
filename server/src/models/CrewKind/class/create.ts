import type { CrewKindDocument, CrewKindModel } from "@models";
import { ICrewKindCreate } from "@typescript/crewKind";

const document = async (
  CrewKind: CrewKindModel,
  data: ICrewKindCreate
): Promise<CrewKindDocument> => {
  const existing = await CrewKind.getByName(data.name);
  if (existing) throw new Error("A crew kind with this name already exists");

  // Check for an archived record with the same name. The unique index on
  // `name` covers all documents (including archived), so creating a new
  // one would fail. Instead, surface a specific error that the client can
  // use to offer an un-archive action.
  const escaped = data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const archived = await CrewKind.findOne({
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
    archivedAt: { $ne: null },
  });
  if (archived) {
    throw new Error(
      `ARCHIVED_DUPLICATE:${archived._id}:A crew kind named "${data.name}" exists but is archived. Would you like to restore it?`
    );
  }

  const crewKind = new CrewKind({
    name: data.name,
    description: data.description,
  });

  return crewKind;
};

export default {
  document,
};
