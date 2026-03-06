import { Heading } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import Breadcrumbs from "../../components/Common/Breadcrumbs";
import Container from "../../components/Common/Container";
import {
  PageJobsiteYearReportCardComp,
  ssrJobsiteYearReportCard,
} from "../../generated/page";
import createLink from "../../utils/createLink";
import formatDate from "../../utils/formatDate";
import JobsiteYearReportClientContent from "../../components/pages/jobsite-year-report/ClientContent";
import ClientOnly from "../../components/Common/ClientOnly";
import jobsiteName from "../../utils/jobsiteName";

const JobsiteYearlyReport: PageJobsiteYearReportCardComp = ({ data }) => {
  const jobsiteYearReport = data?.jobsiteYearReport!;

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

      <ClientOnly>
        <JobsiteYearReportClientContent id={jobsiteYearReport._id} />
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
