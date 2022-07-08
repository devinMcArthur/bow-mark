import {
  Company,
  Invoice,
  InvoiceDocument,
  Jobsite,
  JobsiteDayReport,
  JobsiteMonthReportDocument,
  JobsiteYearReportDocument,
  System,
} from "@models";
import { CrewTypes } from "@typescript/crew";
import dayjs from "dayjs";
import ExcelJS, { TableColumnProperties } from "exceljs";
import {
  generateCrewEmployeeCatalog,
  generateCrewEquipmentCatalog,
  generateCrewMaterialCatalog,
  generateCrewTruckingCatalog,
  generateDocumentIndex,
  getStartingColumnCell,
  getStartRowCell,
  IDocumentIndex,
  safeCrewTableName,
} from "./helpers";

export type Report = JobsiteYearReportDocument | JobsiteMonthReportDocument;

type CellLocation = { topLeft: ExcelJS.Cell; bottomRight: ExcelJS.Cell };

const startingInvoiceColumn = 4;
const startingCrewColumn = 8;

export type CellLocations = {
  wages?: CellLocation;
  equipment?: CellLocation;
  material?: CellLocation;
  trucking?: CellLocation;
};

export type InvoiceCells = {
  internalExpenses?: CellLocation;
  externalExpenses?: CellLocation;
  internalRevenue?: CellLocation;
  externalRevenue?: CellLocation;
};

// eslint-disable-next-line quotes
const currencyFormat = '"$"#,##0.00;[Red]-"$"#,##0.00';

