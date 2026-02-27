import React from "react";
import {
  Box, Button, ButtonGroup, Flex, Heading,
  HStack, Input, Tab, TabList, TabPanel,
  TabPanels, Tabs, Text,
} from "@chakra-ui/react";
import { NextPage } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

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

  // Hydrate state from URL query params once router is ready
  React.useEffect(() => {
    if (!router.isReady) return;
    const { startDate: qs, endDate: qe, tab: qt } = router.query;
    if (typeof qs === "string") setStartDate(qs);
    if (typeof qe === "string") setEndDate(qe);
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
  };

  const setLastYear = () => {
    const y = new Date().getFullYear() - 1;
    setStartDate(toDateInput(new Date(y, 0, 1)));
    setEndDate(toDateInput(new Date(y, 11, 31)));
  };

  const setLast6Months = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    setStartDate(toDateInput(start));
    setEndDate(toDateInput(end));
  };

  return (
    <Box p={4} h="100vh" w="100%" display="flex" flexDirection="column" overflow="hidden">
      <Flex align="center" justify="space-between" mb={4} wrap="wrap" gap={2} flexShrink={0}>
        <Heading size="lg">Business Dashboard</Heading>
        <HStack spacing={2} wrap="wrap">
          <ButtonGroup size="sm" variant="outline">
            <Button onClick={setThisYear}>This Year</Button>
            <Button onClick={setLastYear}>Last Year</Button>
            <Button onClick={setLast6Months}>Last 6 Months</Button>
          </ButtonGroup>
          <HStack spacing={1}>
            <Text fontSize="sm" color="gray.500">From</Text>
            <Input type="date" size="sm" w="150px" value={startDate}
              onChange={e => setStartDate(e.target.value)} />
            <Text fontSize="sm" color="gray.500">to</Text>
            <Input type="date" size="sm" w="150px" value={endDate}
              onChange={e => setEndDate(e.target.value)} />
          </HStack>
        </HStack>
      </Flex>

      <Tabs variant="enclosed" index={tabIndex} onChange={setTabIndex}
        display="flex" flexDirection="column" flex={1} minH={0} w="100%">
        <TabList flexShrink={0}>
          <Tab>Overview</Tab>
          <Tab>Financial</Tab>
          <Tab>Productivity</Tab>
        </TabList>
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
  );
};

export default DashboardPage;
