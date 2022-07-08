import { JobsiteYearReportDocument } from "@models";
import { SupportedMimeTypes } from "@typescript/file";
import { InvoiceReportClass } from "@typescript/invoice";
import { RangeSummaryReportClass } from "@typescript/jobsiteReports";
import { generateForRangeReport, getWorkbookBuffer } from "@utils/excel";
import { uploadFile } from "@utils/fileStorage";
import {
  dayReportIssueGeneration,
  jobsiteReportIssueGenerator,
} from "@utils/jobsiteReports/issues";
import dayjs from "dayjs";

const expenseInvoiceReports = async (
  jobsiteYearReport: JobsiteYearReportDocument
) => {
  // Get all expense invoices
  const jobsite = await jobsiteYearReport.getJobsite();
  const expenseInvoices = await jobsite.getExpenseInvoices();

  const invoices: InvoiceReportClass[] = [];
  for (let i = 0; i < expenseInvoices.length; i++) {
    const expenseInvoice = expenseInvoices[i];

    if (
      dayjs(expenseInvoice.date).isSame(
        dayjs(jobsiteYearReport.startOfYear),
        "year"
      )
    ) {
      const invoice: InvoiceReportClass = {
        invoice: expenseInvoice._id,
        value: expenseInvoice.cost,
        internal: expenseInvoice.internal,
        accrual: expenseInvoice.accrual,
      };

      invoices.push(invoice);
    }
  }

  jobsiteYearReport.expenseInvoices = invoices;

  return;
};

const revenueInvoiceReports = async (
  jobsiteYearReport: JobsiteYearReportDocument
) => {
  // Get all revenue invoices
  const jobsite = await jobsiteYearReport.getJobsite();
  const revenueInvoices = await jobsite.getRevenueInvoices();

  const invoices: InvoiceReportClass[] = [];
  for (let i = 0; i < revenueInvoices.length; i++) {
    const revenueInvoice = revenueInvoices[i];

    if (
      dayjs(revenueInvoice.date).isSame(
        dayjs(jobsiteYearReport.startOfYear),
        "year"
      )
    ) {
      const invoice: InvoiceReportClass = {
        invoice: revenueInvoice._id,
        value: revenueInvoice.cost,
        internal: revenueInvoice.internal,
        accrual: revenueInvoice.accrual,
      };

      invoices.push(invoice);
    }
  }

  jobsiteYearReport.revenueInvoices = invoices;

  return;
};

const summary = async (jobsiteYearReport: JobsiteYearReportDocument) => {
  let externalExpenseInvoiceValue = 0,
    internalExpenseInvoiceValue = 0,
    accrualExpenseInvoiceValue = 0;
  for (let i = 0; i < jobsiteYearReport.expenseInvoices.length; i++) {
    if (jobsiteYearReport.expenseInvoices[i].accrual) {
      accrualExpenseInvoiceValue += jobsiteYearReport.expenseInvoices[i].value;
    } else if (jobsiteYearReport.expenseInvoices[i].internal) {
      internalExpenseInvoiceValue += jobsiteYearReport.expenseInvoices[i].value;
    } else {
      externalExpenseInvoiceValue += jobsiteYearReport.expenseInvoices[i].value;
    }
  }

  let externalRevenueInvoiceValue = 0,
    internalRevenueInvoiceValue = 0,
    accrualRevenueInvoiceValue = 0;
  for (let i = 0; i < jobsiteYearReport.revenueInvoices.length; i++) {
    if (jobsiteYearReport.revenueInvoices[i].accrual) {
      accrualRevenueInvoiceValue += jobsiteYearReport.revenueInvoices[i].value;
    } else if (jobsiteYearReport.revenueInvoices[i].internal) {
      internalRevenueInvoiceValue += jobsiteYearReport.revenueInvoices[i].value;
    } else {
      externalRevenueInvoiceValue += jobsiteYearReport.revenueInvoices[i].value;
    }
  }

  const summary: RangeSummaryReportClass = {
    externalExpenseInvoiceValue,
    internalExpenseInvoiceValue,
    accrualExpenseInvoiceValue,
    externalRevenueInvoiceValue,
    internalRevenueInvoiceValue,
    accrualRevenueInvoiceValue,
  };

  jobsiteYearReport.summary = summary;

  return;
};

const issues = async (jobsiteYearReport: JobsiteYearReportDocument) => {
  const dayReports = await jobsiteYearReport.getDayReports();

  jobsiteYearReport.issues = [
    ...dayReportIssueGeneration(dayReports),
    ...(await jobsiteReportIssueGenerator(
      await jobsiteYearReport.getJobsite(),
      {
        startTime: jobsiteYearReport.startOfYear,
        endTime: dayjs(jobsiteYearReport.startOfYear).endOf("year").toDate(),
      }
    )),
  ];
};

const excel = async (jobsiteYearReport: JobsiteYearReportDocument) => {
  const workbook = await generateForRangeReport(jobsiteYearReport);

  const buffer = await getWorkbookBuffer(workbook);

  await uploadFile(
    await jobsiteYearReport.getExcelName(),
    buffer,
    SupportedMimeTypes.XLSX
  );
};

export default {
  expenseInvoiceReports,
  revenueInvoiceReports,
  summary,
  issues,
  excel,
};
