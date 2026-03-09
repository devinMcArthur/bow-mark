import { Box } from "@chakra-ui/react";
import React from "react";
import { JobsiteYearReportCardSnippetFragment } from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import formatDate from "../../../utils/formatDate";
import TextLink from "../TextLink";

interface IJobsiteYearlyReportCard {
  jobsiteYearlyReport: JobsiteYearReportCardSnippetFragment;
}

const JobsiteYearlyReportCard = ({
  jobsiteYearlyReport,
}: IJobsiteYearlyReportCard) => {
  /**
   * ----- Rendering -----
   */

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <TextLink
        fontSize="lg"
        link={createLink.jobsiteYearReport(jobsiteYearlyReport._id)}
      >
        {formatDate(jobsiteYearlyReport.startOfYear, "YYYY", true)}
      </TextLink>
    </Box>
  );
};

export default JobsiteYearlyReportCard;
