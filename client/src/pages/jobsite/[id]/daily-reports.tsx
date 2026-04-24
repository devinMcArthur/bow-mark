import { Heading } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import React from "react";
import Breadcrumbs from "../../../components/Common/Breadcrumbs";
import ClientOnly from "../../../components/Common/ClientOnly";
import Container from "../../../components/Common/Container";
import JobsiteDailyReportsClientContent from "../../../components/pages/jobsite/daily-reports/ClientContent";
import { PageJobsiteSsrComp, ssrJobsiteSsr } from "../../../generated/page";
import createLink from "../../../utils/createLink";

const JobsiteDailyReports: PageJobsiteSsrComp = ({ data }) => {
  const jobsite = data?.jobsite!;

  return (
    <Container>
      <Breadcrumbs
        crumbs={[
          {
            title: "Jobsites",
            link: "/jobsites",
          },
          {
            title: jobsite.jobcode || jobsite.name,
            link: createLink.jobsite(jobsite._id),
          },
          {
            title: "Daily Reports",
            isCurrentPage: true,
          },
        ]}
      />
      <Heading>{jobsite.name}</Heading>
      <ClientOnly>
        <JobsiteDailyReportsClientContent jobsiteId={jobsite._id} />
      </ClientOnly>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrJobsiteSsr.getServerPage(
    { variables: { id: params?.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.jobsite) notFound = true;

  return { ...res, notFound };
};

export default JobsiteDailyReports;
