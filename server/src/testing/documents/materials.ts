import { Material, MaterialDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededMaterials {
  material_1: MaterialDocument;
  material_2: MaterialDocument;
  material_3: MaterialDocument;
}

const createMaterials = async (): Promise<SeededMaterials> => {
  const material_1 = new Material({
    _id: _ids.materials.material_1._id,
    name: "Material 1",
  });

  const material_2 = new Material({
    _id: _ids.materials.material_2._id,
    name: "Second Material",
  });

  const material_3 = new Material({
    _id: _ids.materials.material_3._id,
    name: "Another material",
  });

  const materials = {
    material_1,
    material_2,
    material_3,
  };

  for (let i = 0; i < Object.values(materials).length; i++) {
    await Object.values(materials)[i].save();
  }

  return materials;
};

export default createMaterials;
