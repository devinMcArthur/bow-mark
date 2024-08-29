import {
  Box,
  Heading,
  Table,
  TableCaption,
  Tbody,
  Tfoot,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import React from "react";
import formatNumber from "../../../utils/formatNumber";
import Card from "../../Common/Card";

import {
  JobsiteMonthReportNoFetchSnippetFragment,
  JobsiteYearReportNoFetchSnippetFragment,
} from "../../../generated/graphql";
import JobsiteReportInvoiceSummary from "./InvoiceSummary";

interface IJobsiteReportExpenseInvoices {
  report:
  | JobsiteMonthReportNoFetchSnippetFragment
  | JobsiteYearReportNoFetchSnippetFragment;
}

const JobsiteReportExpenseInvoices = ({
  report,
}: IJobsiteReportExpenseInvoices) => {
  /**
   * ----- Hook Initialization -----
   */

  const [collapsed, setCollapsed] = React.useState(true);

  /**
   * ----- Rendering -----
   */

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
        <Box
          w="100%"
          overflowX="scroll"
          backgroundColor="gray.200"
          borderRadius={4}
          m={2}
        >
          <Table variant="striped" colorScheme="red">
            <TableCaption>Expense costing</TableCaption>
            <Thead>
              <Tr>
                <Th>Invoice</Th>
                <Th isNumeric>Cost</Th>
              </Tr>
            </Thead>
            <Tbody>
              {report.expenseInvoices.map((reports) => (
                <Tr key={reports._id}>
                  <Th>
                    {reports.invoice.company.name}{" "}
                    {reports.invoice.invoiceNumber}{" "}
                    {reports.invoice.internal && "(internal)"}
                  </Th>
                  <Th isNumeric>${formatNumber(reports.value)}</Th>
                </Tr>
              ))}
            </Tbody>
            <Tfoot>
              <Tr>
                <Th>Totals</Th>
                <Th isNumeric>
                  $
                  {formatNumber(
                    report.summary.externalExpenseInvoiceValue +
                    report.summary.internalExpenseInvoiceValue
                  )}
                </Th>
              </Tr>
            </Tfoot>
          </Table>
        </Box>
      )}
    </Card>
  );
};

export default JobsiteReportExpenseInvoices;
