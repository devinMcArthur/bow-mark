import { Box, Divider, Heading, Switch, FormControl, FormLabel } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import { useState } from "react";
import Breadcrumbs from "../../components/Common/Breadcrumbs";
import Container from "../../components/Common/Container";
import {
  PageJobsiteYearReportCardComp,
  ssrJobsiteYearReportCard,
} from "../../generated/page";
import createLink from "../../utils/createLink";
import formatDate from "../../utils/formatDate";
import JobsiteYearReportClientContent from "../../components/pages/jobsite-year-report/ClientContent";
import JobsiteYearReportClientContentPG from "../../components/pages/jobsite-year-report/ClientContentPG";
import ClientOnly from "../../components/Common/ClientOnly";
import jobsiteName from "../../utils/jobsiteName";

const JobsiteYearlyReport: PageJobsiteYearReportCardComp = ({ data }) => {
  const jobsiteYearReport = data?.jobsiteYearReport!;
  const [showPGReport, setShowPGReport] = useState(false);

  // Extract year from startOfYear date
  const year = new Date(jobsiteYearReport.startOfYear).getFullYear();

  /**
   * ----- Rendering -----
   */

  return (
    <Container>
      <Breadcrumbs
        crumbs={[
          {
            title: "Jobsites",
            link: "/jobsites",
          },
          {
            title: jobsiteName(
              jobsiteYearReport.jobsite.name,
              jobsiteYearReport.jobsite.jobcode
            ),
            link: createLink.jobsite(jobsiteYearReport.jobsite._id),
          },
          {
            title: "Year Reports",
          },
          {
            title: formatDate(jobsiteYearReport.startOfYear, "YYYY", true),
            isCurrentPage: true,
          },
        ]}
      />
      <Heading>
        {formatDate(jobsiteYearReport.startOfYear, "YYYY", true)}:{" "}
        {jobsiteYearReport.jobsite.name} ({jobsiteYearReport.jobsite.jobcode})
      </Heading>

      {/* Toggle for PostgreSQL report comparison */}
      <Box my={4}>
        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="pg-report-toggle" mb="0">
            Show PostgreSQL Report (New System)
          </FormLabel>
          <Switch
            id="pg-report-toggle"
            isChecked={showPGReport}
            onChange={(e) => setShowPGReport(e.target.checked)}
            colorScheme="blue"
          />
        </FormControl>
      </Box>

      <ClientOnly>
        {/* Original MongoDB Report */}
        <JobsiteYearReportClientContent id={jobsiteYearReport._id} />

        {/* PostgreSQL Report (when enabled) */}
        {showPGReport && (
          <>
            <Divider my={8} borderColor="blue.300" borderWidth={2} />
            <Heading size="lg" color="blue.600" mb={4}>
              PostgreSQL Report (New System)
            </Heading>
            <JobsiteYearReportClientContentPG
              jobsiteMongoId={jobsiteYearReport.jobsite._id}
              year={year}
            />
          </>
        )}
      </ClientOnly>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrJobsiteYearReportCard.getServerPage(
    { variables: { id: params?.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.jobsiteYearReport) notFound = true;

  return { ...res, notFound };
};

export default JobsiteYearlyReport;
