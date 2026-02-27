import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import Container from "../components/Common/Container";
import DailyReportFullPageList from "../components/Common/DailyReport/ListFullPage";
import CurrentJobsiteYearMasterReport from "../components/Common/JobsiteYearMasterReport/Current";
import Loading from "../components/Common/Loading";
import OperatorDailyReportFullPageList from "../components/Common/OperatorDailyReport/ListFullPage";
import VehicleIssueFullPageList from "../components/Common/VehicleIssue/ListFullPage";
import { useAuth } from "../contexts/Auth";
import { UserHomeViewSettings, UserRoles, UserTypes } from "../generated/graphql";

interface ITabCatalogItem {
  tab: React.ReactChild;
  panel: React.ReactChild;
}

const Home = () => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { user },
  } = useAuth();

  const router = useRouter();

  /**
   * --- Redirect to dashboard if home view setting is Reports and user has permission ---
   */

  React.useEffect(() => {
    if (!user) return;
    const hasDashboardPermission =
      user.role === UserRoles.Admin || user.role === UserRoles.ProjectManager;
    if (
      user.settings.homeView === UserHomeViewSettings.GeneralReports &&
      hasDashboardPermission
    ) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  /**
   * --- Variables ---
   */

  const tabCatalog = React.useMemo(() => {
    return {
      DailyReports: {
        tab: (
          <Tab onDoubleClick={() => router.push("/daily-reports")}>
            Daily Reports
          </Tab>
        ),
        panel: <DailyReportFullPageList hideBreadcrumbs />,
      },
      CurrentMasterReport: {
        tab: (
          <Tab onDoubleClick={() => router.push("/current-master")}>
            Master Report
          </Tab>
        ),
        panel: <CurrentJobsiteYearMasterReport />,
      },
      OperatorDailyReports: {
        tab: (
          <Tab onDoubleClick={() => router.push("/operator-daily-reports")}>
            Operator Daily Reports
          </Tab>
        ),
        panel: <OperatorDailyReportFullPageList hideBreadcrumbs />,
      },
      VehicleIssues: {
        tab: (
          <Tab onDoubleClick={() => router.push("/vehicle-issues")}>
            Vehicle Issues
          </Tab>
        ),
        panel: <VehicleIssueFullPageList hideBreadcrumbs />,
      },
    };
  }, [router]);

  /**
   * --- Rendering ---
   */

  const tabs = React.useMemo(() => {
    const userTabs: ITabCatalogItem[] = [];

    if (user) {
      if (user.role === UserRoles.Admin) {
        // Admin
        userTabs.push(...Object.values(tabCatalog));
      } else if (user.role === UserRoles.ProjectManager) {
        // Project Manager
        if (user.types?.includes(UserTypes.Operations)) {
          userTabs.push(tabCatalog.DailyReports);
          userTabs.push(tabCatalog.CurrentMasterReport);
        }

        if (user.types?.includes(UserTypes.VehicleMaintenance)) {
          userTabs.push(tabCatalog.OperatorDailyReports);
          userTabs.push(tabCatalog.VehicleIssues);
        }

        if (!user.types) userTabs.push(tabCatalog.DailyReports);
      } else if (user.role === UserRoles.User) {
        // User
        if (user.types?.includes(UserTypes.Operations)) {
          userTabs.push(tabCatalog.DailyReports);
        }

        if (user.types?.includes(UserTypes.VehicleMaintenance)) {
          userTabs.push(tabCatalog.OperatorDailyReports);
        }

        if (!user.types) userTabs.push(tabCatalog.DailyReports);
      }
    }

    return userTabs;
  }, [tabCatalog, user]);

  return (
    <Container>
      {tabs.length > 0 ? (
        <Tabs isFitted>
          <TabList>{tabs.map((tab) => tab.tab)}</TabList>

          <TabPanels>
            {tabs.map((tab, index) => (
              <TabPanel key={index}>{tab.panel}</TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      ) : (
        <Loading />
      )}
    </Container>
  );
};

export default Home;
