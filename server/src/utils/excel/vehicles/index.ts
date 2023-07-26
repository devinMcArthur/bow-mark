import { Vehicle } from "@models";
import getClientUrl from "@utils/getClientUrl";
import ExcelJS from "exceljs";

export const generateForVehicles = async () => {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("Vehicles");

  // Get all vehicles
  const vehicles = await Vehicle.find();

  const url = getClientUrl();

  worksheet.addTable({
    name: "Vehicles",
    ref: worksheet.getRow(1).getCell(1).address,
    columns: [
      { name: "Name", filterButton: true },
      { name: "Code", filterButton: true },
      { name: "Type", filterButton: true },
      { name: "Link" },
      { name: "Archived", filterButton: true },
    ],
    rows: [
      ...vehicles.map((vehicle) => {
        return [
          vehicle.name,
          vehicle.vehicleCode,
          vehicle.vehicleType,
          url + `/vehicle/${vehicle._id}`,
          vehicle.archivedAt ? "true" : "",
        ];
      }),
    ],
  });

  // Auto Column Width
  worksheet.columns.forEach((column) => {
    let dataMax = 2;

    if (column.values) {
      column.values.forEach((value) => {
        if (
          value &&
          (typeof value === "string" || typeof value === "number") &&
          `${value}`.length > dataMax
        )
          dataMax = `${value}`.length + 4;
      });
    }

    column.width = dataMax;
  });

  return workbook;
};
