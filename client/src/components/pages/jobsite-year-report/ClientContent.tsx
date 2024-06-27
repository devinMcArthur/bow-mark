import { Box, Heading } from "@chakra-ui/react";
import React from "react";
import {
  JobsiteYearReportSubDocument,
  useJobsiteYearReportFullQuery,
} from "../../../generated/graphql";
import formatDate from "../../../utils/formatDate";
import JobsiteReport from "../../Common/JobsiteReport";
import Loading from "../../Common/Loading";

interface IJobsiteYearReportClientContent {
  id: string;
}

const JobsiteYearReportClientContent = ({
  id,
}: IJobsiteYearReportClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading, subscribeToMore } = useJobsiteYearReportFullQuery({
    variables: {
      id,
    },
  });

  subscribeToMore({
    document: JobsiteYearReportSubDocument,
    variables: {
      id,
    },
    updateQuery: (prev, { subscriptionData }) => {
      if (!subscriptionData) return prev;
      return {
        //@ts-expect-error
        jobsiteYearReport: subscriptionData.data.jobsiteYearReportSub!,
      };
    },
  });

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (data?.jobsiteYearReport && !loading) {
      let { jobsiteYearReport } = data;

      return (
        <Box>
          <Heading size="sm" color="gray.400">
            {jobsiteYearReport.update.status} - Last Updated:{" "}
            {jobsiteYearReport.update.lastUpdatedAt
              ? formatDate(
                jobsiteYearReport.update.lastUpdatedAt,
                "MMMM D hh:mm a, YYYY"
              )
              : "Never"}
          </Heading>
          <JobsiteReport report={jobsiteYearReport} />
        </Box>
      );
    } else return <Loading />;
  }, [data, loading]);
};

export default JobsiteYearReportClientContent;
