import { Employee } from "@models";
import getClientUrl from "@utils/getClientUrl";
import getRateForTime from "@utils/getRateForTime";
import ExcelJS from "exceljs";

export const generateForEmployees = async () => {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("Employees");

  // Get all employees
  const employees = await Employee.find();

  const url = getClientUrl();

  worksheet.addTable({
    name: "Employees",
    ref: worksheet.getRow(1).getCell(1).address,
    columns: [
      { name: "Name", filterButton: true },
      { name: "Role", filterButton: true },
      { name: "Current Rate", filterButton: true },
      { name: "Archived", filterButton: true },
      { name: "Link" },
    ],
    rows: [
      ...employees.map((employee) => {
        return [
          employee.name,
          employee.jobTitle,
          getRateForTime(employee.rates),
          employee.archivedAt ? "true" : "",
          url + `/employee/${employee._id}`,
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
