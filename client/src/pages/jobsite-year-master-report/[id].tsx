import { Heading } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import Breadcrumbs from "../../components/Common/Breadcrumbs";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import JobsiteYearMasterReportClientContent from "../../components/pages/jobsite-year-master-report/ClientContent";
import {
  PageJobsiteYearMasterReportCardComp,
  ssrJobsiteYearMasterReportCard,
} from "../../generated/page";
import formatDate from "../../utils/formatDate";

const JobsiteYearMasterReport: PageJobsiteYearMasterReportCardComp = ({
  data,
}) => {
  const jobsiteYearMasterReport = data?.jobsiteYearMasterReport!;

  /**
   * ----- Rendering -----
   */

  return (
    <Container>
      <Breadcrumbs
        crumbs={[
          { title: "Jobsite Reports", link: "/jobsite-reports" },
          {
            title: formatDate(
              jobsiteYearMasterReport.startOfYear,
              "YYYY",
              true
            ),
          },
        ]}
      />
      <Heading>
        {formatDate(jobsiteYearMasterReport.startOfYear, "YYYY", true)}
      </Heading>
      <ClientOnly>
        <JobsiteYearMasterReportClientContent
          id={jobsiteYearMasterReport._id}
        />
      </ClientOnly>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrJobsiteYearMasterReportCard.getServerPage(
    { variables: { id: params?.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.jobsiteYearMasterReport) notFound = true;

  return { ...res, notFound };
};

export default JobsiteYearMasterReport;
