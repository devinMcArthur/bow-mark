import {
  Code,
  SimpleGrid,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  StatProps,
  Tooltip,
} from "@chakra-ui/react";
import React from "react";
import {
  CrewTypes,
  JobsiteDayReportFullSnippetFragment,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";

interface IJobsiteReportOnJobSummary {
  dayReports: JobsiteDayReportFullSnippetFragment[];
  allDayReports?: JobsiteDayReportFullSnippetFragment[];
  crewType?: CrewTypes;
  statSize?: StatProps["size"];
}

const handlePercent = (value: number, total: number) => {
  const percent = (value / total) * 100;
  if (isNaN(percent)) {
    return formatNumber(0);
  } else {
    return formatNumber(percent);
  }
};

const JobsiteReportOnJobSummary = ({
  dayReports,
  allDayReports = [],
  crewType,
  statSize = "sm",
}: IJobsiteReportOnJobSummary) => {
  /**
   * ----- Variables -----
   */

  const totalWages = React.useMemo(() => {
    if (allDayReports.length === 0) return null;

    let wages = 0;
    for (let i = 0; i < allDayReports.length; i++) {
      wages += allDayReports[i].summary.employeeCost;
    }

    return wages;
  }, [allDayReports]);

  const wages = React.useMemo(() => {
    let wages = 0;
    for (let i = 0; i < dayReports.length; i++) {
      const employeeCost = crewType
        ? dayReports[i].summary.crewTypeSummaries.find(
            (summary) => summary.crewType === crewType
          )?.employeeCost
        : dayReports[i].summary.employeeCost;
      wages += employeeCost || 0;
    }

    return wages;
  }, [crewType, dayReports]);

  const totalEquipment = React.useMemo(() => {
    if (allDayReports.length === 0) return null;

    let equipment = 0;
    for (let i = 0; i < allDayReports.length; i++) {
      equipment += allDayReports[i].summary.vehicleCost;
    }

    return equipment;
  }, [allDayReports]);

  const equipment = React.useMemo(() => {
    let equipment = 0;
    for (let i = 0; i < dayReports.length; i++) {
      const equipmentCost = crewType
        ? dayReports[i].summary.crewTypeSummaries.find(
            (summary) => summary.crewType === crewType
          )?.vehicleCost
        : dayReports[i].summary.vehicleCost;
      equipment += equipmentCost || 0;
    }

    return equipment;
  }, [crewType, dayReports]);

  const totalMaterials = React.useMemo(() => {
    if (allDayReports.length === 0) return null;

    let materialCost = 0;
    for (let i = 0; i < allDayReports.length; i++) {
      materialCost += allDayReports[i].summary.materialCost;
    }

    return materialCost;
  }, [allDayReports]);

  const materials: { cost: number; quantity: number } = React.useMemo(() => {
    let materials = {
      cost: 0,
      quantity: 0,
    };
    for (let i = 0; i < dayReports.length; i++) {
      const materialCost = crewType
        ? dayReports[i].summary.crewTypeSummaries.find(
            (summary) => summary.crewType === crewType
          )?.materialCost
        : dayReports[i].summary.materialCost;
      materials.cost += materialCost || 0;

      const materialQuantity = crewType
        ? dayReports[i].summary.crewTypeSummaries.find(
            (summary) => summary.crewType === crewType
          )?.materialQuantity
        : dayReports[i].summary.materialQuantity;
      materials.quantity += materialQuantity || 0;
    }

    return materials;
  }, [crewType, dayReports]);

  const totalTrucking = React.useMemo(() => {
    if (allDayReports.length === 0) return null;

    let trucking = 0;
    for (let i = 0; i < allDayReports.length; i++) {
      trucking += allDayReports[i].summary.truckingCost;
    }

    return trucking;
  }, [allDayReports]);

  const trucking = React.useMemo(() => {
    let trucking = 0;
    for (let i = 0; i < dayReports.length; i++) {
      const truckingCost = crewType
        ? dayReports[i].summary.crewTypeSummaries.find(
            (summary) => summary.crewType === crewType
          )?.truckingCost
        : dayReports[i].summary.truckingCost;
      trucking += truckingCost || 0;
    }

    return trucking;
  }, [crewType, dayReports]);

  const total = React.useMemo(() => {
    return wages + equipment + materials.cost + trucking;
  }, [equipment, materials.cost, trucking, wages]);

  const fullTotal = React.useMemo(() => {
    if (allDayReports.length === 0) return null;

    return (
      (totalWages || 0) +
      (totalEquipment || 0) +
      (totalMaterials || 0) +
      (totalTrucking || 0)
    );
  }, [
    allDayReports.length,
    totalEquipment,
    totalMaterials,
    totalTrucking,
    totalWages,
  ]);

  /**
   * ----- Rendering -----
   */

  return (
    <SimpleGrid spacing={2} columns={[5]}>
      <Stat size={statSize} display="flex" justifyContent="center">
        <StatLabel>Wages</StatLabel>
        <StatNumber>${formatNumber(wages)}</StatNumber>
        {totalWages !== null ? (
          <StatHelpText fontSize={statSize}>
            {handlePercent(wages, totalWages)}%
          </StatHelpText>
        ) : null}
      </Stat>
      <Stat size={statSize} display="flex" justifyContent="center">
        <StatLabel>Equipment</StatLabel>
        <StatNumber>${formatNumber(equipment)}</StatNumber>
        {totalEquipment !== null ? (
          <StatHelpText fontSize={statSize}>
            {handlePercent(equipment, totalEquipment)}%
          </StatHelpText>
        ) : null}
      </Stat>
      <Stat size={statSize} display="flex" justifyContent="center">
        <StatLabel>Material</StatLabel>
        <StatNumber>${formatNumber(materials.cost)}</StatNumber>
        {totalMaterials !== null ? (
          <StatHelpText mb={0} fontSize={statSize}>
            {handlePercent(materials.cost, totalMaterials)}%
          </StatHelpText>
        ) : null}
        <StatHelpText fontSize={statSize}>
          Quantity: {formatNumber(materials.quantity)}
        </StatHelpText>
      </Stat>
      <Stat size={statSize} display="flex" justifyContent="center">
        <StatLabel>Trucking</StatLabel>
        <StatNumber>${formatNumber(trucking)}</StatNumber>
        {totalTrucking !== null ? (
          <StatHelpText fontSize={statSize}>
            {handlePercent(trucking, totalTrucking)}%
          </StatHelpText>
        ) : null}
      </Stat>

      <Stat size={statSize} display="flex" justifyContent="center">
        <StatLabel>Total</StatLabel>
        <StatNumber>${formatNumber(total)}</StatNumber>
        <Tooltip
          label={
            <Code backgroundColor="transparent" color="white">
              + 10%
            </Code>
          }
        >
          <StatHelpText fontSize={statSize} fontWeight="bold" mb={0}>
            ${formatNumber(total * 1.1)}
          </StatHelpText>
        </Tooltip>
        {fullTotal !== null ? (
          <StatHelpText fontSize={statSize}>
            {handlePercent(total, fullTotal)}%
          </StatHelpText>
        ) : null}
      </Stat>
    </SimpleGrid>
  );
};

export default JobsiteReportOnJobSummary;
