import { Box, Flex, Text } from "@chakra-ui/react";
import Link from "next/link";
import React from "react";
import {
  ReportIssueSnippetFragment,
  ReportIssueTypes,
} from "../../../generated/graphql";
import createLink from "../../../utils/createLink";

interface IJobsiteReportIssueCard {
  issue: ReportIssueSnippetFragment;
}

const JobsiteReportIssueCard = ({ issue }: IJobsiteReportIssueCard) => {
  /**
   * ----- Variables -----
   */

  const text = React.useMemo(() => {
    switch (issue.type) {
      case ReportIssueTypes.EmployeeRateZero: {
        if (issue.employee)
          return (
            <Link href={createLink.employee(issue.employee._id)} passHref>
              <Box>
                <Text fontWeight="bolder">{issue.employee.name}</Text>
                <Text>does not have a set rate</Text>
              </Box>
            </Link>
          );
        else return null;
      }
      case ReportIssueTypes.VehicleRateZero: {
        if (issue.vehicle)
          return (
            <Link href={createLink.vehicle(issue.vehicle?._id)} passHref>
              <Box>
                <Text fontWeight="bolder">
                  {issue.vehicle.name} - {issue.vehicle.vehicleCode}
                </Text>
                <Text>does not have a set rate</Text>
              </Box>
            </Link>
          );
        else return null;
      }
      case ReportIssueTypes.MaterialRateZero: {
        if (issue.jobsiteMaterial)
          return (
            <Link
              href={createLink.jobsite(issue.jobsiteMaterial.jobsite._id, {
                jobsiteMaterialId: issue.jobsiteMaterial._id,
              })}
              passHref
            >
              <Box>
                <Text fontWeight="bolder">
                  {issue.jobsiteMaterial.material.name} -{" "}
                  {issue.jobsiteMaterial.supplier.name}
                </Text>
                <Text>does not have a set rate</Text>
              </Box>
            </Link>
          );
        else return null;
      }
      case ReportIssueTypes.NonCostedMaterials: {
        if (issue.amount && issue.amount > 0)
          return (
            <Text>
              Job has{" "}
              <Text as="span" fontWeight="bolder">
                {issue.amount}
              </Text>{" "}
              non-costed materials
            </Text>
          );
        else return null;
      }
      case ReportIssueTypes.MaterialEstimatedRate: {
        if (issue.jobsiteMaterial)
          return (
            <Link
              href={createLink.jobsite(issue.jobsiteMaterial.jobsite._id, {
                jobsiteMaterialId: issue.jobsiteMaterial._id,
              })}
              passHref
            >
              <Box>
                <Text fontWeight="bolder">
                  {issue.jobsiteMaterial.material.name} -{" "}
                  {issue.jobsiteMaterial.supplier.name}
                </Text>
                <Text>has an estimated cost</Text>
              </Box>
            </Link>
          );
        else return null;
      }
      default: {
        return null;
      }
    }
  }, [issue]);

  /**
   * ----- Rendering -----
   */

  return (
    <Flex
      w="100%"
      _hover={{ backgroundColor: "gray.100" }}
      py={2}
      pr={2}
      cursor="pointer"
      flexDir="row"
    >
      <Box backgroundColor="gray.400" minW="1%" mr={2}></Box>
      {text}
    </Flex>
  );
};

export default JobsiteReportIssueCard;
