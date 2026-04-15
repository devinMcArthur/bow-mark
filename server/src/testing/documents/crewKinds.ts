import { CrewKind, CrewKindDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededCrewKinds {
  e2e_operator: CrewKindDocument;
  e2e_labour: CrewKindDocument;
}

const createCrewKinds = async (): Promise<SeededCrewKinds> => {
  const e2e_operator = new CrewKind({
    _id: _ids.crewKinds.e2e_operator._id,
    name: "E2E Operator",
    description: "Seeded crew kind used by tender pricing E2E tests.",
  });

  const e2e_labour = new CrewKind({
    _id: _ids.crewKinds.e2e_labour._id,
    name: "E2E Labour",
    description: "Seeded crew kind used by tender pricing E2E tests.",
  });

  const crewKinds = { e2e_operator, e2e_labour };
  for (const doc of Object.values(crewKinds)) {
    await doc.save();
  }
  return crewKinds;
};

export default createCrewKinds;
