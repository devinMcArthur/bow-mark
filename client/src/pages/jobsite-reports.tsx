import { Flex } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import Card from "../components/Common/Card";
import Container from "../components/Common/Container";
import TextLink from "../components/Common/TextLink";
import {
  PageJobsiteYearMasterReportsComp,
  ssrJobsiteYearMasterReports,
} from "../generated/page";
import createLink from "../utils/createLink";
import formatDate from "../utils/formatDate";

const JobsiteYearMasterReports: PageJobsiteYearMasterReportsComp = ({
  data,
}) => {
  const jobsiteYearMasterReports = data?.jobsiteYearMasterReports!;

  /**
   * ----- Rendering -----
   */

  return (
    <Container>
      <Breadcrumbs
        crumbs={[
          {
            title: "Jobsite Reports",
            isCurrentPage: true,
          },
        ]}
      />
      <Flex flexDir="column" py={2} px={4}>
        {jobsiteYearMasterReports.map((report) => (
          <Card key={report._id}>
            <TextLink
              fontSize="lg"
              color="black"
              fontWeight="bold"
              link={createLink.jobsiteYearMasterReport(report._id)}
            >
              {formatDate(report.startOfYear, "YYYY", true)} Master Report
            </TextLink>
          </Card>
        ))}
      </Flex>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrJobsiteYearMasterReports.getServerPage({}, ctx);

  let notFound = false;
  if (!res.props.data.jobsiteYearMasterReports) notFound = true;

  return { ...res, notFound };
};

export default JobsiteYearMasterReports;
