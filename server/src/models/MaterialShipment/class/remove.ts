import { MaterialShipmentDocument } from "@models";

const fullDelete = async (materialShipment: MaterialShipmentDocument) => {
  const dailyReport = await materialShipment.getDailyReport();

  if (dailyReport) {
    await dailyReport.removeMaterialShipment(materialShipment);

    await dailyReport.save();
  }

  await materialShipment.remove();

  return;
};

export default {
  fullDelete,
};
