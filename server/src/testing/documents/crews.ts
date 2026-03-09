import { Crew, CrewDocument } from "@models";
import _ids from "@testing/_ids";
import { CrewTypes } from "@typescript/crew";

export interface SeededCrews {
  base_1: CrewDocument;
}

const createCrews = async (): Promise<SeededCrews> => {
  const base_1 = new Crew({
    _id: _ids.crews.base_1._id,
    name: "Base Crew 1",
    type: CrewTypes.Base,
    employees: [
      _ids.employees.base_foreman_1._id,
      _ids.employees.base_operator_1._id,
      _ids.employees.base_laborer_1._id,
      _ids.employees.base_laborer_2._id,
      _ids.employees.base_laborer_3._id,
    ],
    vehicles: [
      _ids.vehicles.gravel_truck_1._id,
      _ids.vehicles.personnel_truck_1._id,
      _ids.vehicles.skidsteer_1._id,
    ],
  });

  const crews = {
    base_1,
  };

  for (let i = 0; i < Object.values(crews).length; i++) {
    await Object.values(crews)[i].save();
  }

  return crews;
};

export default createCrews;
