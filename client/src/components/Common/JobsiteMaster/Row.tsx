import { Box, Flex, Th, Tr, Td, Text } from "@chakra-ui/react";
import React from "react";
import { useSystem } from "../../../contexts/System";
import {
  CrewTypes,
  JobsiteYearMasterReportItemSnippetFragment,
  useJobsiteYearReportSummaryQuery,
} from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import formatNumber from "../../../utils/formatNumber";
import JobsiteReportIssues from "../JobsiteReport/Issues";
import Loading from "../Loading";
import TextLink from "../TextLink";

interface IJobsiteMasterRow {
  reportItem: JobsiteYearMasterReportItemSnippetFragment;
  crewTypes: CrewTypes[];
}

const JobsiteMasterRow = ({ reportItem, crewTypes }: IJobsiteMasterRow) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading } = useJobsiteYearReportSummaryQuery({
    variables: {
      id: reportItem.report._id,
    },
  });

  const {
    state: { system },
  } = useSystem();

  /**
   * ----- Variables -----
   */

  const overheadRate = React.useMemo(() => {
    if (system) {
      return 1 + system.internalExpenseOverheadRate / 100;
    } else return 0.1;
  }, [system]);

  const jobsiteYearReport = React.useMemo(() => {
    if (data?.jobsiteYearReport && !loading) return data?.jobsiteYearReport;
    else return undefined;
  }, [data?.jobsiteYearReport, loading]);

  const revenue = React.useMemo(() => {
    if (jobsiteYearReport) {
      return (
        jobsiteYearReport.summary.externalRevenueInvoiceValue +
        jobsiteYearReport.summary.internalRevenueInvoiceValue
      );
    } else return 0;
  }, [jobsiteYearReport]);

  const onSiteExpenses = React.useMemo(() => {
    return (
      reportItem.summary.employeeCost +
      reportItem.summary.vehicleCost +
      reportItem.summary.materialCost +
      reportItem.summary.truckingCost
    );
  }, [reportItem.summary]);

  const totalExpenses = React.useMemo(() => {
    if (jobsiteYearReport) {
      return (
        onSiteExpenses * overheadRate +
        jobsiteYearReport.summary.externalExpenseInvoiceValue * 1.03 +
        jobsiteYearReport.summary.internalExpenseInvoiceValue
      );
    } else return 0;
  }, [jobsiteYearReport, onSiteExpenses, overheadRate]);

  const netIncome = React.useMemo(() => {
    return revenue - totalExpenses;
  }, [revenue, totalExpenses]);

  const margin = React.useMemo(() => {
    return (netIncome / totalExpenses) * 100 || 0;
  }, [netIncome, totalExpenses]);

  const marginMinusConcrete = React.useMemo(() => {
    if (jobsiteYearReport) {
      return (
        (netIncome /
          (totalExpenses -
            jobsiteYearReport.summary.internalExpenseInvoiceValue)) *
          100 || 0
      );
    } else return 0;
  }, [jobsiteYearReport, netIncome, totalExpenses]);

  /**
   * ----- Rendering -----
   */

  return (
    <Tr filter={loading ? "blur(2px)" : undefined}>
      <Th scope="row" textOverflow="ellipsis">
        {jobsiteYearReport ? (
          <Flex flexDir="row">
            <TextLink
              link={createLink.jobsiteYearReport(jobsiteYearReport._id)}
              whiteSpace="nowrap"
              textOverflow="ellipsis"
            >
              {jobsiteYearReport.jobsite.jobcode}
              <Text as="span" display={["none", "none", "none", "inline"]}>
                {" "}
                - {jobsiteYearReport.jobsite.name}
              </Text>
            </TextLink>
            {jobsiteYearReport.issues && (
              <Box ml={1}>
                <JobsiteReportIssues issues={jobsiteYearReport.issues} />
              </Box>
            )}
          </Flex>
        ) : (
          <Loading />
        )}
      </Th>
      <Td isNumeric>
        $
        {formatNumber(
          jobsiteYearReport?.summary.accrualRevenueInvoiceValue || 0
        )}
      </Td>
      <Td isNumeric>${formatNumber(revenue)}</Td>
      <Td isNumeric>${formatNumber(onSiteExpenses)}</Td>
      <Td isNumeric>${formatNumber(onSiteExpenses * (overheadRate - 1))}</Td>
      <Td isNumeric>${formatNumber(totalExpenses)}</Td>
      <Td isNumeric color={netIncome < 0 ? "red.500" : undefined}>
        ${formatNumber(netIncome)}
      </Td>
      <Td isNumeric color={margin < 0 ? "red.500" : undefined}>
        %{formatNumber(margin)}
      </Td>

      <Td isNumeric color={marginMinusConcrete < 0 ? "red.500" : undefined}>
        %{formatNumber(marginMinusConcrete)}
      </Td>
      <Td isNumeric>
        $
        {formatNumber(
          jobsiteYearReport?.summary.internalExpenseInvoiceValue || 0
        )}
      </Td>
      <Td isNumeric>
        $
        {formatNumber(
          jobsiteYearReport?.summary.externalExpenseInvoiceValue || 0
        )}
      </Td>
      <Td isNumeric>
        $
        {formatNumber(
          jobsiteYearReport?.summary.accrualExpenseInvoiceValue || 0
        )}
      </Td>
      <Td isNumeric>${formatNumber(reportItem.summary.employeeCost)}</Td>
      <Td isNumeric>${formatNumber(reportItem.summary.vehicleCost)}</Td>
      <Td isNumeric>${formatNumber(reportItem.summary.materialCost)}</Td>
      <Td isNumeric>${formatNumber(reportItem.summary.truckingCost)}</Td>
      {crewTypes.map((crew) => (
        <>
          <Td isNumeric>
            $
            {formatNumber(
              reportItem.summary.crewTypeSummaries.find(
                (summary) => summary.crewType === crew
              )?.employeeCost || 0
            )}
          </Td>
          <Td isNumeric>
            $
            {formatNumber(
              reportItem.summary.crewTypeSummaries.find(
                (summary) => summary.crewType === crew
              )?.vehicleCost || 0
            )}
          </Td>
          <Td isNumeric>
            $
            {formatNumber(
              reportItem.summary.crewTypeSummaries.find(
                (summary) => summary.crewType === crew
              )?.materialCost || 0
            )}
          </Td>
          <Td isNumeric>
            $
            {formatNumber(
              reportItem.summary.crewTypeSummaries.find(
                (summary) => summary.crewType === crew
              )?.truckingCost || 0
            )}
          </Td>
        </>
      ))}
    </Tr>
  );
};

export default JobsiteMasterRow;