export const generateForRangeReport = async (
  report: Report
): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("Sheet 1");

  const dayReports = await JobsiteDayReport.find({
    _id: { $in: report.dayReports },
  });

  const documentIndex = await generateDocumentIndex(dayReports);

  const cellLocations: CellLocations[] = [];

  const invoiceCells: InvoiceCells = {};

  worksheet.columns = [{ key: "title" }, { key: "value" }];

  const jobsite = await Jobsite.getById(report.jobsite || "");

  const titleRows = worksheet.addRows([
    {
      title: "Project:",
      value: jobsite?.name || "Not Found",
    },
    {
      title: "Job Number:",
      value: jobsite?.jobcode || "Not Found",
    },
  ]);

  titleRows[0].getCell(1).font = {
    bold: true,
  };
  titleRows[1].getCell(1).font = {
    bold: true,
  };

  worksheet.addRow({});

  await generateSummaryOutline(worksheet);

  await generateInvoices(worksheet, report, invoiceCells);

  for (let i = 0; i < report.crewTypes.length; i++) {
    cellLocations.push({});

    await generateForCrewType(
      worksheet,
      report.crewTypes[i],
      documentIndex,
      cellLocations
    );
  }

  // Auto Column Width
  worksheet.columns.forEach((column) => {
    let dataMax = 2;

    if (column.eachCell)
      column.eachCell((cell) => {
        cell.numFmt = "#,##0.00";
      });

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

  await generateSummaryValues(worksheet, cellLocations, invoiceCells);

  return workbook;
};

const generateSummaryOutline = async (worksheet: ExcelJS.Worksheet) => {
  const summaryRows = worksheet.addRows([
    { title: "Summary" },
    { title: "Wages" },
    { title: "Equipment" },
    { title: "Materials" },
    { title: "Trucking" },
    { title: "Sub Overhead" },
    { title: "Expense Invoices" },
    { title: "Total Revenue" },
    { title: "Expenses" },
    { title: "Overhead" },
    { title: "Total Expenses" },
    { title: "Net Income" },
  ]);

  summaryRows[0].getCell(1).font = {
    bold: true,
  };

  const startFinish = [1, 11];
  for (let i = startFinish[0]; i <= startFinish[1]; i++) {
    summaryRows[i].getCell(1).alignment = {
      horizontal: "right",
    };
  }
};

const generateSummaryValues = async (
  worksheet: ExcelJS.Worksheet,
  cellLocations: CellLocations[],
  invoiceCells: InvoiceCells
) => {
  const wageTotalCells: ExcelJS.Cell[] = [],
    equipmentTotalCells: ExcelJS.Cell[] = [],
    materialTotalCells: ExcelJS.Cell[] = [],
    truckingTotalCells: ExcelJS.Cell[] = [];
  for (let i = 0; i < cellLocations.length; i++) {
    const cellLocation = cellLocations[i];

    if (cellLocation.wages) {
      wageTotalCells.push(cellLocation.wages.bottomRight);
    }

    if (cellLocation.equipment) {
      equipmentTotalCells.push(cellLocation.equipment.bottomRight);
    }

    if (cellLocation.material) {
      materialTotalCells.push(cellLocation.material.bottomRight);
    }

    if (cellLocation.trucking) {
      truckingTotalCells.push(cellLocation.trucking.bottomRight);
    }
  }

  const formatCell = (cell: ExcelJS.Cell) => {
    cell.numFmt = currencyFormat;
    cell.alignment = { horizontal: "center" };
  };

  const wagesCell = worksheet.getRow(5).getCell(2);
  if (wageTotalCells.length > 0)
    wagesCell.value = {
      formula: wageTotalCells.map((cell) => cell.$col$row).join("+"),
      date1904: false,
    };
  else wagesCell.value = 0;

  formatCell(wagesCell);

  const equipmentCell = worksheet.getRow(6).getCell(2);
  if (equipmentTotalCells.length > 0)
    equipmentCell.value = {
      formula: equipmentTotalCells.map((cell) => cell.$col$row).join("+"),
      date1904: false,
    };
  else equipmentCell.value = 0;
  formatCell(equipmentCell);

  const materialCell = worksheet.getRow(7).getCell(2);
  if (materialTotalCells.length > 0)
    materialCell.value = {
      formula: materialTotalCells.map((cell) => cell.$col$row).join("+"),
      date1904: false,
    };
  else materialCell.value = 0;
  formatCell(materialCell);

  const truckingCell = worksheet.getRow(8).getCell(2);
  if (truckingTotalCells.length > 0)
    truckingCell.value = {
      formula: truckingTotalCells.map((cell) => cell.$col$row).join("+"),
      date1904: false,
    };
  else truckingCell.value = 0;
  formatCell(truckingCell);

  // Sub Overhead
  const subOverheadCell = worksheet.getRow(9).getCell(2);
  let subInvoiceTotalCell: string | undefined;
  if (invoiceCells.externalExpenses?.bottomRight) {
    subInvoiceTotalCell = invoiceCells.externalExpenses.bottomRight.$col$row;
  }
  if (subInvoiceTotalCell) {
    subOverheadCell.value = {
      formula: `${subInvoiceTotalCell}*1.03`,
      date1904: false,
    };
  } else subOverheadCell.value = 0;
  formatCell(subOverheadCell);

  // Expense Invoices
  const expenseInvoiceCell = worksheet.getRow(10).getCell(2);
  let internalExpense: string | undefined;
  if (invoiceCells.internalExpenses?.bottomRight)
    internalExpense = invoiceCells.internalExpenses.bottomRight.$col$row;

  expenseInvoiceCell.value = {
    formula: `${subOverheadCell.$col$row}${
      internalExpense ? `+${internalExpense}` : ""
    }`,
    date1904: false,
  };
  formatCell(expenseInvoiceCell);

  // Revenue
  const revenueCell = worksheet.getRow(11).getCell(2);
  const revenueTotals: string[] = [];
  if (invoiceCells.externalRevenue?.bottomRight)
    revenueTotals.push(invoiceCells.externalRevenue.bottomRight.$col$row);
  if (invoiceCells.internalRevenue?.bottomRight)
    revenueTotals.push(invoiceCells.internalRevenue.bottomRight.$col$row);

  if (revenueTotals.length > 0)
    revenueCell.value = {
      formula: revenueTotals.join("+"),
      date1904: false,
    };
  else revenueCell.value = 0;
  formatCell(revenueCell);

  // Expenses
  const expensesCell = worksheet.getRow(12).getCell(2);
  expensesCell.value = {
    formula: [
      wagesCell.$col$row,
      equipmentCell.$col$row,
      materialCell.$col$row,
      truckingCell.$col$row,
    ].join("+"),
    date1904: false,
  };
  formatCell(expensesCell);

  // Overhead
  const system = await System.getSystem();
  const overheadCell = worksheet.getRow(13).getCell(2);
  overheadCell.value = {
    formula: `${expensesCell.$col$row}*${
      system.internalExpenseOverheadRate / 100
    }`,
    date1904: false,
  };
  formatCell(overheadCell);

  // Total Expenses
  const totalExpensesCell = worksheet.getRow(14).getCell(2);
  totalExpensesCell.value = {
    formula: `${expensesCell.$col$row}+${overheadCell.$col$row}+${expenseInvoiceCell.$col$row}`,
    date1904: false,
  };
  formatCell(totalExpensesCell);

  // Net Income
  const netIncomeCell = worksheet.getRow(15).getCell(2);
  netIncomeCell.value = {
    formula: `${revenueCell.$col$row}-${totalExpensesCell.$col$row}`,
    date1904: false,
  };
  formatCell(netIncomeCell);
};

const generateInvoices = async (
  worksheet: ExcelJS.Worksheet,
  report: Report,
  invoiceCells: InvoiceCells
) => {
  const firstCell = worksheet.getRow(2).getCell(startingInvoiceColumn);

  const expenseInvoices = await Invoice.find({
    _id: { $in: report.expenseInvoices.map((expInv) => expInv.invoice) },
  });

  // External Expense Invoices

  const externalExpenses = await generateInvoiceTable(
    worksheet,
    expenseInvoices.filter((invoice) => invoice.internal === false),
    "ExternalExpenseInvoices",
    firstCell
  );
  if (externalExpenses) {
    invoiceCells.externalExpenses = {
      topLeft: worksheet.getCell(externalExpenses.ref),
      // @ts-expect-error - not properly typed
      bottomRight: worksheet.getCell(externalExpenses.tableRef.split(":")[1]),
    };
    const titleCell = worksheet
      .getRow(parseInt(invoiceCells.externalExpenses.topLeft.row) - 1)
      .getCell(startingInvoiceColumn);
    titleCell.value = "External Expense Invoices";
    titleCell.font = {
      bold: true,
    };
  }

  // Internal Expense Invoices

  let secondCell;
  if (invoiceCells.externalExpenses) {
    secondCell = worksheet
      .getRow(parseInt(invoiceCells.externalExpenses.bottomRight.row) + 3)
      .getCell(startingInvoiceColumn);
  } else secondCell = firstCell;

  const internalExpenses = await generateInvoiceTable(
    worksheet,
    expenseInvoices.filter((invoice) => invoice.internal === true),
    "InternalExpenseInvoices",
    secondCell
  );
  if (internalExpenses) {
    invoiceCells.internalExpenses = {
      topLeft: worksheet.getCell(internalExpenses.ref),
      // @ts-expect-error - not properly typed
      bottomRight: worksheet.getCell(internalExpenses.tableRef.split(":")[1]),
    };
    const titleCell = worksheet
      .getRow(parseInt(invoiceCells.internalExpenses.topLeft.row) - 1)
      .getCell(startingInvoiceColumn);
    titleCell.value = "Internal Expense Invoices";
    titleCell.font = {
      bold: true,
    };
  }

  // External Revenue Invoices

  let thirdCell;
  if (invoiceCells.internalExpenses) {
    thirdCell = worksheet
      .getRow(parseInt(invoiceCells.internalExpenses.bottomRight.row) + 3)
      .getCell(startingInvoiceColumn);
  } else thirdCell = secondCell;

  const revenueInvoices = await Invoice.find({
    _id: { $in: report.revenueInvoices.map((expInv) => expInv.invoice) },
  });

  const externalRevenue = await generateInvoiceTable(
    worksheet,
    revenueInvoices.filter((invoice) => invoice.internal === false),
    "ExternalRevenueInvoices",
    thirdCell
  );
  if (externalRevenue) {
    invoiceCells.externalRevenue = {
      topLeft: worksheet.getCell(externalRevenue.ref),
      // @ts-expect-error - not properly typed
      bottomRight: worksheet.getCell(externalRevenue.tableRef.split(":")[1]),
    };

    const titleCell = worksheet
      .getRow(parseInt(invoiceCells.externalRevenue.topLeft.row) - 1)
      .getCell(startingInvoiceColumn);
    titleCell.value = "External Revenue Invoices";
    titleCell.font = {
      bold: true,
    };
  }

  // Internal Revenue Invoices

  let fourthCell;
  if (invoiceCells.externalRevenue) {
    fourthCell = worksheet
      .getRow(parseInt(invoiceCells.externalRevenue.bottomRight.row) + 3)
      .getCell(startingInvoiceColumn);
  } else fourthCell = thirdCell;

  const internalRevenue = await generateInvoiceTable(
    worksheet,
    revenueInvoices.filter((invoice) => invoice.internal === true),
    "InternalRevenueInvoices",
    fourthCell
  );
  if (internalRevenue) {
    invoiceCells.internalRevenue = {
      topLeft: worksheet.getCell(internalRevenue.ref),
      // @ts-expect-error - not properly typed
      bottomRight: worksheet.getCell(internalRevenue.tableRef.split(":")[1]),
    };

    const titleCell = worksheet
      .getRow(parseInt(invoiceCells.internalRevenue.topLeft.row) - 1)
      .getCell(startingInvoiceColumn);
    titleCell.value = "Internal Revenue Invoices";
    titleCell.font = {
      bold: true,
    };
  }
};

const generateInvoiceTable = async (
  worksheet: ExcelJS.Worksheet,
  invoices: InvoiceDocument[],
  name: string,
  refCell: ExcelJS.Cell
) => {
  if (refCell && invoices.length > 0) {
    const tableObject = worksheet.addTable({
      name,
      ref: refCell.$col$row,
      totalsRow: true,
      columns: [
        { name: "Company", filterButton: true },
        { name: "Invoice Number" },
        { name: "Value", filterButton: true, totalsRowFunction: "sum" },
      ],
      rows: [
        ...(await Promise.all(
          invoices.map(async (invoice) => {
            const company = await Company.getById(invoice.company || "");
            let companyName = "Not Found";
            if (company) companyName = company.name;
            return [companyName, invoice.invoiceNumber, invoice.cost];
          })
        )),
      ],
    });

    // @ts-expect-error - not properly typed
    const table: ExcelJS.Table = tableObject.table;

    return table;
  } else return null;
};

const generateForCrewType = async (
  worksheet: ExcelJS.Worksheet,
  crewType: CrewTypes,
  documentIndex: IDocumentIndex,
  cellLocations: CellLocations[]
) => {
  const row = worksheet.getRow(1);
  const startCell = getStartingColumnCell(worksheet, cellLocations, {
    row,
    startingColumn: startingCrewColumn,
  });
  if (startCell) {
    startCell.value = crewType;
    startCell.style.font = {
      bold: true,
      size: 16,
    };
  }

  await generateWages(worksheet, crewType, documentIndex, cellLocations);
  await generateEquipment(worksheet, crewType, documentIndex, cellLocations);
  await generateMaterial(worksheet, crewType, documentIndex, cellLocations);
  await generateTrucking(worksheet, crewType, documentIndex, cellLocations);
};

const generateWages = async (
  worksheet: ExcelJS.Worksheet,
  crewType: CrewTypes,
  documentIndex: IDocumentIndex,
  cellLocations: CellLocations[]
) => {
  const { employeeCatalog, relevantReports } =
    await generateCrewEmployeeCatalog(crewType, documentIndex);

  const index = cellLocations.length - 1;
  const row = index === 0 ? worksheet.getRow(2) : undefined;
  const openCell = getStartingColumnCell(worksheet, cellLocations, {
    row,
    startingColumn: startingCrewColumn,
  });

  if (openCell && employeeCatalog.length > 0) {
    const tableObject = worksheet.addTable({
      name: `Wages${safeCrewTableName(crewType)}`,
      ref: openCell.$col$row,
      totalsRow: true,
      columns: [
        { name: "Employee", filterButton: true },
        ...(relevantReports.map((report) => {
          return {
            name: dayjs(report.date).format("MMM D"),
            filterButton: true,
            totalsRowFunction: "sum",
          };
        }) as TableColumnProperties[]),
        { name: "Total Hours", filterButton: true, totalsRowFunction: "sum" },
        { name: "Cost", filterButton: true, totalsRowFunction: "sum" },
      ],
      rows: [
        ...employeeCatalog.map((catalogItem) => {
          return [
            catalogItem.employee.name,
            ...catalogItem.reports.map((employeeReport) => {
              if (employeeReport) return employeeReport.hours;
              else return 0;
            }),
            catalogItem.totalHours,
            catalogItem.totalCost,
          ];
        }),
      ],
    });

    // @ts-expect-error - not properly typed
    const table: ExcelJS.Table = tableObject.table;

    cellLocations[index].wages = {
      topLeft: worksheet.getCell(table.ref),
      // @ts-expect-error - not properly typed
      bottomRight: worksheet.getCell(table.tableRef.split(":")[1]),
    };
  }
};

const generateEquipment = async (
  worksheet: ExcelJS.Worksheet,
  crewType: CrewTypes,
  documentIndex: IDocumentIndex,
  cellLocations: CellLocations[]
) => {
  const { equipmentCatalog, relevantReports } =
    await generateCrewEquipmentCatalog(crewType, documentIndex);

  const index = cellLocations.length - 1;
  const rowCell = getStartRowCell(worksheet, cellLocations);
  const openCell = getStartingColumnCell(worksheet, cellLocations, {
    row: worksheet.getRow(parseInt(rowCell.row)),
    startingColumn: startingCrewColumn,
  });

  if (openCell && equipmentCatalog.length > 0) {
    const tableObject = worksheet.addTable({
      name: `Equipment${safeCrewTableName(crewType)}`,
      ref: openCell.$col$row,
      totalsRow: true,
      columns: [
        { name: "Equipment", filterButton: true },
        ...(relevantReports.map((report) => {
          return {
            name: dayjs(report.date).format("MMM D"),
            filterButton: true,
            totalsRowFunction: "sum",
          };
        }) as TableColumnProperties[]),
        { name: "Total Hours", filterButton: true, totalsRowFunction: "sum" },
        { name: "Cost", filterButton: true, totalsRowFunction: "sum" },
      ],
      rows: [
        ...equipmentCatalog.map((catalogItem) => {
          return [
            `${catalogItem.vehicle.name} - ${catalogItem.vehicle.vehicleCode}`,
            ...catalogItem.reports.map((report) => {
              if (report) return report.hours;
              else return 0;
            }),
            catalogItem.totalHours,
            catalogItem.totalCost,
          ];
        }),
      ],
    });

    // @ts-expect-error - not properly typed
    const table: ExcelJS.Table = tableObject.table;

    cellLocations[index].equipment = {
      topLeft: worksheet.getCell(table.ref),
      // @ts-expect-error - not properly typed
      bottomRight: worksheet.getCell(table.tableRef.split(":")[1]),
    };
  }
};

const generateMaterial = async (
  worksheet: ExcelJS.Worksheet,
  crewType: CrewTypes,
  documentIndex: IDocumentIndex,
  cellLocations: CellLocations[]
) => {
  const { materialCatalog, relevantReports } =
    await generateCrewMaterialCatalog(crewType, documentIndex);

  const index = cellLocations.length - 1;
  const rowCell = getStartRowCell(worksheet, cellLocations);
  const openCell = getStartingColumnCell(worksheet, cellLocations, {
    row: worksheet.getRow(parseInt(rowCell.row)),
    startingColumn: startingCrewColumn,
  });

  if (openCell && materialCatalog.length > 0) {
    const tableObject = worksheet.addTable({
      name: `Material${safeCrewTableName(crewType)}`,
      ref: openCell.$col$row,
      totalsRow: true,
      columns: [
        { name: "Material", filterButton: true },
        ...(relevantReports.map((report) => {
          return {
            name: dayjs(report.date).format("MMM D"),
            filterButton: true,
            totalsRowFunction: "sum",
          };
        }) as TableColumnProperties[]),
        {
          name: "Total Quantity",
          filterButton: true,
          totalsRowFunction: "sum",
        },
        { name: "Cost", filterButton: true, totalsRowFunction: "sum" },
      ],
      rows: [
        ...materialCatalog.map((catalogItem) => {
          return [
            `${catalogItem.jobsiteMaterial.material.name} - ${catalogItem.jobsiteMaterial.company.name}`,
            ...catalogItem.reports.map((report) => {
              if (report) return report.quantity;
              else return 0;
            }),
            catalogItem.totalQuantity,
            catalogItem.totalCost,
          ];
        }),
      ],
    });

    // @ts-expect-error - not properly typed
    const table: ExcelJS.Table = tableObject.table;

    cellLocations[index].material = {
      topLeft: worksheet.getCell(table.ref),
      // @ts-expect-error - not properly typed
      bottomRight: worksheet.getCell(table.tableRef.split(":")[1]),
    };
  }
};

const generateTrucking = async (
  worksheet: ExcelJS.Worksheet,
  crewType: CrewTypes,
  documentIndex: IDocumentIndex,
  cellLocations: CellLocations[]
) => {
  const { truckingCatalog, relevantReports } =
    await generateCrewTruckingCatalog(crewType, documentIndex);

  const index = cellLocations.length - 1;
  const rowCell = getStartRowCell(worksheet, cellLocations);
  const openCell = getStartingColumnCell(worksheet, cellLocations, {
    row: worksheet.getRow(parseInt(rowCell.row)),
    startingColumn: startingCrewColumn,
  });

  if (openCell && truckingCatalog.length > 0) {
    const tableObject = worksheet.addTable({
      name: `Trucking${safeCrewTableName(crewType)}`,
      ref: openCell.$col$row,
      totalsRow: true,
      columns: [
        { name: "Truck", filterButton: true },
        ...(relevantReports.map((report) => {
          return {
            name: dayjs(report.date).format("MMM D"),
            filterButton: true,
            totalsRowFunction: "sum",
          };
        }) as TableColumnProperties[]),
        { name: "Total Hours", filterButton: true, totalsRowFunction: "sum" },
        {
          name: "Total Quantity",
          filterButton: true,
          totalsRowFunction: "sum",
        },
        { name: "Cost", filterButton: true, totalsRowFunction: "sum" },
      ],
      rows: [
        ...truckingCatalog.map((catalogItem) => {
          return [
            catalogItem.truckingType,
            ...catalogItem.reports.map((truckingReport) => {
              if (truckingReport) return truckingReport.hours;
              else return 0;
            }),
            catalogItem.totalHours,
            catalogItem.totalQuantity,
            catalogItem.totalCost,
          ];
        }),
      ],
    });

    // @ts-expect-error - not properly typed
    const table: ExcelJS.Table = tableObject.table;

    cellLocations[index].trucking = {
      topLeft: worksheet.getCell(table.ref),
      // @ts-expect-error - not properly typed
      bottomRight: worksheet.getCell(table.tableRef.split(":")[1]),
    };
  }
};
