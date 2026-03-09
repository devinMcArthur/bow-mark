import { Center, Flex, Heading } from "@chakra-ui/react";
import React from "react";
import { JobsiteMonthReportCardSnippetFragment } from "../../../generated/graphql";
import Card from "../Card";
import ShowMore from "../ShowMore";
import JobsiteMonthlyReportCard from "./Card";

interface IJobsiteMonthlyReportList {
  jobsiteMonthReports: JobsiteMonthReportCardSnippetFragment[];
}

const JobsiteMonthlyReportList = ({
  jobsiteMonthReports,
}: IJobsiteMonthlyReportList) => {
  /**
   * ----- Rendering -----
   */

  return (
    <Card h="fit-content">
      <Heading my="auto" ml={2} size="md" w="100%">
        Month Reports ({jobsiteMonthReports.length})
      </Heading>
      <Flex flexDir="column" py={2} px={4}>
        {jobsiteMonthReports.length > 0 ? (
          <ShowMore
            list={jobsiteMonthReports
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.startOfMonth).getTime() -
                  new Date(a.startOfMonth).getTime()
              )
              .map((report) => (
                <JobsiteMonthlyReportCard
                  key={report._id}
                  jobsiteMonthlyReport={report}
                />
              ))}
          />
        ) : (
          <Center>No Reports</Center>
        )}
      </Flex>
    </Card>
  );
};

export default JobsiteMonthlyReportList;
