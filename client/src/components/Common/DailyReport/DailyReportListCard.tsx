import { Box, Flex, Heading, Skeleton, Stack } from "@chakra-ui/react";
import React from "react";

import { DailyReportCardSnippetFragment } from "../../../generated/graphql";
import Card from "../Card";
import DailyReportCard from "./DailyReportCard";
import ShowMore from "../ShowMore";
import TextLink from "../TextLink";
import createLink from "../../../utils/createLink";

interface IDailyReportListCard {
  dailyReports?: DailyReportCardSnippetFragment[];
  jobsiteId?: string;
  limit?: number;
}

const DailyReportListCard = ({
  limit,
  dailyReports,
  jobsiteId,
}: IDailyReportListCard) => {
  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between">
        <Heading ml={2} my="auto" size="md">
          Daily Reports {dailyReports ? `(${dailyReports.length})` : ""}
        </Heading>
        {jobsiteId && (
          <div>
            <TextLink mx={4} link={createLink.jobsiteStory(jobsiteId)}>Story</TextLink>
            <TextLink link={createLink.jobsiteDailyReports(jobsiteId)}>
              View All
            </TextLink>
          </div>
        )}
      </Flex>
      {dailyReports ? (
        <ShowMore
          limit={limit}
          list={dailyReports.map((dailyReport) => (
            <DailyReportCard key={dailyReport._id} dailyReport={dailyReport} />
          ))}
        />
      ) : (
        <Stack spacing={2} my={4}>
          <Skeleton h="4em" />
          <Skeleton h="4em" />
        </Stack>
      )}
    </Card>
  );
};

export default DailyReportListCard;
