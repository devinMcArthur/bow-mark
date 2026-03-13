import { EnrichedFileDocument, EnrichedFileModel } from "@models";
import { Types } from "mongoose";

const document = async (
  EnrichedFile: EnrichedFileModel,
  fileId: string,
  documentType?: string
): Promise<EnrichedFileDocument> => {
  return new EnrichedFile({
    _id: new Types.ObjectId(),
    file: fileId,
    summaryStatus: "pending",
    ...(documentType ? { documentType } : {}),
  });
};

export default { document };
