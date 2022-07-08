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
  EmployeeCardSnippetFragment,
  JobsiteDayReportEmployeeSnippetFragment,
  JobsiteDayReportFullSnippetFragment,
} from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import formatDate from "../../../utils/formatDate";
import formatNumber from "../../../utils/formatNumber";
import TextLink from "../../Common/TextLink";

interface IEmployee {
  employee: EmployeeCardSnippetFragment;
  reports: (JobsiteDayReportEmployeeSnippetFragment | null)[];
  totalHours: number;
  totalCost: number;
}

interface IJobsiteReportEmployeeReports {
  dayReports: JobsiteDayReportFullSnippetFragment[];
  crewType: CrewTypes;
}

const JobsiteReportEmployeeReports = ({
  dayReports,
  crewType,
}: IJobsiteReportEmployeeReports) => {
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
            report.employees.length > 0 &&
            report.employees
              .map((employee) => employee.crewType)
              .includes(crewType)
        )
        .sort((a, b) => b.date - a.date);
    }, [crewType, dayReports]);

  /**
   * @desc catalog of all employees and their reports
   */
  const employeeReports: IEmployee[] = React.useMemo(() => {
    const employees: IEmployee[] = [];

    // Instantiate employees
    for (let i = 0; i < relevantReports.length; i++) {
      const report = relevantReports[i];

      for (let j = 0; j < report.employees.length; j++) {
        const employeeReport = report.employees[j];

        // Only add if crewType matches
        if (employeeReport.crewType === crewType) {
          const existingIndex = employees.findIndex(
            (employee) => employee.employee._id === employeeReport.employee?._id
          );

          if (existingIndex === -1) {
            employees.push({
              employee: employeeReport.employee!,
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
      for (let j = 0; j < report.employees.length; j++) {
        const employeeReport = report.employees[j];

        // Only add if crewType matches
        if (employeeReport.crewType === crewType) {
          const existingIndex = employees.findIndex(
            (employee) => employee.employee._id === employeeReport.employee?._id
          );

          if (existingIndex !== -1) {
            employees[existingIndex].reports.push(employeeReport);
            populatedReportIndices.push(existingIndex);
          }
        }
      }

      // Set null for each employee report that wasn't seen
      if (populatedReportIndices.length > 0)
        for (let j = 0; j < employees.length; j++) {
          if (!populatedReportIndices.includes(j)) {
            employees[j].reports.push(null);
          }
        }
    }

    // Generate totals
    for (let i = 0; i < employees.length; i++) {
      const reports = employees[i];

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

    return employees;
  }, [crewType, relevantReports]);

  const totals: { hours: number; cost: number } = React.useMemo(() => {
    let totalHours = 0,
      totalCost = 0;
    for (let i = 0; i < employeeReports.length; i++) {
      totalHours += employeeReports[i].totalHours;
      totalCost += employeeReports[i].totalCost;
    }
    return {
      hours: totalHours,
      cost: totalCost,
    };
  }, [employeeReports]);

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
        <TableCaption>Employee costing for {crewType} crew</TableCaption>
        <Thead>
          <Tr>
            <Th>Employee</Th>
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
          {employeeReports.map((reports) => (
            <Tr key={reports.employee._id}>
              <Th>
                <TextLink link={createLink.employee(reports.employee._id)}>
                  {reports.employee.name}
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
              const employeeHours = report.summary.crewTypeSummaries.find(
                (summary) => summary.crewType === crewType
              )?.employeeHours;
              return (
                <Th isNumeric key={report._id}>
                  {employeeHours ? formatNumber(employeeHours) : 0}
                </Th>
              );
            })}
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
};

export default JobsiteReportEmployeeReports;
