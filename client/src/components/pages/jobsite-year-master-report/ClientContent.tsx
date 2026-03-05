import { Box, Heading } from "@chakra-ui/react";
import React from "react";
import {
  JobsiteYearMasterReportSubDocument,
  useJobsiteYearMasterReportFullQuery,
  UserRoles,
} from "../../../generated/graphql";
import formatDate from "../../../utils/formatDate";
import JobsiteMaster from "../../Common/JobsiteMaster";
import Loading from "../../Common/Loading";
import Permission from "../../Common/Permission";

interface IJobsiteYearMasterReportClientContent {
  id: string;
}

const JobsiteYearMasterReportClientContent = ({
  id,
}: IJobsiteYearMasterReportClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading, subscribeToMore } =
    useJobsiteYearMasterReportFullQuery({
      variables: {
        id,
      },
    });

  subscribeToMore({
    document: JobsiteYearMasterReportSubDocument,
    variables: {
      id,
    },
    updateQuery: (prev, { subscriptionData }) => {
      if (!subscriptionData) return prev;
      return {
        jobsiteYearMasterReport:
          // @ts-expect-error
          subscriptionData.data.jobsiteYearMasterReportSub!,
      };
    },
  });

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (data?.jobsiteYearMasterReport && !loading) {
      const { jobsiteYearMasterReport } = data;

      return (
        <Box>
          <Heading size="sm" color="gray.400">
            {jobsiteYearMasterReport.update.status} - Last Updated:{" "}
            {jobsiteYearMasterReport.update.lastUpdatedAt
              ? formatDate(
                  jobsiteYearMasterReport.update.lastUpdatedAt,
                  "MMMM D hh:mm a, YYYY"
                )
              : "Never"}
          </Heading>
          <Permission minRole={UserRoles.ProjectManager} showError>
            <JobsiteMaster report={jobsiteYearMasterReport} />
          </Permission>
        </Box>
      );
    } else return <Loading />;
  }, [data, loading]);
};

export default JobsiteYearMasterReportClientContent;
