import { CrewTypes } from "@typescript/crew";
import dayjs from "dayjs";
import ExcelJS, { TableColumnProperties } from "exceljs";

interface ICrewData {
  wages: number;
  equipment: number;
  materials: number;
  trucking: number;
}

export type MasterCrewTotals = Record<CrewTypes, ICrewData>;

export interface IMasterRow {
  jobsiteName: string;
  lastInvoiceDate: string;
  extraWork: string;
  workOnHand: number;
  revenue: number;
  expenses: number;
  overhead: number;
  totalExpenses: number;
  netIncome: number;
  margin: number;
  marginMinusInternal: number;
  internalSubs: number;
  externalSubs: number;
  totalWages: number;
  totalEquipment: number;
  totalMaterials: number;
  totalTrucking: number;
  crewTotals: MasterCrewTotals;
}

// eslint-disable-next-line quotes
const currencyFormat = '"$"#,##0.00;[Red]-"$"#,##0.00';

export const generateMasterTable = async (
  worksheet: ExcelJS.Worksheet,
  crewTypes: CrewTypes[],
  rowsData: IMasterRow[],
  options?: {
    dateRange?: {
      startTime: Date;
      endTime: Date;
    };
  }
) => {
  const crewColumns: TableColumnProperties[] = [];
  for (let i = 0; i < crewTypes.length; i++) {
    const crewType = crewTypes[i];

    // Crew wages column
    crewColumns.push({
      name: `${crewType} Wages`,
      filterButton: true,
      totalsRowFunction: "sum",
    });

    // Crew equipment column
    crewColumns.push({
      name: `${crewType} Equipment`,
      filterButton: true,
      totalsRowFunction: "sum",
    });

    // Crew materials column
    crewColumns.push({
      name: `${crewType} Materials`,
      filterButton: true,
      totalsRowFunction: "sum",
    });

    // Crew trucking column
    crewColumns.push({
      name: `${crewType} Trucking`,
      filterButton: true,
      totalsRowFunction: "sum",
    });
  }

  let jobsiteTitle = "Jobsite";
  if (options?.dateRange) {
    jobsiteTitle += ` (${dayjs(options.dateRange.startTime).format(
      "MM/DD/YYYY"
    )} - ${dayjs(options.dateRange.endTime).format("MM/DD/YYYY")})`;
  }

  worksheet.addTable({
    name: "MasterCost",
    ref: "A1",
    totalsRow: true,
    columns: [
      { name: jobsiteTitle, filterButton: true },
      { name: "Last Invoiced", filterButton: true },
      { name: "Extra Work", filterButton: true },
      { name: "Work on Hand", filterButton: true, totalsRowFunction: "sum" },
      { name: "Revenue", filterButton: true, totalsRowFunction: "sum" },
      { name: "Expenses", filterButton: true, totalsRowFunction: "sum" },
      { name: "Overhead", filterButton: true, totalsRowFunction: "sum" },
      { name: "Total Expenses", filterButton: true, totalsRowFunction: "sum" },
      { name: "Net Income", filterButton: true, totalsRowFunction: "sum" },
      { name: "%", filterButton: true, totalsRowFunction: "average" },
      {
        name: "% minus internal",
        filterButton: true,
        totalsRowFunction: "average",
      },
      { name: "Internal Subs", filterButton: true, totalsRowFunction: "sum" },
      { name: "External Subs", filterButton: true, totalsRowFunction: "sum" },
      { name: "Total Wages", filterButton: true, totalsRowFunction: "sum" },
      { name: "Total Equipment", filterButton: true, totalsRowFunction: "sum" },
      { name: "Total Materials", filterButton: true, totalsRowFunction: "sum" },
      { name: "Total Trucking", filterButton: true, totalsRowFunction: "sum" },
      ...crewColumns,
    ],
    rows: await generateRows(crewTypes, rowsData),
  });

  // Auto Column Width
  worksheet.columns.forEach((column, index) => {
    let dataMax = 2;

    // Not percentage columns
    if (column.eachCell) {
      column.eachCell((cell) => {
        if (index !== 9 && index !== 10) {
          cell.numFmt = currencyFormat;
        } else {
          cell.numFmt = "0.00%";
        }
      });
    }

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
};

type Row = (string | number)[];
const generateRows = async (
  crewTypes: CrewTypes[],
  rowsData: IMasterRow[]
): Promise<Row[]> => {
  const rows: Row[] = [];

  for (let i = 0; i < rowsData.length; i++) {
    const rowData = rowsData[i];

    const crewColumns: Row = [];
    for (let j = 0; j < crewTypes.length; j++) {
      const crewType = crewTypes[j];

      // See if this crew type is in the rowsData
      const crewTypeData: ICrewData | undefined = rowData.crewTotals[crewType];

      if (crewTypeData) {
        crewColumns.push(
          crewTypeData.wages,
          crewTypeData.equipment,
          crewTypeData.materials,
          crewTypeData.trucking
        );
      } else {
        crewColumns.push(0, 0, 0, 0);
      }
    }

    const row: Row = [
      rowData.jobsiteName,
      rowData.lastInvoiceDate,
      rowData.extraWork,
      rowData.workOnHand,
      rowData.revenue,
      rowData.expenses,
      rowData.overhead,
      rowData.totalExpenses,
      rowData.netIncome,
      rowData.margin / 100,
      rowData.marginMinusInternal / 100,
      rowData.internalSubs,
      rowData.externalSubs,
      rowData.totalWages,
      rowData.totalEquipment,
      rowData.totalMaterials,
      rowData.totalTrucking,
      ...crewColumns,
    ];

    rows.push(row);
  }

  return rows;
};
