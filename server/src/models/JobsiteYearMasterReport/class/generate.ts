import {
  JobsiteYearMasterReportDocument,
  JobsiteYearReport,
  JobsiteYearMasterReportItemClass,
  JobsiteDocument,
} from "@models";
import { CrewTypes } from "@typescript/crew";
import { SupportedMimeTypes } from "@typescript/file";
import {
  CrewTypeOnSiteSummaryClass,
  OnSiteSummaryReportClass,
  RangeSummaryReportClass,
} from "@typescript/jobsiteReports";
import { Id } from "@typescript/models";
import errorHandler from "@utils/errorHandler";
import { getWorkbookBuffer } from "@utils/excel";
import { generateForMasterReport } from "@utils/excel";
import { uploadFile } from "@utils/fileStorage";

const full = async (
  jobsiteYearMasterReport: JobsiteYearMasterReportDocument
) => {
  const jobsiteYearReports = await JobsiteYearReport.getByDate(
    jobsiteYearMasterReport.startOfYear
  );

  const fullSummary: RangeSummaryReportClass = {
    externalExpenseInvoiceValue: 0,
    externalRevenueInvoiceValue: 0,
    internalExpenseInvoiceValue: 0,
    internalRevenueInvoiceValue: 0,
    accrualExpenseInvoiceValue: 0,
    accrualRevenueInvoiceValue: 0,
  };

  const allCrewTypes: CrewTypes[] = [];

  const reports: JobsiteYearMasterReportItemClass[] = [];
  const jobsiteList: { jobsite: JobsiteDocument; yearReportId: Id }[] = [];
  for (let i = 0; i < jobsiteYearReports.length; i++) {
    const jobsiteYearReport = jobsiteYearReports[i];

    let jobsite: JobsiteDocument | undefined = undefined;
    try {
      jobsite = await jobsiteYearReport.getJobsite();
    } catch (e) {
      errorHandler("Unable to find Jobsite Year Report jobsite", e);
    }

    if (jobsite) {
      jobsiteList.push({ jobsite, yearReportId: jobsiteYearReport._id });

      // Handle full summary

      fullSummary.externalExpenseInvoiceValue +=
        jobsiteYearReport.summary.externalExpenseInvoiceValue;
      fullSummary.externalRevenueInvoiceValue +=
        jobsiteYearReport.summary.externalRevenueInvoiceValue;
      fullSummary.internalExpenseInvoiceValue +=
        jobsiteYearReport.summary.internalExpenseInvoiceValue;
      fullSummary.internalRevenueInvoiceValue +=
        jobsiteYearReport.summary.internalRevenueInvoiceValue;
      fullSummary.accrualExpenseInvoiceValue +=
        jobsiteYearReport.summary.accrualExpenseInvoiceValue;
      fullSummary.accrualRevenueInvoiceValue +=
        jobsiteYearReport.summary.accrualRevenueInvoiceValue;

      // Handle rest

      const dayReports = await jobsiteYearReport.getDayReports();

      const crewTypeSummaries: CrewTypeOnSiteSummaryClass[] = [];
      const crewTypeIndices: { [crewType in CrewTypes]?: number } = {};

      const crewTypes = jobsiteYearReport.crewTypes;

      // Initialize crew type summaries
      for (let i = 0; i < crewTypes.length; i++) {
        crewTypeSummaries.push({
          crewType: crewTypes[i],
          employeeCost: 0,
          employeeHours: 0,
          materialCost: 0,
          materialQuantity: 0,
          truckingCost: 0,
          truckingHours: 0,
          truckingQuantity: 0,
          vehicleCost: 0,
          vehicleHours: 0,
          nonCostedMaterialQuantity: 0,
        });

        crewTypeIndices[crewTypes[i]] = crewTypeSummaries.length - 1;

        // Populate full crew types array
        if (!allCrewTypes.includes(crewTypes[i]))
          allCrewTypes.push(crewTypes[i]);
      }

      const summary: OnSiteSummaryReportClass = {
        crewTypeSummaries,
        employeeCost: 0,
        employeeHours: 0,
        materialCost: 0,
        materialQuantity: 0,
        nonCostedMaterialQuantity: 0,
        truckingCost: 0,
        truckingHours: 0,
        truckingQuantity: 0,
        vehicleCost: 0,
        vehicleHours: 0,
      };

      // Populate summary
      for (let i = 0; i < dayReports.length; i++) {
        const dayReport = dayReports[i];

        summary.employeeCost += dayReport.summary.employeeCost;
        summary.employeeHours += dayReport.summary.employeeHours;

        summary.materialCost += dayReport.summary.materialCost;
        summary.materialQuantity += dayReport.summary.materialQuantity;

        summary.vehicleCost += dayReport.summary.vehicleCost;
        summary.vehicleHours += dayReport.summary.vehicleHours;

        summary.truckingCost += dayReport.summary.truckingCost;
        summary.truckingHours += dayReport.summary.truckingCost;
        summary.truckingQuantity += dayReport.summary.truckingQuantity;

        summary.nonCostedMaterialQuantity +=
          dayReport.summary.nonCostedMaterialQuantity;

        // Populate crew types summaries
        for (let j = 0; j < dayReport.summary.crewTypeSummaries.length; j++) {
          const dayReportCrewTypeSummary =
            dayReport.summary.crewTypeSummaries[j];

          if (
            crewTypeIndices[dayReportCrewTypeSummary.crewType] !== undefined
          ) {
            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].employeeCost += dayReportCrewTypeSummary.employeeCost;
            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].employeeHours += dayReportCrewTypeSummary.employeeHours;

            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].materialCost += dayReportCrewTypeSummary.materialCost;
            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].materialQuantity += dayReportCrewTypeSummary.materialQuantity;

            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].vehicleCost += dayReportCrewTypeSummary.vehicleCost;
            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].vehicleHours += dayReportCrewTypeSummary.vehicleHours;

            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].truckingCost += dayReportCrewTypeSummary.truckingCost;
            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].truckingHours += dayReportCrewTypeSummary.truckingHours;
            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].truckingQuantity += dayReportCrewTypeSummary.truckingQuantity;

            summary.crewTypeSummaries[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              crewTypeIndices[dayReportCrewTypeSummary.crewType]!
            ].nonCostedMaterialQuantity +=
              dayReportCrewTypeSummary.nonCostedMaterialQuantity;
          }
        }
      }

      const report: JobsiteYearMasterReportItemClass = {
        report: jobsiteYearReport._id,
        summary,
      };

      reports.push(report);
    }
  }

  // Sort reports by jobsite number
  jobsiteList.sort(
    (a, b) => a.jobsite.jobcode?.localeCompare(b.jobsite.jobcode || "") || 0
  );

  const sortedReports: JobsiteYearMasterReportItemClass[] = [];
  for (let i = 0; i < jobsiteList.length; i++) {
    const yearReport = reports.find(
      (report) =>
        report.report?.toString() === jobsiteList[i].yearReportId?.toString()
    );
    if (yearReport) {
      sortedReports.push(yearReport);
    }
  }

  jobsiteYearMasterReport.summary = fullSummary;

  jobsiteYearMasterReport.reports = sortedReports;

  jobsiteYearMasterReport.crewTypes = allCrewTypes;

  return;
};

const excel = async (
  jobsiteYearMasterReport: JobsiteYearMasterReportDocument
) => {
  const workbook = await generateForMasterReport(jobsiteYearMasterReport);

  const buffer = await getWorkbookBuffer(workbook);

  await uploadFile(
    await jobsiteYearMasterReport.getExcelName(),
    buffer,
    SupportedMimeTypes.XLSX
  );
};

export default {
  full,
  excel,
};
