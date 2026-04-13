import type { CrewKindDocument } from "@models";
import { ICrewKindUpdate } from "@typescript/crewKind";

const document = (crewKind: CrewKindDocument, data: ICrewKindUpdate) => {
  if (data.name !== undefined) crewKind.name = data.name;
  if (data.description !== undefined) crewKind.description = data.description;
};

const archive = async (crewKind: CrewKindDocument) => {
  if (!crewKind.archivedAt) crewKind.archivedAt = new Date();
};

const unarchive = async (crewKind: CrewKindDocument) => {
  crewKind.archivedAt = undefined;
};

export default {
  document,
  archive,
  unarchive,
};
