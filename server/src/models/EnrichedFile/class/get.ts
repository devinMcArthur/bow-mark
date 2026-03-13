import { EnrichedFileDocument, EnrichedFileModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";

const byId = async (
  EnrichedFile: EnrichedFileModel,
  id: Id,
  options?: GetByIDOptions
): Promise<EnrichedFileDocument | null> => {
  if (options?.throwError) {
    const doc = await EnrichedFile.findById(id).populate("file");
    if (!doc) throw new Error(`EnrichedFile ${id} not found`);
    return doc;
  }
  return EnrichedFile.findById(id).populate("file");
};

const byIds = async (
  EnrichedFile: EnrichedFileModel,
  ids: Id[]
): Promise<EnrichedFileDocument[]> => {
  return EnrichedFile.find({ _id: { $in: ids } }).populate("file");
};

export default { byId, byIds };
