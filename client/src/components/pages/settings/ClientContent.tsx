import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { UserRoles } from "../../../generated/graphql";
import Permission from "../../Common/Permission";
import CompanySettings from "./views/Companies";
import MaterialSettings from "./views/Materials";
import ProfileSettings from "./views/Profile";
import SystemSettings from "./views/System";
import UserSettings from "./views/Users";

const SettingsClientContent = () => {
  return (
    <Tabs isFitted mt={2}>
      <TabList>
        <Tab>Profile</Tab>
        <Permission minRole={UserRoles.ProjectManager}>
          <Tab>System</Tab>
          <Tab>Materials</Tab>
          <Tab>Companies</Tab>
          <Tab>Users</Tab>
        </Permission>
      </TabList>
      <TabPanels>
        <TabPanel>
          <ProfileSettings />
        </TabPanel>
        <TabPanel>
          <SystemSettings />
        </TabPanel>
        <TabPanel>
          <MaterialSettings />
        </TabPanel>
        <TabPanel>
          <CompanySettings />
        </TabPanel>
        <TabPanel>
          <UserSettings />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default SettingsClientContent;
