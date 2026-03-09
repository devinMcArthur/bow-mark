import { MaterialShipmentDocument } from "@models";

const requestUpdate = async (materialShipment: MaterialShipmentDocument) => {
  const dailyReport = await materialShipment.getDailyReport();

  await dailyReport?.requestReportUpdate();

  return;
};

export default {
  requestUpdate,
};
