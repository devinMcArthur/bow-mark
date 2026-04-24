import {
  Badge,
  Box,
  Flex,
  HStack,
  IconButton,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import {
  FiBox,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiTool,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import {
  DailyReportCardSnippetFragment,
  UserRoles,
} from "../../../generated/graphql";
import { useRouter } from "next/router";
import createLink from "../../../utils/createLink";
import jobsiteName from "../../../utils/jobsiteName";
import Card from "../Card";
import Permission from "../Permission";
import TextLink from "../TextLink";
import DailyReportClientContent from "../../pages/daily-reports/id/ClientContent";

interface IDailyReportCard {
  dailyReport: DailyReportCardSnippetFragment;
  /**
   * When true, drop the jobsite from the title and hide the "Jobsite:"
   * row. Used when the card renders on a jobsite page, where the
   * jobsite context is already established and repeating it is noise.
   */
  hideJobsite?: boolean;
}

/**
 * Single stat cell for the summary strip — icon + count + label.
 * Muted when the count is zero so the strip reads "what's actually on
 * this report" at a glance; non-zero stats bolden.
 */
const SummaryStat: React.FC<{
  icon: React.ElementType;
  value: number;
  label: string;
}> = ({ icon: IconComponent, value, label }) => {
  const muted = value === 0;
  return (
    <Flex align="center" gap={1.5} color={muted ? "gray.400" : "gray.700"}>
      <IconComponent size={16} />
      <Text fontSize="sm" fontWeight={muted ? "normal" : "semibold"}>
        {value}
      </Text>
      <Text fontSize="xs" color={muted ? "gray.400" : "gray.500"}>
        {value === 1 ? label : `${label}s`}
      </Text>
    </Flex>
  );
};

/**
 * Tints the date block based on completion state — green when both
 * job-cost and payroll are signed off, yellow when one, gray when
 * neither. Lets someone skimming a long list spot "still open" reports
 * at a glance without parsing the status chips.
 */
function dateBlockScheme(jobCostApproved: boolean, payrollComplete: boolean): {
  bg: string;
  border: string;
  month: string;
  day: string;
  weekday: string;
} {
  const doneCount =
    (jobCostApproved ? 1 : 0) + (payrollComplete ? 1 : 0);
  if (doneCount === 2) {
    return {
      bg: "green.50",
      border: "green.200",
      month: "green.700",
      day: "gray.800",
      weekday: "green.600",
    };
  }
  if (doneCount === 1) {
    return {
      bg: "yellow.50",
      border: "yellow.200",
      month: "yellow.700",
      day: "gray.800",
      weekday: "yellow.600",
    };
  }
  return {
    bg: "gray.50",
    border: "gray.200",
    month: "gray.600",
    day: "gray.800",
    weekday: "gray.500",
  };
}

const DailyReportCard = ({ dailyReport, hideJobsite }: IDailyReportCard) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = React.useState(false);
  // Track whether the body has ever been mounted. Once expanded, keep the
  // component mounted on collapse so Apollo's cache stays warm and toggling
  // again is instant — but never mount at all until the first expand.
  const [hasEverExpanded, setHasEverExpanded] = React.useState(false);

  const toggleExpanded = React.useCallback(() => {
    setIsExpanded((v) => {
      if (!v) setHasEverExpanded(true);
      return !v;
    });
  }, []);

  const date = dayjs(dailyReport.date);
  const scheme = dateBlockScheme(
    !!dailyReport.jobCostApproved,
    !!dailyReport.payrollComplete
  );

  const reportHref = createLink.dailyReport(dailyReport._id);

  // Card-wide click navigates to the daily report. Crew/jobsite links and
  // action buttons stop propagation so they keep their own targets.
  const onCardClick = React.useCallback(() => {
    router.push(reportHref);
  }, [router, reportHref]);

  // Keyboard affordance — Enter/Space on the card opens the report, matching
  // the visible cursor:pointer.
  const onCardKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        router.push(reportHref);
      }
    },
    [router, reportHref]
  );

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Card
      cursor="pointer"
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Open daily report for ${date.format("dddd, MMMM D, YYYY")}`}
    >
      <Flex align="stretch" gap={3}>
        {/* Date block — visual anchor on the left, status-tinted.
            Card-wide click handles navigation; this block is just a visual. */}
        <Flex
          flexDir="column"
          align="center"
          justify="center"
          flexShrink={0}
          minW="64px"
          px={5}
          py={1}
          bg={scheme.bg}
          borderWidth="1px"
          borderColor={scheme.border}
          borderRadius="md"
        >
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            color={scheme.month}
            lineHeight={1}
            mb={1}
          >
            {date.format("MMM")}
          </Text>
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color={scheme.day}
            lineHeight={1}
          >
            {date.format("D")}
          </Text>
          <Text fontSize="xs" color={scheme.weekday} mt={1} lineHeight={1}>
            {date.format("ddd")}
          </Text>
          <Text fontSize="2xs" color={scheme.weekday} mt={0.5} lineHeight={1}>
            {date.format("YYYY")}
          </Text>
        </Flex>

        {/* Info stack — crew (primary), jobsite (secondary), status chips */}
        <Flex flexDir="column" flex={1} minW={0} justify="center" gap={1}>
          {/* alignSelf="flex-start" keeps the clickable hit area hugging the
              text; clicking empty space to the right of the name still
              bubbles to the card-wide "open daily report" handler. */}
          <Box alignSelf="flex-start" onClick={stop}>
            <TextLink
              link={createLink.crew(dailyReport.crew._id)}
              fontWeight="bold"
              fontSize="lg"
            >
              {dailyReport.crew.name}
            </TextLink>
          </Box>
          {!hideJobsite && (
            <Box alignSelf="flex-start" onClick={stop}>
              <TextLink
                link={createLink.jobsite(dailyReport.jobsite._id)}
                fontSize="sm"
                color="gray.600"
              >
                {jobsiteName(
                  dailyReport.jobsite.name,
                  dailyReport.jobsite.jobcode
                )}
              </TextLink>
            </Box>
          )}
          {(dailyReport.jobCostApproved || dailyReport.payrollComplete) && (
            <HStack spacing={2} mt={1}>
              {dailyReport.jobCostApproved && (
                <Badge
                  colorScheme="green"
                  fontSize="0.7rem"
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                  px={2}
                  py={0.5}
                >
                  <FiCheck /> Approved
                </Badge>
              )}
              {dailyReport.payrollComplete && (
                <Badge
                  colorScheme="blue"
                  fontSize="0.7rem"
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                  px={2}
                  py={0.5}
                >
                  <FiCheck /> Payroll
                </Badge>
              )}
            </HStack>
          )}
        </Flex>

        {/* Summary metric strip — hidden until `lg` so the middle info
            stack has enough room for the crew name + jobsite at medium
            widths. At `lg`+ the card is wide enough that stats + info
            coexist comfortably. */}
        <HStack
          display={{ base: "none", lg: "flex" }}
          spacing={5}
          align="center"
          px={3}
          flexShrink={0}
        >
          <SummaryStat
            icon={FiUsers}
            value={dailyReport.employeeWorkCount}
            label="employee"
          />
          <SummaryStat
            icon={FiTruck}
            value={dailyReport.vehicleWorkCount}
            label="vehicle"
          />
          <SummaryStat
            icon={FiBox}
            value={dailyReport.materialShipmentCount}
            label="shipment"
          />
          <SummaryStat
            icon={FiTool}
            value={dailyReport.productionCount}
            label="production"
          />
        </HStack>

        {/* Actions — download + expand. stopPropagation so the card-wide
            click doesn't fire and navigate away. */}
        <HStack
          spacing={1}
          align="flex-start"
          flexShrink={0}
          onClick={stop}
        >
          <Permission minRole={UserRoles.ProjectManager}>
            <Tooltip label="Download Excel">
              <TextLink
                link={createLink.server_dailyReportExcelDownload(
                  dailyReport._id
                )}
                newTab
              >
                <IconButton
                  as="span"
                  aria-label="Download"
                  icon={<FiDownload />}
                  size="sm"
                  variant="ghost"
                />
              </TextLink>
            </Tooltip>
          </Permission>
          <Tooltip label={isExpanded ? "Collapse" : "Expand"}>
            <IconButton
              aria-label={isExpanded ? "Collapse report" : "Expand report"}
              icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
              size="sm"
              variant="ghost"
              onClick={toggleExpanded}
            />
          </Tooltip>
        </HStack>
      </Flex>

      {hasEverExpanded && (
        <Box
          display={isExpanded ? "block" : "none"}
          mt={3}
          mx={1}
          mb={1}
          px={3}
          py={4}
          bg="gray.100"
          borderRadius="md"
          boxShadow="inset 0 3px 5px -2px rgba(0,0,0,0.1), inset 0 -1px 3px -1px rgba(0,0,0,0.05), inset 2px 0 3px -2px rgba(0,0,0,0.05), inset -2px 0 3px -2px rgba(0,0,0,0.05)"
          onClick={stop}
          cursor="auto"
        >
          <DailyReportClientContent id={dailyReport._id} embedded inline />
        </Box>
      )}
    </Card>
  );
};

export default DailyReportCard;
