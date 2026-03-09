import { MaterialShipmentDocument, MaterialShipmentModel } from "@models";
import { IMaterialShipmentCreate } from "@typescript/materialShipment";

const document = async (
  MaterialShipment: MaterialShipmentModel,
  data: IMaterialShipmentCreate
): Promise<MaterialShipmentDocument> => {
  const materialShipment = new MaterialShipment({
    quantity: data.quantity,
    startTime: data.startTime,
    endTime: data.endTime,
    vehicleObject: data.vehicleObject,
  });

  await materialShipment.updateShipment(data, data.dailyReport);

  await data.dailyReport.addMaterialShipment(materialShipment);

  await materialShipment.validateDocument();

  return materialShipment;
};

export default {
  document,
};
