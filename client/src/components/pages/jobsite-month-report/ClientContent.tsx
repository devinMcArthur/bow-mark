import { Box, Heading } from "@chakra-ui/react";
import React from "react";
import {
  JobsiteMonthReportSubDocument,
  useJobsiteMonthReportFullQuery,
} from "../../../generated/graphql";
import formatDate from "../../../utils/formatDate";
import JobsiteReport from "../../Common/JobsiteReport";
import Loading from "../../Common/Loading";

interface IJobsiteMonthReportClientContent {
  id: string;
}

const JobsiteMonthReportClientContent = ({
  id,
}: IJobsiteMonthReportClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading, subscribeToMore } = useJobsiteMonthReportFullQuery({
    variables: {
      id,
    },
  });

  subscribeToMore({
    document: JobsiteMonthReportSubDocument,
    variables: {
      id,
    },
    updateQuery: (prev, { subscriptionData }) => {
      if (!subscriptionData) return prev;
      return {
        //@ts-expect-error
        jobsiteMonthReport: subscriptionData.data.jobsiteMonthReportSub!,
      };
    },
  });

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (data?.jobsiteMonthReport && !loading) {
      let { jobsiteMonthReport } = data;

      return (
        <Box>
          <Heading size="sm" color="gray.400">
            {jobsiteMonthReport.update.status} - Last Updated:{" "}
            {jobsiteMonthReport.update.lastUpdatedAt
              ? formatDate(
                  jobsiteMonthReport.update.lastUpdatedAt,
                  "MMMM D hh:mm a, YYYY"
                )
              : "Never"}
          </Heading>
          <JobsiteReport report={jobsiteMonthReport} />
        </Box>
      );
    } else return <Loading />;
  }, [data, loading]);
};

export default JobsiteMonthReportClientContent;
