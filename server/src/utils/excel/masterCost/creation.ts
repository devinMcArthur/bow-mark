import ExcelJS from "exceljs";
import {
  JobsiteYearMasterReportDocument,
  JobsiteYearMasterReportItemClass,
  JobsiteYearReport,
  JobsiteYearReportDocument,
  System,
} from "@models";
import {
  generateMasterTable,
  IMasterRow,
  MasterCrewTotals,
} from "../masterTable";

export const generateForMasterReport = async (
  jobsiteYearMasterReport: JobsiteYearMasterReportDocument
) => {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("Master Cost");

  await generateTable(worksheet, jobsiteYearMasterReport);

  return workbook;
};

interface IYearReportItem
  extends Omit<JobsiteYearMasterReportItemClass, "report"> {
  report: JobsiteYearReportDocument;
}

const generateTable = async (
  worksheet: ExcelJS.Worksheet,
  jobsiteYearMasterReport: JobsiteYearMasterReportDocument
) => {
  const jobsiteYearReports: IYearReportItem[] = [];
  for (let i = 0; i < jobsiteYearMasterReport.reports.length; i++) {
    const jobsiteYearReport = await JobsiteYearReport.getById(
      jobsiteYearMasterReport.reports[i].report?.toString() || ""
    );
    if (jobsiteYearReport)
      jobsiteYearReports.push({
        report: jobsiteYearReport,
        summary: jobsiteYearMasterReport.reports[i].summary,
      });
  }

  await generateMasterTable(
    worksheet,
    jobsiteYearMasterReport.crewTypes,
    await generateRows(jobsiteYearReports)
  );

  return worksheet;
};

const generateRows = async (
  jobsiteYearReports: IYearReportItem[]
): Promise<IMasterRow[]> => {
  const rows: IMasterRow[] = [];

  const system = await System.getSystem();

  for (let i = 0; i < jobsiteYearReports.length; i++) {
    const jobsiteYearReportItem = jobsiteYearReports[i];
    const jobsiteYearReport = jobsiteYearReportItem.report;

    const jobsite = await jobsiteYearReport.getJobsite();

    const revenue =
      jobsiteYearReport.summary.externalRevenueInvoiceValue +
      jobsiteYearReport.summary.internalRevenueInvoiceValue;

    const onSiteExpenses =
      jobsiteYearReportItem.summary.employeeCost +
      jobsiteYearReportItem.summary.vehicleCost +
      jobsiteYearReportItem.summary.materialCost +
      jobsiteYearReportItem.summary.truckingCost;

    const overhead =
      onSiteExpenses * (1 + (system.internalExpenseOverheadRate || 10) / 100);

    const totalExpenses =
      overhead +
      jobsiteYearReport.summary.externalExpenseInvoiceValue * 1.03 +
      jobsiteYearReport.summary.internalExpenseInvoiceValue;

    const netIncome = revenue - totalExpenses;

    const margin = totalExpenses > 0 ? (netIncome / totalExpenses) * 100 : 0;

    const marginMinusInternal =
      totalExpenses - jobsiteYearReport.summary.internalExpenseInvoiceValue > 0
        ? (netIncome /
            (totalExpenses -
              jobsiteYearReport.summary.internalExpenseInvoiceValue)) *
          100
        : 0;

    // Handle Crew Type Costs
    const crewColumns: MasterCrewTotals = {} as MasterCrewTotals;
    for (
      let j = 0;
      j < jobsiteYearReportItem.summary.crewTypeSummaries.length;
      j++
    ) {
      const crewSummary = jobsiteYearReportItem.summary.crewTypeSummaries[j];

      crewColumns[crewSummary.crewType] = {
        wages: crewSummary.employeeCost,
        equipment: crewSummary.vehicleCost,
        materials: crewSummary.materialCost,
        trucking: crewSummary.truckingCost,
      };
    }

    const row: IMasterRow = {
      jobsiteName: `${jobsite.jobcode} - ${jobsite.name}`,
      revenue,
      expenses: onSiteExpenses,
      overhead,
      totalExpenses,
      netIncome,
      margin,
      marginMinusInternal,
      internalSubs: jobsiteYearReport.summary.internalExpenseInvoiceValue,
      externalSubs: jobsiteYearReport.summary.externalExpenseInvoiceValue,
      totalWages: jobsiteYearReportItem.summary.employeeCost,
      totalEquipment: jobsiteYearReportItem.summary.vehicleCost,
      totalMaterials: jobsiteYearReportItem.summary.materialCost,
      totalTrucking: jobsiteYearReportItem.summary.truckingCost,
      crewTotals: crewColumns,
    };

    rows.push(row);
  }

  return rows;
};
