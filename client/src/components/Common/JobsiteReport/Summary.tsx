import { Code, Flex } from "@chakra-ui/react";
import React from "react";
import { useSystem } from "../../../contexts/System";
import {
  JobsiteMonthReportFullSnippetFragment,
  JobsiteYearReportFullSnippetFragment,
} from "../../../generated/graphql";
import ReportSummaryCard from "../ReportSummary";

interface IJobsiteReportSummary {
  report:
    | JobsiteMonthReportFullSnippetFragment
    | JobsiteYearReportFullSnippetFragment;
}

const JobsiteReportSummary = ({ report }: IJobsiteReportSummary) => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { system },
  } = useSystem();

  /**
   * ----- Variables -----
   */

  const overheadPercent = React.useMemo(() => {
    if (system) {
      return system.internalExpenseOverheadRate;
    } else return 10;
  }, [system]);

  const overheadRate = React.useMemo(() => {
    return 1 + overheadPercent / 100;
  }, [overheadPercent]);

  const internalExpenses = React.useMemo(() => {
    let expenses = 0;

    for (let i = 0; i < report.dayReports.length; i++) {
      const dayReport = report.dayReports[i];

      expenses += dayReport.summary.employeeCost;
      expenses += dayReport.summary.vehicleCost;
      expenses += dayReport.summary.materialCost;
      expenses += dayReport.summary.truckingCost;
    }

    return expenses;
  }, [report]);

  const totalExpenses = React.useMemo(() => {
    return (
      internalExpenses * overheadRate +
      report.summary.externalExpenseInvoiceValue * 1.03 +
      report.summary.internalExpenseInvoiceValue +
      report.summary.accrualExpenseInvoiceValue
    );
  }, [
    internalExpenses,
    overheadRate,
    report.summary.accrualExpenseInvoiceValue,
    report.summary.externalExpenseInvoiceValue,
    report.summary.internalExpenseInvoiceValue,
  ]);

  const netIncome = React.useMemo(() => {
    return (
      report.summary.externalRevenueInvoiceValue +
      report.summary.internalRevenueInvoiceValue -
      totalExpenses
    );
  }, [
    report.summary.externalRevenueInvoiceValue,
    report.summary.internalRevenueInvoiceValue,
    totalExpenses,
  ]);

  /**
   * ----- Rendering -----
   */

  return (
    <ReportSummaryCard
      revenue={{
        internal: report.summary.internalRevenueInvoiceValue,
        external: report.summary.externalRevenueInvoiceValue,
        accrual: report.summary.accrualRevenueInvoiceValue,
      }}
      revenueTooltip={
        <Flex flexDir="column">
          <Code backgroundColor="transparent" color="white">
            + Internal Revenue Invoices
          </Code>
          <Code backgroundColor="transparent" color="white">
            + External Revenue Invoices
          </Code>
        </Flex>
      }
      showRevenueBreakdown={false}
      internalExpenses={internalExpenses}
      internalExpensesTooltip={
        <Flex flexDir="column">
          <Code backgroundColor="transparent" color="white">
            + Wages
          </Code>
          <Code backgroundColor="transparent" color="white">
            + Equipment
          </Code>
          <Code backgroundColor="transparent" color="white">
            + Materials
          </Code>
          <Code backgroundColor="transparent" color="white">
            + Trucking
          </Code>
        </Flex>
      }
      netIncome={netIncome}
      netIncomeTooltip={
        <Flex flexDir="column">
          <Code backgroundColor="transparent" color="white">
            + Total Revenue
          </Code>
          <Code backgroundColor="transparent" color="white">
            - Total Expenses
          </Code>
        </Flex>
      }
      totalExpenses={totalExpenses}
      totalExpensesTooltip={
        <Flex flexDir="column">
          <Code backgroundColor="transparent" color="white">
            + Internal Expenses + {overheadPercent}%
          </Code>
          <Code backgroundColor="transparent" color="white">
            + External Invoices + 3%
          </Code>
          <Code backgroundColor="transparent" color="white">
            + Internal Invoices
          </Code>
        </Flex>
      }
      issues={report.issues}
      excelDownloadUrl={report.excelDownloadUrl}
      jobsiteId={report.jobsite._id}
    />
  );
};

export default JobsiteReportSummary;
