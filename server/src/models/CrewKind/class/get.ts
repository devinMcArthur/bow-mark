import { Types } from "mongoose";
import type { CrewKindDocument, CrewKindModel } from "@models";
import { GetByIDOptions, IListOptions } from "@typescript/models";
import populateOptions from "@utils/populateOptions";

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  CrewKind: CrewKindModel,
  id: Types.ObjectId | string,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<CrewKindDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const crewKind = await CrewKind.findById(id);

  if (!crewKind && options.throwError) {
    throw new Error("CrewKind.getById: unable to find crew kind");
  }

  return crewKind;
};

const byName = async (
  CrewKind: CrewKindModel,
  name: string
): Promise<CrewKindDocument | null> => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const crewKind = await CrewKind.findOne({
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
    archivedAt: null,
  });

  return crewKind;
};

const listDefaultOptions: IListOptions<CrewKindDocument> = {
  pageLimit: 9999,
  offset: 0,
};
const list = async (
  CrewKind: CrewKindModel,
  options?: IListOptions<CrewKindDocument>
): Promise<CrewKindDocument[]> => {
  options = populateOptions(options, listDefaultOptions);

  if (options?.query) options.query.archivedAt = null;

  const crewKinds = await CrewKind.find(
    options?.query || { archivedAt: null },
    undefined,
    {
      limit: options?.pageLimit,
      skip: options?.offset,
      sort: { name: "asc" },
    }
  );

  return crewKinds;
};

export default {
  byId,
  byName,
  list,
};
