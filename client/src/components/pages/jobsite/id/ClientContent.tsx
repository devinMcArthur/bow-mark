import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import React from "react";
import { useJobsiteFullQuery, UserRoles } from "../../../../generated/graphql";
import Card from "../../../Common/Card";
import DailyReportListCard from "../../../Common/DailyReport/DailyReportListCard";
import JobsiteMonthlyReportList from "../../../Common/JobsiteMonthlyReport/List";
import JobsiteYearlyReportList from "../../../Common/JobsiteYearReport/List";
import Loading from "../../../Common/Loading";
import Map from "../../../Common/Map";
import Permission from "../../../Common/Permission";
import ExpenseInvoices from "./views/ExpenseInvoices";
import JobsiteMaterialsCosting from "./views/JobsiteMaterials";
import RevenueInvoices from "./views/RevenueInvoices";
import TruckingRates from "./views/TruckingRates";

interface IJobsiteClientContent {
  id: string;
}

const JobsiteClientContent = ({ id }: IJobsiteClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data } = useJobsiteFullQuery({
    variables: { id },
  });

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (data?.jobsite) {
      const { jobsite } = data;

      return (
        <Box>
          <Card>
            <Text>
              <Text fontWeight="bold" as="span">
                Number:{" "}
              </Text>
              {jobsite.jobcode}
            </Text>
            {jobsite.description && (
              <Text>
                <Text fontWeight="bold" as="span">
                  Description:{" "}
                </Text>
                {jobsite.description}
              </Text>
            )}
          </Card>
          <Map pinText={jobsite.jobcode} />
          <Permission minRole={UserRoles.ProjectManager}>
            <SimpleGrid columns={[1, 1, 1, 2]} spacingX={4} spacingY={2}>
              <JobsiteMaterialsCosting jobsite={jobsite} />
              <TruckingRates jobsite={jobsite} />
            </SimpleGrid>
            <SimpleGrid columns={[1, 1, 1, 2]} spacingX={4} spacingY={2}>
              <ExpenseInvoices jobsite={jobsite} />
              <RevenueInvoices jobsite={jobsite} />
            </SimpleGrid>
            <JobsiteYearlyReportList jobsiteYearReports={jobsite.yearReports} />
            <JobsiteMonthlyReportList
              jobsiteMonthReports={jobsite.monthReports}
            />
          </Permission>
          <DailyReportListCard dailyReports={jobsite.dailyReports} />
        </Box>
      );
    } else return <Loading />;
  }, [data]);
};

export default JobsiteClientContent;
