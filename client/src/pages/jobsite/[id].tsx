import { Heading } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import Breadcrumbs from "../../components/Common/Breadcrumbs";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import JobsiteClientContent from "../../components/pages/jobsite/id/ClientContent";
import { PageJobsiteSsrComp, ssrJobsiteSsr } from "../../generated/page";
import jobsiteName from "../../utils/jobsiteName";

const Jobsite: PageJobsiteSsrComp = ({ data }) => {
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
            isCurrentPage: true,
          },
        ]}
      />
      <Heading>{jobsite.name}</Heading>
      <ClientOnly>
        <JobsiteClientContent id={jobsite._id} />
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

export default Jobsite;
