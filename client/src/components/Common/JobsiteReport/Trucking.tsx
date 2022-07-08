import {
  Box,
  Table,
  TableCaption,
  Tbody,
  Tfoot,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import React from "react";
import {
  CrewTypes,
  JobsiteDayReportTruckingSnippetFragment,
  JobsiteDayReportFullSnippetFragment,
} from "../../../generated/graphql";
import formatDate from "../../../utils/formatDate";
import formatNumber from "../../../utils/formatNumber";

interface ITrucking {
  truckingType: string;
  reports: (JobsiteDayReportTruckingSnippetFragment | null)[];
  totalHours: number;
  totalQuantity: number;
  totalCost: number;
}

interface IJobsiteReportTruckingReports {
  dayReports: JobsiteDayReportFullSnippetFragment[];
  crewType: CrewTypes;
}

const JobsiteReportTruckingReports = ({
  dayReports,
  crewType,
}: IJobsiteReportTruckingReports) => {
  /**
   * ----- Variables -----
   */

  /**
   * @desc all reports w/ employee reports for the crew type
   */

  const relevantReports: JobsiteDayReportFullSnippetFragment[] =
    React.useMemo(() => {
      return dayReports
        .filter(
          (report) =>
            report.trucking.length > 0 &&
            report.trucking
              .map((trucking) => trucking.crewType)
              .includes(crewType)
        )
        .sort((a, b) => b.date - a.date);
    }, [crewType, dayReports]);

  /**
   * @desc catalog of all trucking and their reports
   */
  const truckingReports: ITrucking[] = React.useMemo(() => {
    const trucking: ITrucking[] = [];

    // Instantiate trucking
    for (let i = 0; i < relevantReports.length; i++) {
      const report = relevantReports[i];

      for (let j = 0; j < report.trucking.length; j++) {
        const truckingReport = report.trucking[j];

        // Only add if crewType matches
        if (truckingReport.crewType === crewType) {
          const existingIndex = trucking.findIndex(
            (trucking) => trucking.truckingType === truckingReport.truckingType
          );

          if (existingIndex === -1) {
            trucking.push({
              truckingType: truckingReport.truckingType,
              reports: [],
              totalCost: 0,
              totalHours: 0,
              totalQuantity: 0,
            });
          }
        }
      }
    }

    // Populate reports
    for (let i = 0; i < relevantReports.length; i++) {
      const report = relevantReports[i];

      const populatedReportIndices: number[] = [];
      for (let j = 0; j < report.trucking.length; j++) {
        const truckingReport = report.trucking[j];

        // Only add if crewType matches
        if (truckingReport.crewType === crewType) {
          const existingIndex = trucking.findIndex(
            (trucking) => trucking.truckingType === truckingReport.truckingType
          );

          if (existingIndex !== -1) {
            trucking[existingIndex].reports.push(truckingReport);
            populatedReportIndices.push(existingIndex);
          }
        }
      }

      // Set null for each employee report that wasn't seen
      if (populatedReportIndices.length > 0)
        for (let j = 0; j < trucking.length; j++) {
          if (!populatedReportIndices.includes(j)) {
            trucking[j].reports.push(null);
          }
        }
    }

    // Generate totals
    for (let i = 0; i < trucking.length; i++) {
      const reports = trucking[i];

      let totalHours = 0,
        totalCost = 0,
        totalQuantity = 0;
      for (let j = 0; j < reports.reports.length; j++) {
        const report = reports.reports[j];

        if (report) {
          totalHours += report.hours || 0;
          totalCost += (report.hours || 0) * report.rate;
          totalQuantity += report.quantity;
        }
      }

      reports.totalCost = totalCost;
      reports.totalHours = totalHours;
      reports.totalQuantity = totalQuantity;
    }

    return trucking;
  }, [crewType, relevantReports]);

  const totals: { hours: number; quantity: number; cost: number } =
    React.useMemo(() => {
      let totalHours = 0,
        totalCost = 0,
        totalQuantity = 0;
      for (let i = 0; i < truckingReports.length; i++) {
        totalHours += truckingReports[i].totalHours;
        totalCost += truckingReports[i].totalCost;
        totalQuantity += truckingReports[i].totalQuantity;
      }
      return {
        hours: totalHours,
        cost: totalCost,
        quantity: totalQuantity,
      };
    }, [truckingReports]);

  /**
   * ----- Rendering -----
   */

  return (
    <Box
      w="100%"
      overflowX="scroll"
      backgroundColor="gray.200"
      borderRadius={4}
      m={2}
    >
      <Table variant="striped" colorScheme="red">
        <TableCaption>Trucking costing for {crewType} crew</TableCaption>
        <Thead>
          <Tr>
            <Th>Trucking</Th>
            <Th isNumeric>Quantity (Hours)</Th>
            <Th whiteSpace="break-spaces" isNumeric>
              Total Cost
            </Th>
            {relevantReports.map((report, index) => (
              <Th isNumeric key={index} whiteSpace="pre-wrap">
                {formatDate(report.date, "MMM D")}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {truckingReports.map((reports) => (
            <Tr key={reports.truckingType}>
              <Th>{reports.truckingType}</Th>
              <Th isNumeric>
                {formatNumber(reports.totalQuantity)} (
                {formatNumber(reports.totalHours)})
              </Th>
              <Th isNumeric>${formatNumber(reports.totalCost)}</Th>
              {reports.reports.map((report) => (
                <Th isNumeric key={report?._id}>
                  {report ? (
                    <>
                      {formatNumber(report.quantity)}{" "}
                      {`(${formatNumber(report.hours || 0)})`}
                    </>
                  ) : (
                    ""
                  )}
                </Th>
              ))}
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr>
            <Th>Totals</Th>
            <Th isNumeric>
              {formatNumber(totals.quantity)} ({formatNumber(totals.hours)})
            </Th>
            <Th isNumeric>${formatNumber(totals.cost)}</Th>
            {relevantReports.map((report) => {
              const summary = report.summary.crewTypeSummaries.find(
                (summary) => summary.crewType === crewType
              );

              return (
                <Th isNumeric key={report._id}>
                  {summary ? (
                    <>
                      {formatNumber(summary.truckingQuantity)} (
                      {formatNumber(summary.truckingHours)})
                    </>
                  ) : (
                    ""
                  )}
                </Th>
              );
            })}
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
};

export default JobsiteReportTruckingReports;
