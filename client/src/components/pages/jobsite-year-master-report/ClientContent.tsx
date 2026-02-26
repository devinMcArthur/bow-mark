import { Box, Heading, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import React from "react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import {
  JobsiteYearMasterReportSubDocument,
  useJobsiteYearMasterReportFullQuery,
  UserRoles,
} from "../../../generated/graphql";
import formatDate from "../../../utils/formatDate";
import JobsiteMaster from "../../Common/JobsiteMaster";
import Loading from "../../Common/Loading";
import Permission from "../../Common/Permission";
import ComparisonPG from "./ComparisonPG";
import ProductivityBenchmarks from "./ProductivityBenchmarks";
import FinancialPerformance from "./FinancialPerformance";

interface IJobsiteYearMasterReportClientContent {
  id: string;
}

const JobsiteYearMasterReportClientContent = ({
  id,
}: IJobsiteYearMasterReportClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const router = useRouter();
  const [tabIndex, setTabIndex] = React.useState(0);

  // Read initial tab from URL after hydration (router.query is empty on SSR)
  React.useEffect(() => {
    if (router.isReady) {
      const tab = parseInt((router.query.tab as string) || "0", 10);
      setTabIndex(isNaN(tab) || tab < 0 || tab > 3 ? 0 : tab);
    }
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use window.history directly to avoid Next.js router re-render cascade
  const handleTabChange = React.useCallback((index: number) => {
    setTabIndex(index);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", String(index));
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  const { data, loading, subscribeToMore } =
    useJobsiteYearMasterReportFullQuery({
      variables: {
        id,
      },
    });

  subscribeToMore({
    document: JobsiteYearMasterReportSubDocument,
    variables: {
      id,
    },
    updateQuery: (prev, { subscriptionData }) => {
      if (!subscriptionData) return prev;
      return {
        jobsiteYearMasterReport:
          // @ts-expect-error
          subscriptionData.data.jobsiteYearMasterReportSub!,
      };
    },
  });

  /**
   * ----- Rendering -----
   */

  // Extract year from the report's startOfYear date
  const year = React.useMemo(() => {
    if (!data?.jobsiteYearMasterReport) return null;
    const startDate = dayjs(data.jobsiteYearMasterReport.startOfYear);
    return startDate.add(-startDate.utcOffset(), "minutes").year();
  }, [data?.jobsiteYearMasterReport?.startOfYear]);

  return React.useMemo(() => {
    if (data?.jobsiteYearMasterReport && !loading) {
      const { jobsiteYearMasterReport } = data;

      return (
        <Box>
          <Heading size="sm" color="gray.400">
            {jobsiteYearMasterReport.update.status} - Last Updated:{" "}
            {jobsiteYearMasterReport.update.lastUpdatedAt
              ? formatDate(
                  jobsiteYearMasterReport.update.lastUpdatedAt,
                  "MMMM D hh:mm a, YYYY"
                )
              : "Never"}
          </Heading>
          <Permission minRole={UserRoles.ProjectManager} showError>
            <Tabs variant="enclosed" mt={4} index={tabIndex} onChange={handleTabChange}>
              <TabList>
                <Tab>Report (MongoDB)</Tab>
                <Tab>Compare with PostgreSQL</Tab>
                <Tab>Productivity Benchmarks</Tab>
                <Tab>Financial Performance</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <JobsiteMaster report={jobsiteYearMasterReport} />
                </TabPanel>
                <TabPanel px={0}>
                  <ComparisonPG mongoReport={jobsiteYearMasterReport} />
                </TabPanel>
                <TabPanel px={0}>
                  {year && <ProductivityBenchmarks year={year} />}
                </TabPanel>
                <TabPanel px={0}>
                  {year && <FinancialPerformance year={year} />}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Permission>
        </Box>
      );
    } else return <Loading />;
  }, [data, loading, year, tabIndex, handleTabChange]);
};

export default JobsiteYearMasterReportClientContent;
