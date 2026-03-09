import React from "react";
import {
  Box, Button, ButtonGroup, Flex,
  HStack, Input, Menu, MenuButton, MenuItem, MenuList,
  Tab, TabList, TabPanel,
  TabPanels, Tabs, Text,
} from "@chakra-ui/react";
import { NextPage } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { FiChevronDown } from "react-icons/fi";
import Permission from "../components/Common/Permission";
import { UserRoles } from "../generated/graphql";
import { navbarHeight } from "../constants/styles";

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

type ActivePreset = string | null; // year string (e.g. "2026")

const THIS_YEAR = new Date().getFullYear();
const PAST_YEARS = Array.from({ length: 5 }, (_, i) => THIS_YEAR - 1 - i);

const getYearRange = (year: number) => {
  const today = new Date();
  return {
    startDate: toDateInput(new Date(year, 0, 1)),
    endDate: year === today.getFullYear() ? toDateInput(today) : toDateInput(new Date(year, 11, 31)),
  };
};

const detectPreset = (start: string, end: string): ActivePreset => {
  const thisYearRange = getYearRange(THIS_YEAR);
  if (start === thisYearRange.startDate && end === thisYearRange.endDate) return String(THIS_YEAR);
  for (const y of PAST_YEARS) {
    const r = getYearRange(y);
    if (start === r.startDate && end === r.endDate) return String(y);
  }
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
  const [activePreset, setActivePreset] = React.useState<ActivePreset>(String(THIS_YEAR));

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

  const setYear = (year: number) => {
    const range = getYearRange(year);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setActivePreset(String(year));
  };

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Box p={4} h={`calc(100vh - ${navbarHeight})`} w="100%" display="flex" flexDirection="column" overflow="hidden">
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
                  onClick={() => setYear(THIS_YEAR)}
                  colorScheme={activePreset === String(THIS_YEAR) ? "blue" : "gray"}
                  variant={activePreset === String(THIS_YEAR) ? "solid" : "outline"}
                >
                  This Year
                </Button>
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<FiChevronDown />}
                    colorScheme={PAST_YEARS.some(y => activePreset === String(y)) ? "blue" : "gray"}
                    variant={PAST_YEARS.some(y => activePreset === String(y)) ? "solid" : "outline"}
                  >
                    {PAST_YEARS.some(y => activePreset === String(y)) ? activePreset : THIS_YEAR - 1}
                  </MenuButton>
                  <MenuList minW="0" w="100px">
                    {PAST_YEARS.map((y) => (
                      <MenuItem key={y} fontSize="sm" onClick={() => setYear(y)}>
                        {y}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
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
          <TabPanels flex={1} minH={0} overflowY="auto" w="100%">
            <TabPanel w="100%" p={0} pt={4}>
              <Overview startDate={startDate} endDate={endDate} />
            </TabPanel>
            <TabPanel w="100%" p={0} pt={4}>
              <Financial startDate={startDate} endDate={endDate} />
            </TabPanel>
            <TabPanel w="100%" p={0} pt={4}>
              <Productivity startDate={startDate} endDate={endDate} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Permission>
  );
};

export default DashboardPage;
