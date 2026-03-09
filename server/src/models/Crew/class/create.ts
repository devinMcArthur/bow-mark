import { CrewDocument, CrewModel } from "@models";
import { ICrewCreate } from "@typescript/crew";

const document = async (
  Crew: CrewModel,
  data: ICrewCreate
): Promise<CrewDocument> => {
  const crew = new Crew({
    ...data,
  });

  return crew;
};

export default {
  document,
};
