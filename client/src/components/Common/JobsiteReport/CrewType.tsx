import { Box, Button, Center, Heading } from "@chakra-ui/react";
import React from "react";
import { FiChevronUp } from "react-icons/fi";
import {
  CrewTypes,
  JobsiteDayReportFullSnippetFragment,
  JobsiteMonthReportNoFetchSnippetFragment,
  JobsiteYearReportNoFetchSnippetFragment,
  useJobsiteDayReportsFetchQuery,
} from "../../../generated/graphql";
import Card from "../../Common/Card";
import JobsiteReportCrewOnJobSummary from "./CrewOnJobSummary";
import JobsiteMonthEmployeeReports from "./Employees";
import JobsiteMonthMaterialReports from "./Materials";
import JobsiteMonthNonCostedMaterialReports from "./NonCostedMaterials";
import JobsiteMonthTruckingReports from "./Trucking";
import JobsiteMonthVehicleReports from "./Vehicles";
import Loading from "../Loading";

interface IJobsiteReportCrewType {
  crewType: CrewTypes;
  report:
  | JobsiteMonthReportNoFetchSnippetFragment
  | JobsiteYearReportNoFetchSnippetFragment;
}

const JobsiteReportCrewType = ({
  crewType,
  report,
}: IJobsiteReportCrewType) => {
  /**
   * ----- Hook Initialization -----
   */

  const [collapsed, setCollapsed] = React.useState(true);

  const { data, loading } = useJobsiteDayReportsFetchQuery({
    variables: {
      ids: report.dayReports.map((report) => report._id),
    }
  })

  /**
   * ----- Rendering -----
   */

  const detailContent = React.useMemo(() => {
    if (loading) return <Loading />;
    if (!data) return null;

    let fullDayReports: JobsiteDayReportFullSnippetFragment[] = report.dayReports.map((dayReport, index) => {
      const fetchedDayReport = data.jobsiteDayReports[index];
      const dayReportCopy: JobsiteDayReportFullSnippetFragment = JSON.parse(JSON.stringify(dayReport));

      dayReportCopy.employees = dayReport.employees.map((employee, i) => {
        return {
          ...employee,
          ...fetchedDayReport.employees[i]
        }
      });

      dayReportCopy.vehicles = dayReport.vehicles.map((vehicle, i) => {
        return {
          ...vehicle,
          ...fetchedDayReport.vehicles[i]
        }
      });

      dayReportCopy.materials = dayReport.materials.map((material, i) => {
        return {
          ...material,
          ...fetchedDayReport.materials[i]
        }
      });

      return dayReportCopy;
    });

    return (
      <>
        <JobsiteMonthEmployeeReports
          dayReports={fullDayReports}
          crewType={crewType}
        />
        <JobsiteMonthVehicleReports
          dayReports={fullDayReports}
          crewType={crewType}
        />
        <JobsiteMonthMaterialReports
          dayReports={fullDayReports}
          crewType={crewType}
        />
      </>
    )
  }, [loading, data, report.dayReports, crewType]);

  return (
    <Card
      key={crewType}
      heading={
        <Heading
          size="md"
          m={2}
          w="100%"
          cursor="pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          {crewType} Crew Costs
        </Heading>
      }
    >
      <Box m={2}>
        <JobsiteReportCrewOnJobSummary
          dayReports={report.dayReports}
          crewType={crewType}
        />
      </Box>
      {!collapsed && (
        <>
          {detailContent}
          <JobsiteMonthNonCostedMaterialReports
            dayReports={report.dayReports}
            crewType={crewType}
          />
          <JobsiteMonthTruckingReports
            dayReports={report.dayReports}
            crewType={crewType}
          />
          <Center>
            <Button
              leftIcon={<FiChevronUp />}
              rightIcon={<FiChevronUp />}
              mt={2}
              color="gray.600"
              p={0}
              variant="ghost"
              onClick={() => setCollapsed(true)}
              _focus={{ border: "none" }}
            >
              hide
            </Button>
          </Center>
        </>
      )}
    </Card>
  );
};

export default JobsiteReportCrewType;
