// client/src/components/Common/JobsiteReport/ExpenseInvoices.tsx
import { Box, Heading } from "@chakra-ui/react";
import React from "react";
import {
  JobsiteMonthReportNoFetchSnippetFragment,
  JobsiteYearReportNoFetchSnippetFragment,
} from "../../../generated/graphql";
import Card from "../../Common/Card";
import InvoiceTable from "./InvoiceTable";
import JobsiteReportInvoiceSummary from "./InvoiceSummary";

interface IJobsiteReportExpenseInvoices {
  report:
    | JobsiteMonthReportNoFetchSnippetFragment
    | JobsiteYearReportNoFetchSnippetFragment;
}

const JobsiteReportExpenseInvoices = ({
  report,
}: IJobsiteReportExpenseInvoices) => {
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <Card
      heading={
        <Heading
          size="md"
          m={2}
          w="100%"
          cursor="pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          Expense Invoices ({report.expenseInvoices.length})
        </Heading>
      }
    >
      <Box m={2}>
        <JobsiteReportInvoiceSummary invoices={report.expenseInvoices} />
      </Box>
      {!collapsed && (
        <Box m={2}>
          <InvoiceTable
            invoices={report.expenseInvoices}
            caption="Expense costing"
            colorScheme="red"
          />
        </Box>
      )}
    </Card>
  );
};

export default JobsiteReportExpenseInvoices;
