import { Box } from "@chakra-ui/react";
import React from "react";
import { JobsiteMonthReportCardSnippetFragment } from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import formatDate from "../../../utils/formatDate";
import TextLink from "../TextLink";

interface IJobsiteMonthlyReportCard {
  jobsiteMonthlyReport: JobsiteMonthReportCardSnippetFragment;
}

const JobsiteMonthlyReportCard = ({
  jobsiteMonthlyReport,
}: IJobsiteMonthlyReportCard) => {
  /**
   * ----- Rendering -----
   */

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <TextLink
        fontSize="lg"
        link={createLink.jobsiteMonthReport(jobsiteMonthlyReport._id)}
      >
        {formatDate(jobsiteMonthlyReport.startOfMonth, "YYYY - MMMM", true)}
      </TextLink>
    </Box>
  );
};

export default JobsiteMonthlyReportCard;
