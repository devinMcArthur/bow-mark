import { TenderDocument, TenderModel } from "@models";
import { ITenderCreate } from "@typescript/tender";
import { eventfulMutation } from "@lib/eventfulMutation";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";

const document = async (
  Tender: TenderModel,
  data: ITenderCreate
): Promise<TenderDocument> => {
  const createdId = await eventfulMutation(async (session) => {
    const created = await Tender.insertMany(
      [
        {
          name: data.name,
          jobcode: data.jobcode,
          description: data.description,
          createdBy: data.createdBy,
          status: "bidding",
          files: [],
        },
      ],
      { session }
    );
    const tender = created[0] as TenderDocument;
    await createEntityRoot({ namespace: "/tenders", entityId: tender._id, session });
    return { result: tender._id, event: null };
  });

  // Re-fetch outside the transaction so caller can .save() without hitting
  // "Use of expired sessions is not permitted".
  const fresh = await Tender.findById(createdId);
  if (!fresh) {
    throw new Error("Tender.createDocument: document disappeared after create transaction");
  }
  return fresh;
};

export default { document };
