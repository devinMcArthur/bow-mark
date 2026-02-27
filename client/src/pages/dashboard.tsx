import React from "react";
import {
  Box, Button, ButtonGroup, Flex,
  HStack, Input, Tab, TabList, TabPanel,
  TabPanels, Tabs, Text,
} from "@chakra-ui/react";
import { NextPage } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Permission from "../components/Common/Permission";
import { UserRoles } from "../generated/graphql";

const Overview = dynamic<{ startDate: string; endDate: string }>(
  () => import("../components/pages/dashboard/Overview"),
  { ssr: false }
);
const Financial = dynamic<{ startDate: string; endDate: string }>(
  () => import("../components/pages/dashboard/Financial"),
  { ssr: false }
);
const Productivity = dynamic<{ startDate: string; endDate: string }>(
  () => import("../components/pages/dashboard/Productivity"),
  { ssr: false }
);

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

type ActivePreset = "thisYear" | "lastYear" | "last6Months" | null;

const detectPreset = (start: string, end: string): ActivePreset => {
  const today = new Date();
  const todayStr = toDateInput(today);
  if (
    start === toDateInput(new Date(today.getFullYear(), 0, 1)) &&
    end === todayStr
  )
    return "thisYear";
  const y = today.getFullYear() - 1;
  if (
    start === toDateInput(new Date(y, 0, 1)) &&
    end === toDateInput(new Date(y, 11, 31))
  )
    return "lastYear";
  return null;
};

const getDefaultRange = () => {
  const today = new Date();
  return {
    startDate: toDateInput(new Date(today.getFullYear(), 0, 1)),
    endDate: toDateInput(today),
  };
};

const DashboardPage: NextPage = () => {
  const router = useRouter();
  const defaults = getDefaultRange();
  const [startDate, setStartDate] = React.useState(defaults.startDate);
  const [endDate, setEndDate] = React.useState(defaults.endDate);
  const [tabIndex, setTabIndex] = React.useState(0);
  const [activePreset, setActivePreset] = React.useState<ActivePreset>("thisYear");

  // Hydrate state from URL query params once router is ready
  React.useEffect(() => {
    if (!router.isReady) return;
    const { startDate: qs, endDate: qe, tab: qt } = router.query;
    const resolvedStart = typeof qs === "string" ? qs : defaults.startDate;
    const resolvedEnd = typeof qe === "string" ? qe : toDateInput(new Date());
    setStartDate(resolvedStart);
    setEndDate(resolvedEnd);
    setActivePreset(detectPreset(resolvedStart, resolvedEnd));
    if (typeof qt === "string") {
      const idx = parseInt(qt, 10);
      if (idx >= 0 && idx <= 2) setTabIndex(idx);
    }
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep URL in sync with current state.
  // endDate is omitted when it equals today so that revisiting the URL
  // on a future day automatically uses the new current date.
  React.useEffect(() => {
    if (!router.isReady) return;
    const query: Record<string, string | number> = { startDate, tab: tabIndex };
    if (endDate !== toDateInput(new Date())) query.endDate = endDate;
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [startDate, endDate, tabIndex, router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const setThisYear = () => {
    const today = new Date();
    setStartDate(toDateInput(new Date(today.getFullYear(), 0, 1)));
    setEndDate(toDateInput(today));
    setActivePreset("thisYear");
  };

  const setLastYear = () => {
    const y = new Date().getFullYear() - 1;
    setStartDate(toDateInput(new Date(y, 0, 1)));
    setEndDate(toDateInput(new Date(y, 11, 31)));
    setActivePreset("lastYear");
  };

  const setLast6Months = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    setStartDate(toDateInput(start));
    setEndDate(toDateInput(end));
    setActivePreset("last6Months");
  };

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Box p={4} h="100vh" w="100%" display="flex" flexDirection="column" overflow="hidden">
        <Tabs variant="enclosed" index={tabIndex} onChange={setTabIndex}
          display="flex" flexDirection="column" flex={1} minH={0} w="100%">
          {/* Tabs and date controls on one line, sharing the bottom border */}
          <Flex
            align="flex-end"
            justify="space-between"
            borderBottom="1px solid"
            borderColor="inherit"
            flexShrink={0}
            flexWrap="wrap"
            gap={2}
          >
            <TabList borderBottom="none">
              <Tab>Overview</Tab>
              <Tab>Financial</Tab>
              <Tab>Productivity</Tab>
            </TabList>
            <HStack spacing={2} wrap="wrap" pb="1px">
              <ButtonGroup size="sm" isAttached variant="outline">
                <Button
                  onClick={setThisYear}
                  colorScheme={activePreset === "thisYear" ? "blue" : "gray"}
                  variant={activePreset === "thisYear" ? "solid" : "outline"}
                >
                  This Year
                </Button>
                <Button
                  onClick={setLastYear}
                  colorScheme={activePreset === "lastYear" ? "blue" : "gray"}
                  variant={activePreset === "lastYear" ? "solid" : "outline"}
                >
                  Last Year
                </Button>
                <Button
                  onClick={setLast6Months}
                  colorScheme={activePreset === "last6Months" ? "blue" : "gray"}
                  variant={activePreset === "last6Months" ? "solid" : "outline"}
                >
                  Last 6 Months
                </Button>
              </ButtonGroup>
              <HStack spacing={1}>
                <Text fontSize="sm" color="gray.500">From</Text>
                <Input type="date" size="sm" w="150px" value={startDate}
                  onChange={e => { setStartDate(e.target.value); setActivePreset(null); }} />
                <Text fontSize="sm" color="gray.500">to</Text>
                <Input type="date" size="sm" w="150px" value={endDate}
                  onChange={e => { setEndDate(e.target.value); setActivePreset(null); }} />
              </HStack>
            </HStack>
          </Flex>
          <TabPanels flex={1} minH={0} overflow="hidden" w="100%">
            <TabPanel h="100%" w="100%" p={0} pt={4} overflow="hidden">
              <Overview startDate={startDate} endDate={endDate} />
            </TabPanel>
            <TabPanel h="100%" w="100%" p={0} pt={4} overflow="hidden">
              <Financial startDate={startDate} endDate={endDate} />
            </TabPanel>
            <TabPanel h="100%" w="100%" p={0} pt={4} overflow="hidden">
              <Productivity startDate={startDate} endDate={endDate} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Permission>
  );
};

export default DashboardPage;
