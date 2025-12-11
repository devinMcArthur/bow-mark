import { Heading } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import React from "react";
import Breadcrumbs from "../../../components/Common/Breadcrumbs";
import ClientOnly from "../../../components/Common/ClientOnly";
import Container from "../../../components/Common/Container";
import JobsiteStoryClientContent from "../../../components/pages/jobsite/story/ClientContent";
import { PageJobsiteSsrComp, ssrJobsiteSsr } from "../../../generated/page";
import createLink from "../../../utils/createLink";
import jobsiteName from "../../../utils/jobsiteName";

const JobsiteStory: PageJobsiteSsrComp = ({ data }) => {
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
            title: jobsiteName(jobsite.name, jobsite.jobcode),
            link: createLink.jobsite(jobsite._id),
          },
          {
            title: "Story",
            isCurrentPage: true,
          },
        ]}
      />
      <Heading>{jobsite.name}</Heading>
      <ClientOnly>
        <JobsiteStoryClientContent jobsiteId={jobsite._id} />
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

export default JobsiteStory;
