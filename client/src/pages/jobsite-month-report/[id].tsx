import { Heading } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import Breadcrumbs from "../../components/Common/Breadcrumbs";
import Container from "../../components/Common/Container";
import {
  PageJobsiteMonthReportCardComp,
  ssrJobsiteMonthReportCard,
} from "../../generated/page";
import createLink from "../../utils/createLink";
import formatDate from "../../utils/formatDate";
import JobsiteMonthReportClientContent from "../../components/pages/jobsite-month-report/ClientContent";
import ClientOnly from "../../components/Common/ClientOnly";
import jobsiteName from "../../utils/jobsiteName";

const JobsiteMonthlyReport: PageJobsiteMonthReportCardComp = ({ data }) => {
  const jobsiteMonthReport = data?.jobsiteMonthReport!;

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
              jobsiteMonthReport.jobsite.name,
              jobsiteMonthReport.jobsite.jobcode
            ),
            link: createLink.jobsite(jobsiteMonthReport.jobsite._id),
          },
          {
            title: "Month Reports",
          },
          {
            title: formatDate(
              jobsiteMonthReport.startOfMonth,
              "MMMM YYYY",
              true
            ),
            isCurrentPage: true,
          },
        ]}
      />
      <Heading>
        {formatDate(jobsiteMonthReport.startOfMonth, "MMMM YYYY", true)}:{" "}
        {jobsiteMonthReport.jobsite.name} ({jobsiteMonthReport.jobsite.jobcode})
      </Heading>
      <ClientOnly>
        <JobsiteMonthReportClientContent id={jobsiteMonthReport._id} />
      </ClientOnly>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrJobsiteMonthReportCard.getServerPage(
    { variables: { id: params?.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.jobsiteMonthReport) notFound = true;

  return { ...res, notFound };
};

export default JobsiteMonthlyReport;
