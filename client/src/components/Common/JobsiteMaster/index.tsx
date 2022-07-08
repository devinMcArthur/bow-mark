import React from "react";
import {
  Box,
  Code,
  Flex,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Table,
  Tbody,
  Tfoot,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import { JobsiteYearMasterReportFullSnippetFragment } from "../../../generated/graphql";
import JobsiteMasterRow from "./Row";
import formatNumber from "../../../utils/formatNumber";
import ReportSummaryCard from "../ReportSummary";
import { useSystem } from "../../../contexts/System";
import { FiCalendar } from "react-icons/fi";
import JobsiteMasterReportExcelGenerate from "../../Forms/JobsiteMasterReport/ExcelGenerate";

interface IJobsiteMaster {
  report: JobsiteYearMasterReportFullSnippetFragment;
}

const JobsiteMaster = ({ report }: IJobsiteMaster) => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { system },
  } = useSystem();

  const { isOpen, onOpen, onClose } = useDisclosure();

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

  const onSiteExpenses = React.useMemo(() => {
    let expenses = 0;
    for (let i = 0; i < report.reports.length; i++) {
      const { summary } = report.reports[i];

      expenses +=
        summary.employeeCost +
        summary.vehicleCost +
        summary.materialCost +
        summary.truckingCost;
    }

    return expenses;
  }, [report]);

  const crewTotals = React.useMemo(() => {
    const crewTotals: Record<
      string,
      {
        wages: number;
        equipment: number;
        materials: number;
        trucking: number;
      }
    > = {};

    for (let i = 0; i < report.crewTypes.length; i++) {
      crewTotals[report.crewTypes[i]] = {
        equipment: 0,
        materials: 0,
        trucking: 0,
        wages: 0,
      };
    }

    for (let i = 0; i < report.reports.length; i++) {
      const { summary } = report.reports[i];

      for (let j = 0; j < summary.crewTypeSummaries.length; j++) {
        const crewSummary = summary.crewTypeSummaries[j];
        const { crewType } = crewSummary;

        crewTotals[crewType].wages += crewSummary.employeeCost;
        crewTotals[crewType].equipment += crewSummary.vehicleCost;
        crewTotals[crewType].materials += crewSummary.materialCost;
        crewTotals[crewType].trucking += crewSummary.truckingCost;
      }
    }

    return crewTotals;
  }, [report]);

  const crewSummaryTotals = React.useMemo(() => {
    const summaryTotals = {
      wages: 0,
      equipment: 0,
      materials: 0,
      trucking: 0,
    };

    for (let i = 0; i < report.reports.length; i++) {
      summaryTotals.wages += report.reports[i].summary.employeeCost;
      summaryTotals.equipment += report.reports[i].summary.vehicleCost;
      summaryTotals.materials += report.reports[i].summary.materialCost;
      summaryTotals.trucking += report.reports[i].summary.truckingCost;
    }

    return summaryTotals;
  }, [report.reports]);

  const revenue = React.useMemo(() => {
    return (
      report.summary.externalRevenueInvoiceValue +
      report.summary.internalRevenueInvoiceValue
    );
  }, [report]);

  const totalExpenses = React.useMemo(() => {
    return (
      onSiteExpenses * overheadRate +
      report.summary.externalExpenseInvoiceValue * 1.03 +
      report.summary.internalExpenseInvoiceValue +
      report.summary.accrualExpenseInvoiceValue
    );
  }, [
    onSiteExpenses,
    overheadRate,
    report.summary.accrualExpenseInvoiceValue,
    report.summary.externalExpenseInvoiceValue,
    report.summary.internalExpenseInvoiceValue,
  ]);

  const netIncome = React.useMemo(() => {
    return revenue - totalExpenses;
  }, [revenue, totalExpenses]);

  const margin = React.useMemo(() => {
    return (netIncome / totalExpenses) * 100 || 0;
  }, [netIncome, totalExpenses]);

  const marginMinusConcrete = React.useMemo(() => {
    return (
      (netIncome /
        (totalExpenses - report.summary.internalExpenseInvoiceValue)) *
        100 || 0
    );
  }, [report, netIncome, totalExpenses]);

  /**
   * ----- Rendering -----
   */

  const totalExpensesTooltip = (
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
      <Code backgroundColor="transparent" color="white">
        + Accrual Invoices
      </Code>
    </Flex>
  );

  return (
    <Box>
      <Box p={2}>
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
              <Code backgroundColor="transparent" color="white">
                + Accrual Revenue Invoices
              </Code>
            </Flex>
          }
          internalExpenses={onSiteExpenses}
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
          expenseInvoices={{
            external: report.summary.externalExpenseInvoiceValue,
            internal: report.summary.internalExpenseInvoiceValue,
            accrual: report.summary.accrualExpenseInvoiceValue,
          }}
          totalExpenses={totalExpenses}
          totalExpensesTooltip={totalExpensesTooltip}
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
          excelDownloadUrl={report.excelDownloadUrl}
          extraButtons={[
            <Box key={1}>
              <IconButton
                icon={<FiCalendar />}
                aria-label="create report"
                backgroundColor="transparent"
                onClick={() => onOpen()}
              />
              <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                  <ModalHeader>Create Excel</ModalHeader>
                  <ModalCloseButton />
                  <ModalBody>
                    <JobsiteMasterReportExcelGenerate />
                  </ModalBody>
                </ModalContent>
              </Modal>
            </Box>,
          ]}
        />
      </Box>
      <Box
        w="100%"
        overflowY="scroll"
        backgroundColor="gray.200"
        borderRadius={6}
        maxH="55vh"
      >
        <Table id="jobsite-report-table">
          <Thead>
            <Tr>
              <Th scope="row"></Th>
              <Th></Th>
              <Th></Th>
              <Th></Th>
              <Th></Th>
              <Th></Th>
              <Th></Th>
              <Th></Th>
              <Th></Th>
              <Th>Sub Contractors</Th>
              <Th></Th>
              <Th></Th>
              <Th>Crew Totals</Th>
              <Th></Th>
              <Th></Th>
              <Th></Th>
              {report.crewTypes.map((crew) => (
                <>
                  <Th>{crew}</Th>
                  <Th></Th>
                  <Th></Th>
                  <Th></Th>
                </>
              ))}
            </Tr>
            <Tr>
              <Th scope="row">Jobsite</Th>
              <Th isNumberic>Accruals</Th>
              <Th isNumeric>Revenue</Th>
              <Th isNumeric>
                <Tooltip label="Employees, equipment, materials and trucking">
                  Expenses
                </Tooltip>
              </Th>
              <Th isNumeric>
                <Tooltip label={`${overheadPercent}% of Expenses`}>
                  Overhead
                </Tooltip>
              </Th>

              <Th isNumeric>
                <Tooltip label={totalExpensesTooltip}>Total Expenses</Tooltip>
              </Th>
              <Th isNumeric>Net Income</Th>
              <Th isNumeric>%</Th>
              <Th isNumeric>
                <Tooltip label="Profit margin without internal invoices">
                  % minus internal
                </Tooltip>
              </Th>
              <Th isNumeric>Internal</Th>
              <Th isNumeric>External</Th>
              <Th isNumeric>Accrual</Th>
              <Th isNumeric>Wages</Th>
              <Th isNumeric>Equipment</Th>
              <Th isNumeric>Materials</Th>
              <Th isNumeric>Trucking</Th>
              {report.crewTypes.map(() => (
                <>
                  <Th isNumeric>Wages</Th>
                  <Th isNumeric>Equipment</Th>
                  <Th isNumeric>Materials</Th>
                  <Th isNumeric>Trucking</Th>
                </>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {report.reports.map((reportItem) => (
              <JobsiteMasterRow
                reportItem={reportItem}
                crewTypes={report.crewTypes}
                key={reportItem._id}
              />
            ))}
          </Tbody>
          <Tfoot>
            <Tr>
              <Th scope="row">Totals</Th>
              <Th isNumeric>
                ${formatNumber(report.summary.accrualRevenueInvoiceValue)}
              </Th>
              <Th isNumeric>${formatNumber(revenue)}</Th>
              <Th isNumeric>${formatNumber(onSiteExpenses)}</Th>
              <Th isNumeric>${formatNumber(onSiteExpenses * 0.1)}</Th>
              <Th isNumeric>${formatNumber(totalExpenses)}</Th>
              <Th isNumeric color={netIncome < 0 ? "red.500" : undefined}>
                ${formatNumber(netIncome)}
              </Th>
              <Th isNumeric color={margin < 0 ? "red.500" : undefined}>
                %{formatNumber(margin)}
              </Th>
              <Th
                isNumeric
                color={marginMinusConcrete < 0 ? "red.500" : undefined}
              >
                %{formatNumber(marginMinusConcrete)}
              </Th>
              <Th isNumeric>
                ${formatNumber(report.summary.internalExpenseInvoiceValue || 0)}
              </Th>
              <Th isNumeric>
                ${formatNumber(report.summary.externalExpenseInvoiceValue || 0)}
              </Th>
              <Th isNumeric>
                ${formatNumber(report.summary.accrualExpenseInvoiceValue || 0)}
              </Th>
              <Th isNumeric>${formatNumber(crewSummaryTotals.wages)}</Th>
              <Th isNumeric>${formatNumber(crewSummaryTotals.equipment)}</Th>
              <Th isNumeric>${formatNumber(crewSummaryTotals.materials)}</Th>
              <Th isNumeric>${formatNumber(crewSummaryTotals.trucking)}</Th>
              {Object.values(crewTotals).map((totals) => (
                <>
                  <Th isNumeric>${formatNumber(totals.wages)}</Th>
                  <Th isNumeric>${formatNumber(totals.equipment)}</Th>
                  <Th isNumeric>${formatNumber(totals.materials)}</Th>
                  <Th isNumeric>${formatNumber(totals.trucking)}</Th>
                </>
              ))}
            </Tr>
          </Tfoot>
        </Table>
      </Box>
    </Box>
  );
};

export default JobsiteMaster;
