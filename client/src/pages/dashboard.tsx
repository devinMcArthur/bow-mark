import React from "react";
import {
  Box, Button, Flex, Input, Menu, MenuButton, MenuItem, MenuList,
  Popover, PopoverArrow, PopoverBody, PopoverContent, PopoverTrigger,
  Tab, TabList, TabPanel, TabPanels, Tabs, Text,
} from "@chakra-ui/react";
import { NextPage } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { FiCalendar, FiChevronDown } from "react-icons/fi";
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

// Format a Date as a local-timezone YYYY-MM-DD string.
// Using toISOString() would convert to UTC first, which shifts Jan 1 local
// midnight to Dec 31 in any timezone west of UTC (e.g. all of North America),
// causing "This Year" preset highlights to mismatch the displayed date pickers.
const toDateInput = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const THIS_YEAR = new Date().getFullYear();
// Past years shown in the dropdown — grows as the app ages
const PAST_YEARS = Array.from({ length: THIS_YEAR - 2020 }, (_, i) => THIS_YEAR - 1 - i);

const getYearRange = (year: number) => {
  const today = new Date();
  return {
    startDate: toDateInput(new Date(year, 0, 1)),
    endDate: year === today.getFullYear() ? toDateInput(today) : toDateInput(new Date(year, 11, 31)),
  };
};

const detectPreset = (start: string, end: string): number | null => {
  for (const y of [THIS_YEAR, ...PAST_YEARS]) {
    const r = getYearRange(y);
    if (start === r.startDate && end === r.endDate) return y;
  }
  return null;
};

