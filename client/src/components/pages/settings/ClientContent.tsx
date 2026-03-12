import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { UserRoles } from "../../../generated/graphql";
import { useAuth } from "../../../contexts/Auth";
import CompanySettings from "./views/Companies";
import MaterialSettings from "./views/Materials";
import ProfileSettings from "./views/Profile";
import SystemSettings from "./views/System";
import UserSettings from "./views/Users";

const TAB_NAMES = ["profile", "system", "materials", "companies", "users"] as const;
type TabName = typeof TAB_NAMES[number];
const PM_TABS: TabName[] = ["system", "materials", "companies", "users"];

const SettingsClientContent = () => {
  const router = useRouter();
  const { state: { user } } = useAuth();
  const isPM = user?.role === UserRoles.Admin || user?.role === UserRoles.ProjectManager;

  const [tabIndex, setTabIndex] = React.useState(() => {
    if (typeof window === "undefined") return 0;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (!tab || !TAB_NAMES.includes(tab as TabName)) return 0;
    return TAB_NAMES.indexOf(tab as TabName);
  });

  // Once user is resolved, fall back to Profile if they lack PM access
  React.useEffect(() => {
    if (user === undefined) return;
    if (!isPM && PM_TABS.includes(TAB_NAMES[tabIndex])) setTabIndex(0);
  }, [user, isPM, tabIndex]);

  const handleTabChange = (index: number) => {
    setTabIndex(index);
    router.replace(
      { pathname: router.pathname, query: { tab: TAB_NAMES[index] } },
      undefined,
      { shallow: true }
    );
  };

  return (
    <Tabs isFitted mt={2} index={tabIndex} onChange={handleTabChange}>
      <TabList>
        <Tab>Profile</Tab>
        {isPM && <Tab>System</Tab>}
        {isPM && <Tab>Materials</Tab>}
        {isPM && <Tab>Companies</Tab>}
        {isPM && <Tab>Users</Tab>}
      </TabList>
      <TabPanels>
        <TabPanel>
          <ProfileSettings />
        </TabPanel>
        {isPM && <TabPanel><SystemSettings /></TabPanel>}
        {isPM && <TabPanel><MaterialSettings /></TabPanel>}
        {isPM && <TabPanel><CompanySettings /></TabPanel>}
        {isPM && <TabPanel><UserSettings /></TabPanel>}
      </TabPanels>
    </Tabs>
  );
};

export default SettingsClientContent;
