import { Center, Flex, Heading } from "@chakra-ui/react";
import React from "react";
import { JobsiteYearReportCardSnippetFragment } from "../../../generated/graphql";
import Card from "../Card";
import ShowMore from "../ShowMore";
import JobsiteYearlyReportCard from "./Card";

interface IJobsiteYearlyReportList {
  jobsiteYearReports: JobsiteYearReportCardSnippetFragment[];
}

const JobsiteYearlyReportList = ({
  jobsiteYearReports,
}: IJobsiteYearlyReportList) => {
  /**
   * ----- Rendering -----
   */

  return (
    <Card h="fit-content">
      <Heading my="auto" ml={2} size="md" w="100%">
        Year Reports ({jobsiteYearReports.length})
      </Heading>
      <Flex flexDir="column" py={2} px={4}>
        {jobsiteYearReports.length > 0 ? (
          <ShowMore
            list={jobsiteYearReports
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.startOfYear).getTime() -
                  new Date(a.startOfYear).getTime()
              )
              .map((report) => (
                <JobsiteYearlyReportCard
                  key={report._id}
                  jobsiteYearlyReport={report}
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

export default JobsiteYearlyReportList;
