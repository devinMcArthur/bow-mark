import { Box, Flex, HStack, Icon, Text, Tooltip } from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { FiBook, FiDollarSign, FiDownload } from "react-icons/fi";
import {
  DailyReportCardSnippetFragment,
  UserRoles,
} from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import Card from "../Card";
import Permission from "../Permission";
import TextGrid from "../TextGrid";
import TextLink from "../TextLink";

interface IDailyReportCard {
  dailyReport: DailyReportCardSnippetFragment;
}

const DailyReportCard = ({ dailyReport }: IDailyReportCard) => {
  return (
    <Card
      heading={
        <Flex flexDir="row" justifyContent="space-between">
          <Box>
            <TextLink
              link={createLink.dailyReport(dailyReport._id)}
              color="black"
              fontWeight="bold"
              fontSize="lg"
            >
              {dailyReport.jobsite.name} -{" "}
              {dayjs(dailyReport.date).format("MMMM DD, YYYY")}
            </TextLink>
          </Box>
          <HStack spacing={1}>
            <Permission minRole={UserRoles.ProjectManager}>
              <TextLink
                link={createLink.dailyReportPDF(dailyReport._id)}
                newTab
                mx="auto"
              >
                <Icon
                  cursor="pointer"
                  as={FiDownload}
                  backgroundColor="transparent"
                />
              </TextLink>
            </Permission>
            {dailyReport.jobCostApproved && (
              <Tooltip label="Job costing approved">
                <span>
                  <Icon cursor="help" as={FiBook} />
                </span>
              </Tooltip>
            )}
            {dailyReport.payrollComplete && (
              <Tooltip label="Payroll complete">
                <span>
                  <Icon cursor="help" as={FiDollarSign} />
                </span>
              </Tooltip>
            )}
          </HStack>
        </Flex>
      }
    >
      <TextGrid
        rows={[
          {
            title: (
              <Text as="span" fontWeight="bold">
                Crew:{" "}
              </Text>
            ),
            text: (
              <TextLink link={createLink.crew(dailyReport.crew._id)}>
                {dailyReport.crew.name}
              </TextLink>
            ),
          },
          {
            title: (
              <Text as="span" fontWeight="bold">
                Jobsite:{" "}
              </Text>
            ),
            text: (
              <TextLink link={createLink.jobsite(dailyReport.jobsite._id)}>
                {dailyReport.jobsite.name}
              </TextLink>
            ),
          },
        ]}
      />
      <Text></Text>
    </Card>
  );
};

export default DailyReportCard;
