import ExcelJS from "exceljs";

import { CompanyMaterialReport } from "@typescript/company";
import { Material } from "@models";

const generateCompanyMaterialReportExcel = async (report: CompanyMaterialReport[]) => {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("Material Report");

  // Step 1: Gather Unique Dates and Materials
  const uniqueDates = new Set<string>();
  const materialNames = new Map<string, string>();

  report.forEach((materialReport) => {
    materialReport.jobDays.forEach((jobDay) => {
      uniqueDates.add(jobDay.date.toISOString());
    });

    if (materialReport.material) {
      materialNames.set(materialReport.material.toString(), ""); // Initialize empty
    }
  });

  const sortedDates = Array.from(uniqueDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  await Promise.all(Array.from(materialNames.keys()).map(async (materialId) => {
    const material = await Material.getById(materialId);
    if (material) materialNames.set(materialId, material.name);
  }));

  // Step 2: Create the Data Matrix
  const dataMatrix: (string | number)[][] = [];
  sortedDates.forEach((date) => {
    const row: (string | number)[] = [date.toString()]; // First column is the date

    materialNames.forEach((_, materialId) => {
      const quantity = report.find((r) => r.material?.toString() === materialId)
        ?.jobDays.find((jd) => jd.date.getTime() === new Date(date).getTime())?.quantity || 0;

      row.push(quantity);
    });

    dataMatrix.push(row);
  });

  // Step 3: Add the Table

  worksheet.addTable({
    name: "Materials",
    ref: worksheet.getRow(1).getCell(1).address,
    totalsRow: true,
    columns: [
      { name: "Dates", filterButton: true },
      // @ts-expect-error - TS doesn't like the spread operator here for totalRowFunction
      ...Array.from(materialNames.values()).map((name) => (
        { name: name, filterButton: true, totalsRowFunction: "sum" }
      )),
    ],
    rows: dataMatrix,
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

export default generateCompanyMaterialReportExcel;
