import { MaterialShipmentDocument } from "@models";
import isEmpty from "@utils/isEmpty";

const document = async (materialShipment: MaterialShipmentDocument) => {
  if (materialShipment.noJobsiteMaterial) {
    if (isEmpty(materialShipment.shipmentType))
      throw new Error("This material shipment must have a shipment type");

    if (isEmpty(materialShipment.unit))
      throw new Error("This material shipment must have a unit");

    if (isEmpty(materialShipment.supplier))
      throw new Error("This material shipment must have a supplier");
  } else {
    if (isEmpty(materialShipment.jobsiteMaterial))
      throw new Error("This material shipment must have a jobsite material");
  }

  if (materialShipment.startTime && materialShipment.endTime) {
    if (
      new Date(materialShipment.startTime).getTime() >
      new Date(materialShipment.endTime).getTime()
    )
      throw new Error("Start time must be before end time");
  }

  return;
};

export default {
  document,
};
