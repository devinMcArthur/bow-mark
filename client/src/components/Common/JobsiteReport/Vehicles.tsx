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
  VehicleCardSnippetFragment,
  JobsiteDayReportVehicleSnippetFragment,
  JobsiteDayReportFullSnippetFragment,
} from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import formatDate from "../../../utils/formatDate";
import formatNumber from "../../../utils/formatNumber";
import TextLink from "../../Common/TextLink";

interface IVehicle {
  vehicle: VehicleCardSnippetFragment;
  reports: (JobsiteDayReportVehicleSnippetFragment | null)[];
  totalHours: number;
  totalCost: number;
}

interface IJobsiteReportVehicleReports {
  dayReports: JobsiteDayReportFullSnippetFragment[];
  crewType: CrewTypes;
}

const JobsiteReportVehicleReports = ({
  dayReports,
  crewType,
}: IJobsiteReportVehicleReports) => {
  /**
   * ----- Variables -----
   */

  /**
   * @desc all reports w/ vehicle reports for the crew type
   */
  const relevantReports: JobsiteDayReportFullSnippetFragment[] =
    React.useMemo(() => {
      return dayReports
        .filter(
          (report) =>
            report.vehicles.length > 0 &&
            report.vehicles
              .map((vehicle) => vehicle.crewType)
              .includes(crewType)
        )
        .sort((a, b) => b.date - a.date);
    }, [crewType, dayReports]);

  /**
   * @desc catalog of all vehicles and their reports
   */
  const vehicleReports: IVehicle[] = React.useMemo(() => {
    const vehicles: IVehicle[] = [];

    // Instantiate vehicles
    for (let i = 0; i < relevantReports.length; i++) {
      const report = relevantReports[i];

      for (let j = 0; j < report.vehicles.length; j++) {
        const vehicleReport = report.vehicles[j];

        // Only add if crewType matches
        if (vehicleReport.crewType === crewType) {
          const existingIndex = vehicles.findIndex(
            (vehicle) => vehicle.vehicle._id === vehicleReport.vehicle?._id
          );

          if (existingIndex === -1) {
            vehicles.push({
              vehicle: vehicleReport.vehicle!,
              reports: [],
              totalCost: 0,
              totalHours: 0,
            });
          }
        }
      }
    }

    // Populate reports
    for (let i = 0; i < relevantReports.length; i++) {
      const report = relevantReports[i];

      const populatedReportIndices: number[] = [];
      for (let j = 0; j < report.vehicles.length; j++) {
        const vehicleReport = report.vehicles[j];

        // Only add if crewType matches
        if (vehicleReport.crewType === crewType) {
          const existingIndex = vehicles.findIndex(
            (vehicle) => vehicle.vehicle._id === vehicleReport.vehicle?._id
          );

          if (existingIndex !== -1) {
            vehicles[existingIndex].reports.push(vehicleReport);
            populatedReportIndices.push(existingIndex);
          }
        }
      }

      // Set null for each vehicle report that wasn't seen
      if (populatedReportIndices.length > 0)
        for (let j = 0; j < vehicles.length; j++) {
          if (!populatedReportIndices.includes(j)) {
            vehicles[j].reports.push(null);
          }
        }
    }

    // Generate totals
    for (let i = 0; i < vehicles.length; i++) {
      const reports = vehicles[i];

      let totalHours = 0,
        totalCost = 0;
      for (let j = 0; j < reports.reports.length; j++) {
        const report = reports.reports[j];

        if (report) {
          totalHours += report.hours;
          totalCost += report.hours * report.rate;
        }
      }

      reports.totalCost = totalCost;
      reports.totalHours = totalHours;
    }

    return vehicles;
  }, [crewType, relevantReports]);

  const totals: { hours: number; cost: number } = React.useMemo(() => {
    let totalHours = 0,
      totalCost = 0;
    for (let i = 0; i < vehicleReports.length; i++) {
      totalHours += vehicleReports[i].totalHours;
      totalCost += vehicleReports[i].totalCost;
    }
    return {
      hours: totalHours,
      cost: totalCost,
    };
  }, [vehicleReports]);

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
        <TableCaption>Vehicle costing for {crewType} crew</TableCaption>
        <Thead>
          <Tr>
            <Th>Vehicle</Th>
            <Th isNumeric>Total Hours</Th>
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
          {vehicleReports.map((reports) => (
            <Tr key={reports.vehicle._id}>
              <Th>
                <TextLink link={createLink.vehicle(reports.vehicle._id)}>
                  {reports.vehicle.name}
                </TextLink>
              </Th>
              <Th isNumeric>{formatNumber(reports.totalHours)}</Th>
              <Th isNumeric>${formatNumber(reports.totalCost)}</Th>
              {reports.reports.map((report) => (
                <Th isNumeric key={report?._id}>
                  {report?.hours ? formatNumber(report.hours) : ""}
                </Th>
              ))}
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr>
            <Th>Totals</Th>
            <Th isNumeric>{formatNumber(totals.hours)}</Th>
            <Th isNumeric>${formatNumber(totals.cost)}</Th>
            {relevantReports.map((report) => {
              const summary = report.summary.crewTypeSummaries.find(
                (summary) => summary.crewType === crewType
              );

              return (
                <Th isNumeric key={report._id}>
                  {summary ? formatNumber(summary.vehicleHours) : 0}
                </Th>
              );
            })}
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
};

export default JobsiteReportVehicleReports;
