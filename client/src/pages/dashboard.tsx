import React from "react";
import {
  Box, Button, ButtonGroup, Flex, Heading,
  HStack, Input, Tab, TabList, TabPanel,
  TabPanels, Tabs, Text,
} from "@chakra-ui/react";
import { NextPage } from "next";

const Overview = React.lazy(() => import("../components/pages/dashboard/Overview"));
const Financial = React.lazy(() => import("../components/pages/dashboard/Financial"));
const Productivity = React.lazy(() => import("../components/pages/dashboard/Productivity"));

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

const getDefaultRange = () => {
  const today = new Date();
  return {
    startDate: toDateInput(new Date(today.getFullYear(), 0, 1)),
    endDate: toDateInput(today),
  };
};

const DashboardPage: NextPage = () => {
  const defaults = getDefaultRange();
  const [startDate, setStartDate] = React.useState(defaults.startDate);
  const [endDate, setEndDate] = React.useState(defaults.endDate);
  const [tabIndex, setTabIndex] = React.useState(0);

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
    <Box p={4} h="100vh" display="flex" flexDirection="column" overflow="hidden">
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
        display="flex" flexDirection="column" flex={1} minH={0}>
        <TabList flexShrink={0}>
          <Tab>Overview</Tab>
          <Tab>Financial</Tab>
          <Tab>Productivity</Tab>
        </TabList>
        <TabPanels flex={1} minH={0} overflow="hidden">
          <TabPanel h="100%" p={0} pt={4} overflow="hidden">
            <React.Suspense fallback={null}>
              <Overview startDate={startDate} endDate={endDate} />
            </React.Suspense>
          </TabPanel>
          <TabPanel h="100%" p={0} pt={4} overflow="hidden">
            <React.Suspense fallback={null}>
              <Financial startDate={startDate} endDate={endDate} />
            </React.Suspense>
          </TabPanel>
          <TabPanel h="100%" p={0} pt={4} overflow="hidden">
            <React.Suspense fallback={null}>
              <Productivity startDate={startDate} endDate={endDate} />
            </React.Suspense>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default DashboardPage;
