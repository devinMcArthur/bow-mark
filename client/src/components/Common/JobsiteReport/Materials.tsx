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
  JobsiteDayReportMaterialSnippetFragment,
  JobsiteDayReportFullSnippetFragment,
  JobsiteMaterialCardSnippetFragment,
} from "../../../generated/graphql";
import formatDate from "../../../utils/formatDate";
import formatNumber from "../../../utils/formatNumber";

interface IMaterial {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  deliveredRateId?: string | null;
  reports: (JobsiteDayReportMaterialSnippetFragment | null)[];
  totalQuantity: number;
  totalCost: number;
}

interface IJobsiteReportMaterialReports {
  dayReports: JobsiteDayReportFullSnippetFragment[];
  crewType: CrewTypes;
}

const JobsiteReportMaterialReports = ({
  dayReports,
  crewType,
}: IJobsiteReportMaterialReports) => {
  /**
   * ----- Variables -----
   */

  /**
   * @desc all reports w/ material reports for the crew type
   */
  const relevantReports: JobsiteDayReportFullSnippetFragment[] =
    React.useMemo(() => {
      return dayReports
        .filter(
          (report) =>
            report.materials.length > 0 &&
            report.materials
              .map((material) => material.crewType)
              .includes(crewType)
        )
        .sort((a, b) => b.date - a.date);
    }, [crewType, dayReports]);

  /**
   * @desc catalog of all materials and their reports
   */
  const materialReports: IMaterial[] = React.useMemo(() => {
    const materials: IMaterial[] = [];

    // Instantiate materials
    for (let i = 0; i < relevantReports.length; i++) {
      const report = relevantReports[i];

      for (let j = 0; j < report.materials.length; j++) {
        const materialReport = report.materials[j];

        // Only add if crewType matches
        if (materialReport.crewType === crewType) {
          const existingIndex = materials.findIndex(
            (material) =>
              material.jobsiteMaterial._id ===
                materialReport.jobsiteMaterial?._id &&
              material.deliveredRateId === materialReport.deliveredRateId
          );

          if (existingIndex === -1) {
            materials.push({
              jobsiteMaterial: materialReport.jobsiteMaterial!,
              reports: [],
              totalCost: 0,
              totalQuantity: 0,
              deliveredRateId: materialReport.deliveredRateId,
            });
          }
        }
      }
    }

    // Populate reports
    for (let i = 0; i < relevantReports.length; i++) {
      const report = relevantReports[i];

      const populatedReportIndices: number[] = [];
      for (let j = 0; j < report.materials.length; j++) {
        const materialReport = report.materials[j];

        // Only add if crewType matches
        if (materialReport.crewType === crewType) {
          const existingIndex = materials.findIndex(
            (material) =>
              material.jobsiteMaterial._id ===
                materialReport.jobsiteMaterial?._id &&
              material.deliveredRateId === materialReport.deliveredRateId
          );

          if (existingIndex !== -1) {
            materials[existingIndex].reports.push(materialReport);
            populatedReportIndices.push(existingIndex);
          }
        }
      }

      // Set null for each material report that wasn't seen
      if (populatedReportIndices.length > 0)
        for (let j = 0; j < materials.length; j++) {
          if (!populatedReportIndices.includes(j)) {
            materials[j].reports.push(null);
          }
        }
    }

    // Generate totals
    for (let i = 0; i < materials.length; i++) {
      const reports = materials[i];

      let totalQuantity = 0,
        totalCost = 0;
      for (let j = 0; j < reports.reports.length; j++) {
        const report = reports.reports[j];

        if (report) {
          totalQuantity += report.quantity;
          totalCost += report.quantity * report.rate;
        }
      }

      reports.totalCost = totalCost;
      reports.totalQuantity = totalQuantity;
    }

    return materials;
  }, [crewType, relevantReports]);

  const totals: { quantity: number; cost: number } = React.useMemo(() => {
    let totalQuantity = 0,
      totalCost = 0;
    for (let i = 0; i < materialReports.length; i++) {
      totalQuantity += materialReports[i].totalQuantity;
      totalCost += materialReports[i].totalCost;
    }
    return {
      quantity: totalQuantity,
      cost: totalCost,
    };
  }, [materialReports]);

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
        <TableCaption>Material costing for {crewType} crew</TableCaption>
        <Thead>
          <Tr>
            <Th>Material</Th>
            <Th isNumeric>Total Quantity</Th>
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
          {materialReports.map((reports, index) => {
            const deliveredRate = reports.jobsiteMaterial.deliveredRates.find(
              (rate) => rate._id === reports.deliveredRateId
            );

            return (
              <Tr key={index}>
                <Th>
                  {reports.jobsiteMaterial.material.name}
                  {deliveredRate ? `: ${deliveredRate.title}` : ""}
                </Th>
                <Th isNumeric>{formatNumber(reports.totalQuantity)}</Th>
                <Th isNumeric>${formatNumber(reports.totalCost)}</Th>
                {reports.reports.map((report) => (
                  <Th isNumeric key={report?._id}>
                    {report?.quantity ? formatNumber(report.quantity) : ""}
                  </Th>
                ))}
              </Tr>
            );
          })}
        </Tbody>
        <Tfoot>
          <Tr>
            <Th>Totals</Th>
            <Th isNumeric>{formatNumber(totals.quantity)}</Th>
            <Th isNumeric>${formatNumber(totals.cost)}</Th>
            {relevantReports.map((report) => {
              const summary = report.summary.crewTypeSummaries.find(
                (summary) => summary.crewType === crewType
              );

              return (
                <Th isNumeric key={report._id}>
                  {summary ? formatNumber(summary.materialQuantity) : 0}
                </Th>
              );
            })}
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
};

export default JobsiteReportMaterialReports;
