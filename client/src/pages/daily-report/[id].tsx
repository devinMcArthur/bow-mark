import { Heading, useMediaQuery } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import Breadcrumbs from "../../components/Common/Breadcrumbs";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import DailyReportClientContent from "../../components/pages/daily-reports/id/ClientContent";
import {
  PageDailyReportSsrComp,
  ssrDailyReportSsr,
} from "../../generated/page";

const DailyReport: PageDailyReportSsrComp = ({ data }) => {
  const name = `${data?.dailyReport.jobsite.jobcode}: ${data?.dailyReport.jobsite.name}`;
  const [isDesktop] = useMediaQuery("(min-width: 768px)");
  const breadcrumbTitle = isDesktop ? name : (data?.dailyReport.jobsite.jobcode ?? name);

  return (
    <Container>
      <Breadcrumbs
        crumbs={[
          {
            title: "Reports",
            link: "/daily-reports",
          },
          {
            title: breadcrumbTitle,
            isCurrentPage: true,
          },
        ]}
      />
      <Heading>{data?.dailyReport.crew.name}</Heading>
      <ClientOnly>
        <DailyReportClientContent id={data?.dailyReport._id!} showFloatingChat />
      </ClientOnly>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrDailyReportSsr.getServerPage(
    { variables: { id: params?.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.dailyReport) notFound = true;

  return { ...res, notFound };
};

export default DailyReport;
