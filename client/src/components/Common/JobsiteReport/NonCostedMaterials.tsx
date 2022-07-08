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
  JobsiteDayReportFullSnippetFragment,
  JobsiteDayReportNonCostedMaterialSnippetFragment,
} from "../../../generated/graphql";
import formatDate from "../../../utils/formatDate";
import formatNumber from "../../../utils/formatNumber";

interface INonCostedMaterial {
  materialName: string;
  supplierName: string;
  reports: (JobsiteDayReportNonCostedMaterialSnippetFragment | null)[];
  totalQuantity: number;
}

interface IJobsiteReportNonCostedMaterialReports {
  dayReports: JobsiteDayReportFullSnippetFragment[];
  crewType: CrewTypes;
}

const JobsiteReportNonCostedMaterialReports = ({
  dayReports,
  crewType,
}: IJobsiteReportNonCostedMaterialReports) => {
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
            report.nonCostedMaterials.length > 0 &&
            report.nonCostedMaterials
              .map((nonCostedMaterials) => nonCostedMaterials.crewType)
              .includes(crewType)
        )
        .sort((a, b) => b.date - a.date);
    }, [crewType, dayReports]);

  /**
   * @desc catalog of all nonCostedMaterials and their reports
   */
  const nonCostedMaterialReports: INonCostedMaterial[] = React.useMemo(() => {
    const nonCostedMaterials: INonCostedMaterial[] = [];

    // Instantiate nonCostedMaterials
    for (let i = 0; i < relevantReports.length; i++) {
      const report = relevantReports[i];

      for (let j = 0; j < report.nonCostedMaterials.length; j++) {
        const nonCostedMaterialReport = report.nonCostedMaterials[j];

        // Only add if crewType matches
        if (nonCostedMaterialReport.crewType === crewType) {
          const existingIndex = nonCostedMaterials.findIndex(
            (trucking) =>
              trucking.materialName === nonCostedMaterialReport.materialName &&
              trucking.supplierName === nonCostedMaterialReport.supplierName
          );

          if (existingIndex === -1) {
            nonCostedMaterials.push({
              materialName: nonCostedMaterialReport.materialName,
              supplierName: nonCostedMaterialReport.supplierName,
              reports: [],
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
      for (let j = 0; j < report.nonCostedMaterials.length; j++) {
        const nonCostedMaterialReport = report.nonCostedMaterials[j];

        // Only add if crewType matches
        if (nonCostedMaterialReport.crewType === crewType) {
          const existingIndex = nonCostedMaterials.findIndex(
            (trucking) =>
              trucking.materialName === nonCostedMaterialReport.materialName &&
              trucking.supplierName === nonCostedMaterialReport.supplierName
          );

          if (existingIndex !== -1) {
            nonCostedMaterials[existingIndex].reports.push(
              nonCostedMaterialReport
            );
            populatedReportIndices.push(existingIndex);
          }
        }
      }

      // Set null for each employee report that wasn't seen
      if (populatedReportIndices.length > 0)
        for (let j = 0; j < nonCostedMaterials.length; j++) {
          if (!populatedReportIndices.includes(j)) {
            nonCostedMaterials[j].reports.push(null);
          }
        }
    }

    // Generate totals
    for (let i = 0; i < nonCostedMaterials.length; i++) {
      const reports = nonCostedMaterials[i];

      let totalQuantity = 0;
      for (let j = 0; j < reports.reports.length; j++) {
        const report = reports.reports[j];

        if (report) {
          totalQuantity += report.quantity;
        }
      }

      reports.totalQuantity = totalQuantity;
    }

    return nonCostedMaterials;
  }, [crewType, relevantReports]);

  const totals: { quantity: number } = React.useMemo(() => {
    let totalHours = 0,
      totalCost = 0,
      totalQuantity = 0;
    for (let i = 0; i < nonCostedMaterialReports.length; i++) {
      totalQuantity += nonCostedMaterialReports[i].totalQuantity;
    }
    return {
      hours: totalHours,
      cost: totalCost,
      quantity: totalQuantity,
    };
  }, [nonCostedMaterialReports]);

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
        <TableCaption>Non-Costed Materials for {crewType} crew</TableCaption>
        <Thead>
          <Tr>
            <Th>Non-costed Materials</Th>
            <Th isNumeric>Total Quantity</Th>
            {relevantReports.map((report, index) => (
              <Th isNumeric key={index} whiteSpace="pre-wrap">
                {formatDate(report.date, "MMM D")}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {nonCostedMaterialReports.map((reports) => (
            <Tr key={reports.materialName + reports.supplierName}>
              <Th>
                {reports.supplierName} - {reports.materialName}
              </Th>
              <Th isNumeric>{formatNumber(reports.totalQuantity)}</Th>
              {reports.reports.map((report) => (
                <Th isNumeric key={report?._id}>
                  {formatNumber(report?.quantity || 0)}
                </Th>
              ))}
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr>
            <Th>Totals</Th>
            <Th isNumeric>{formatNumber(totals.quantity)}</Th>
            {relevantReports.map((report) => (
              <Th isNumeric key={report._id}>
                {formatNumber(
                  report.summary.crewTypeSummaries.find(
                    (summary) => summary.crewType === crewType
                  )?.nonCostedMaterialQuantity || 0
                )}
              </Th>
            ))}
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
};

export default JobsiteReportNonCostedMaterialReports;