const formatDateRange = (start: string, end: string) => {
  const fmt = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const startYear = new Date(start + "T00:00:00").getFullYear();
  const endYear = new Date(end + "T00:00:00").getFullYear();
  if (startYear === endYear) return `${fmt(start)} – ${fmt(end)}, ${startYear}`;
  return `${fmt(start)}, ${startYear} – ${fmt(end)}, ${endYear}`;
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
  const [activePreset, setActivePreset] = React.useState<number | null>(THIS_YEAR);
  // Staging state inside popover — only committed on Apply
  const [draftStart, setDraftStart] = React.useState(defaults.startDate);
  const [draftEnd, setDraftEnd] = React.useState(defaults.endDate);

  React.useEffect(() => {
    if (!router.isReady) return;
    const { startDate: qs, endDate: qe, tab: qt } = router.query;
    const resolvedStart = typeof qs === "string" ? qs : defaults.startDate;
    const resolvedEnd = typeof qe === "string" ? qe : toDateInput(new Date());
    setStartDate(resolvedStart);
    setEndDate(resolvedEnd);
    setDraftStart(resolvedStart);
    setDraftEnd(resolvedEnd);
    setActivePreset(detectPreset(resolvedStart, resolvedEnd));
    if (typeof qt === "string") {
      const idx = parseInt(qt, 10);
      if (idx >= 0 && idx <= 2) setTabIndex(idx);
    }
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setActivePreset(year);
  };

  const isCustom = activePreset === null;

  const isPastYear = activePreset !== null && activePreset !== THIS_YEAR;

  const dateFilter = (
    <Flex align="center" gap={1.5} wrap="wrap">
      {/* This Year */}
      <Button
        size="sm"
        variant={activePreset === THIS_YEAR ? "solid" : "ghost"}
        colorScheme={activePreset === THIS_YEAR ? "blue" : "gray"}
        fontWeight={activePreset === THIS_YEAR ? "600" : "400"}
        color={activePreset === THIS_YEAR ? undefined : "gray.600"}
        onClick={() => setYear(THIS_YEAR)}
        px={3} h="28px" fontSize="sm" borderRadius="full"
      >
        This Year
      </Button>

      {/* Past years dropdown */}
      <Menu>
        <MenuButton
          as={Button}
          size="sm"
          variant={isPastYear ? "solid" : "ghost"}
          colorScheme={isPastYear ? "blue" : "gray"}
          fontWeight={isPastYear ? "600" : "400"}
          color={isPastYear ? undefined : "gray.600"}
          rightIcon={<FiChevronDown size={12} />}
          px={3} h="28px" fontSize="sm" borderRadius="full"
        >
          {isPastYear ? activePreset : "Past Year"}
        </MenuButton>
        <MenuList minW="120px" maxH="240px" overflowY="auto">
          {PAST_YEARS.map((y) => (
            <MenuItem key={y} fontSize="sm" onClick={() => setYear(y)}>
              {y}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      <Popover placement="bottom-end" onOpen={() => { setDraftStart(startDate); setDraftEnd(endDate); }}>
        {({ onClose }) => (
          <>
            <PopoverTrigger>
              <Button
                size="sm"
                variant={isCustom ? "solid" : "ghost"}
                colorScheme={isCustom ? "blue" : "gray"}
                fontWeight={isCustom ? "600" : "400"}
                color={isCustom ? undefined : "gray.600"}
                leftIcon={<FiCalendar size={13} />}
                px={3}
                h="28px"
                fontSize="sm"
                borderRadius="full"
              >
                {isCustom ? formatDateRange(startDate, endDate) : "Custom"}
              </Button>
            </PopoverTrigger>
            <PopoverContent w="260px" shadow="lg">
              <PopoverArrow />
              <PopoverBody p={4}>
                <Flex direction="column" gap={3}>
                  <Flex direction="column" gap={1}>
                    <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                      From
                    </Text>
                    <Input
                      type="date"
                      size="sm"
                      value={draftStart}
                      onChange={e => setDraftStart(e.target.value)}
                    />
                  </Flex>
                  <Flex direction="column" gap={1}>
                    <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                      To
                    </Text>
                    <Input
                      type="date"
                      size="sm"
                      value={draftEnd}
                      onChange={e => setDraftEnd(e.target.value)}
                    />
                  </Flex>
                  <Flex gap={2} justify="flex-end" pt={1}>
                    <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => {
                        setStartDate(draftStart);
                        setEndDate(draftEnd);
                        setActivePreset(null);
                        onClose();
                      }}
                    >
                      Apply
                    </Button>
                  </Flex>
                </Flex>
              </PopoverBody>
            </PopoverContent>
          </>
        )}
      </Popover>
    </Flex>
  );

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Box
        px={{ base: 3, md: 5 }}
        pt={{ base: 3, md: 4 }}
        h={`calc(100vh - ${navbarHeight})`}
        w="100%"
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        <Tabs
          variant="line"
          index={tabIndex}
          onChange={setTabIndex}
          display="flex"
          flexDirection="column"
          flex={1}
          minH={0}
          w="100%"
        >
          {/* Mobile: date filter above tabs */}
          <Box display={{ base: "block", md: "none" }} mb={3} flexShrink={0}>
            {dateFilter}
          </Box>

          <Flex
            align="center"
            justify="space-between"
            borderBottom="2px solid"
            borderColor="gray.100"
            flexShrink={0}
            gap={4}
          >
            <TabList border="none" gap={1}>
              {["Overview", "Financial", "Productivity"].map((label) => (
                <Tab
                  key={label}
                  px={3}
                  pb={3}
                  pt={1}
                  fontSize="sm"
                  fontWeight="500"
                  color="gray.500"
                  borderBottom="2px solid transparent"
                  mb="-2px"
                  _selected={{
                    color: "blue.600",
                    borderColor: "blue.500",
                    fontWeight: "600",
                  }}
                  _hover={{ color: "gray.700" }}
                >
                  {label}
                </Tab>
              ))}
            </TabList>

            {/* Desktop: date filter right of tabs */}
            <Box display={{ base: "none", md: "block" }} pb={2}>
              {dateFilter}
            </Box>
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
