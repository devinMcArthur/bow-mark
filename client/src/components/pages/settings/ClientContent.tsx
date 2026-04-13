import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { UserRoles } from "../../../generated/graphql";
import { useAuth } from "../../../contexts/Auth";
import hasPermission from "../../../utils/hasPermission";
import CompanySettings from "./views/Companies";
import CrewKindSettings from "./views/CrewKinds";
import MaterialSettings from "./views/Materials";
import ProfileSettings from "./views/Profile";
import PublicDocumentsSettings from "./views/PublicDocuments";
import SystemSettings from "./views/System";
import UserSettings from "./views/Users";

// Tab definitions — each entry has a key (for URL params), label, component,
// and a minimum role. The visible tabs list is computed from the user's role,
// so Chakra's tab index always matches the rendered <Tab>/<TabPanel> order.
interface TabDef {
  key: string;
  label: string;
  component: React.FC;
  minRole: UserRoles;
}

const ALL_TABS: TabDef[] = [
  { key: "profile", label: "Profile", component: ProfileSettings, minRole: UserRoles.User },
  { key: "system", label: "System", component: SystemSettings, minRole: UserRoles.ProjectManager },
  { key: "materials", label: "Materials", component: MaterialSettings, minRole: UserRoles.ProjectManager },
  { key: "companies", label: "Companies", component: CompanySettings, minRole: UserRoles.ProjectManager },
  { key: "crewkinds", label: "Crew Kinds", component: CrewKindSettings, minRole: UserRoles.Admin },
  { key: "users", label: "Users", component: UserSettings, minRole: UserRoles.ProjectManager },
  { key: "publicdocuments", label: "Public Documents", component: PublicDocumentsSettings, minRole: UserRoles.ProjectManager },
];

const SettingsClientContent = () => {
  const router = useRouter();
  const { state: { user } } = useAuth();

  // Build the visible tabs from the user's role. This avoids the tab-index
  // mismatch that happens with conditional {show && <Tab>} rendering, where
  // the static key array disagrees with the rendered element count.
  const visibleTabs = React.useMemo(
    () => ALL_TABS.filter((t) => hasPermission(user?.role, t.minRole)),
    [user?.role]
  );

  const resolveIndex = React.useCallback(
    (key: string | null) => {
      if (!key) return 0;
      const idx = visibleTabs.findIndex((t) => t.key === key);
      return idx >= 0 ? idx : 0;
    },
    [visibleTabs]
  );

  const [tabIndex, setTabIndex] = React.useState(() => {
    if (typeof window === "undefined") return 0;
    const tab = new URLSearchParams(window.location.search).get("tab");
    return resolveIndex(tab);
  });

  // Re-resolve when the user loads (role may go from undefined → real).
  React.useEffect(() => {
    if (user === undefined) return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    setTabIndex(resolveIndex(tab));
  }, [user, resolveIndex]);

  const handleTabChange = (index: number) => {
    setTabIndex(index);
    const key = visibleTabs[index]?.key ?? "profile";
    router.replace(
      { pathname: router.pathname, query: { tab: key } },
      undefined,
      { shallow: true }
    );
  };

  return (
    <Tabs isFitted mt={2} index={tabIndex} onChange={handleTabChange}>
      <TabList>
        {visibleTabs.map((t) => (
          <Tab key={t.key}>{t.label}</Tab>
        ))}
      </TabList>
      <TabPanels>
        {visibleTabs.map((t) => (
          <TabPanel key={t.key}>
            <t.component />
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};

export default SettingsClientContent;
