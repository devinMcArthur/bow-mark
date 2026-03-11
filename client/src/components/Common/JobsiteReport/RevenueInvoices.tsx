// client/src/components/Common/JobsiteReport/RevenueInvoices.tsx
import { Box, Heading } from "@chakra-ui/react";
import React from "react";
import {
  JobsiteMonthReportNoFetchSnippetFragment,
  JobsiteYearReportNoFetchSnippetFragment,
} from "../../../generated/graphql";
import Card from "../../Common/Card";
import InvoiceTable from "./InvoiceTable";
import JobsiteReportInvoiceSummary from "./InvoiceSummary";

interface IJobsiteReportRevenueInvoices {
  report:
    | JobsiteMonthReportNoFetchSnippetFragment
    | JobsiteYearReportNoFetchSnippetFragment;
}

const JobsiteReportRevenueInvoices = ({
  report,
}: IJobsiteReportRevenueInvoices) => {
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
          Revenue Invoices ({report.revenueInvoices.length})
        </Heading>
      }
    >
      <Box m={2}>
        <JobsiteReportInvoiceSummary invoices={report.revenueInvoices} />
      </Box>
      {!collapsed && (
        <Box m={2}>
          <InvoiceTable
            invoices={report.revenueInvoices}
            caption="Revenue costing"
            colorScheme="green"
          />
        </Box>
      )}
    </Card>
  );
};

export default JobsiteReportRevenueInvoices;
