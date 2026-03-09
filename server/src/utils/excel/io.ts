import ExcelJS from "exceljs";

export const getWorkbookBuffer = async (
  workbook: ExcelJS.Workbook
): Promise<Buffer> => {
  return (await workbook.xlsx.writeBuffer()) as Buffer;
};
