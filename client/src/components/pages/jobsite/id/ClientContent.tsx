import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  Link as ChakraLink,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  Tooltip,
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import React from "react";
import {
  FiArchive,
  FiBarChart2,
  FiClock,
  FiEdit,
  FiMapPin,
  FiMessageSquare,
  FiMoreVertical,
  FiNavigation,
  FiTrash,
  FiUnlock,
} from "react-icons/fi";
import ChatDrawer from "../../../Chat/ChatDrawer";
import EntityFileBrowser from "../../../FileBrowser/EntityFileBrowser";
import {
  useJobsiteAllDataLazyQuery,
  useJobsiteArchiveMutation,
  useJobsiteCurrentYearLazyQuery,
  useJobsiteFullQuery,
  useJobsiteUnarchiveMutation,
  UserRoles,
} from "../../../../generated/graphql";
import { JobsiteQueryKeys } from "../../../../utils/createLink";
import Card from "../../../Common/Card";
import DailyReportListCard from "../../../Common/DailyReport/DailyReportListCard";
import JobsiteMonthlyReportList from "../../../Common/JobsiteMonthlyReport/List";
import JobsiteYearlyReportList from "../../../Common/JobsiteYearReport/List";
import Loading from "../../../Common/Loading";
import Permission from "../../../Common/Permission";
import JobsiteUpdateForm from "../../../Forms/Jobsite/JobsiteUpdate";
import ExpenseInvoices from "./views/ExpenseInvoices";
import JobsiteInvoiceSearch from "./views/InvoiceSearch";
import JobsiteMaterialsCosting from "./views/JobsiteMaterials";
import JobsiteRemoveModal from "./views/RemoveModal";
import RevenueInvoices from "./views/RevenueInvoices";
import TruckingRates from "./views/TruckingRates";
import JobsiteContract from "./views/Contract";
import StaticMapThumbnail from "../../../Common/Map/StaticMapThumbnail";
import WeatherForecast from "../../../Common/Weather/WeatherForecast";
import JobsiteLocationModal from "./views/LocationModal";
import { useAuth } from "../../../../contexts/Auth";
import hasPermission from "../../../../utils/hasPermission";
import { getJobsiteChatConfig } from "../../../Chat/jobsiteChatConfig";

interface IJobsiteClientContent {
  id: string;
}

const JobsiteClientContent = ({ id }: IJobsiteClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, refetch } = useJobsiteFullQuery({
    variables: { id },
  });

  const [currentYearQuery, { data: currentYearData }] =
    useJobsiteCurrentYearLazyQuery({
      variables: {
        id,
      },
    });

  const [allDataQuery, { data: allData }] = useJobsiteAllDataLazyQuery({
    variables: { id },
  });

  const [archive, { loading: archiveLoading }] = useJobsiteArchiveMutation();

  const [unarchive, { loading: unarchiveLoading }] =
    useJobsiteUnarchiveMutation();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isOpenRemove,
    onOpen: onOpenRemove,
    onClose: onCloseRemove,
  } = useDisclosure();
  const { isOpen: isOpenLocation, onOpen: onOpenLocation, onClose: onCloseLocation } = useDisclosure();
  const { isOpen: chatOpen, onOpen: onChatOpen, onClose: onChatClose } = useDisclosure();

  const router = useRouter();

  const [previousYears, setPreviousYears] = React.useState(false);
  const [truckingOpen, setTruckingOpen] = React.useState(false);
  const [legacyReportsOpen, setLegacyReportsOpen] = React.useState(false);
  // Documents + Materials sit in a 2-col grid on `lg` and up. Only in
  // that layout do we want Documents to stretch to Materials' height —
  // on mobile/tablet the grid stacks and Documents should size
  // naturally instead of reserving a big empty box.
  const isDesktopTwoCol = useBreakpointValue(
    { base: false, lg: true },
    { ssr: false }
  );

  const { state: { user } } = useAuth();
  const { messageEndpoint: chatMessageEndpoint, conversationsEndpoint: chatConversationsEndpoint, suggestions: chatSuggestions } =
    getJobsiteChatConfig(user?.role, id);

  // Foremen (User role) only see their own DailyReports and don't get the
  // PM+ toggle UI — so always fetch all-years for them. PMs keep the
  // current-year default with the toggle as the opt-in.
  const isPmPlus = hasPermission(user?.role, UserRoles.ProjectManager);
  const effectivePreviousYears = previousYears || !isPmPlus;

  /**
   * ----- Variables -----
   */

  const jobsiteMaterialQuery = React.useMemo(() => {
    if (router.query[JobsiteQueryKeys.jobsiteMaterial])
      return router.query[JobsiteQueryKeys.jobsiteMaterial];
    else return null;
  }, [router]);

  const dailyReports = React.useMemo(() => {
    if (effectivePreviousYears) {
      return allData?.jobsite.dailyReports;
    } else {
      return currentYearData?.jobsite.yearsDailyReports;
    }
  }, [
    allData?.jobsite.dailyReports,
    currentYearData?.jobsite.yearsDailyReports,
    effectivePreviousYears,
  ]);

  const expenseInvoices = React.useMemo(() => {
    if (effectivePreviousYears) {
      return allData?.jobsite.expenseInvoices;
    } else {
      return currentYearData?.jobsite.yearsExpenseInvoices;
    }
  }, [
    allData?.jobsite.expenseInvoices,
    currentYearData?.jobsite.yearsExpenseInvoices,
    effectivePreviousYears,
  ]);

  const revenueInvoices = React.useMemo(() => {
    if (effectivePreviousYears) {
      return allData?.jobsite.revenueInvoices;
    } else {
      return currentYearData?.jobsite.yearsRevenueInvoices;
    }
  }, [
    allData?.jobsite.revenueInvoices,
    currentYearData?.jobsite.yearsRevenueInvoices,
    effectivePreviousYears,
  ]);

  /**
   * ----- Lifecycle -----
   */

  React.useEffect(() => {
    if (effectivePreviousYears && !allData?.jobsite) {
      allDataQuery();
    } else if (!effectivePreviousYears && !currentYearData?.jobsite) {
      currentYearQuery();
    }
  }, [
    allData?.jobsite,
    allDataQuery,
    currentYearData?.jobsite,
    currentYearQuery,
    effectivePreviousYears,
  ]);

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (data?.jobsite) {
      const { jobsite } = data;

      return (
        <Box>
          <Card variant="flat">
            <Flex
              flexDir="row"
              justifyContent="space-between"
              alignItems="center"
              gap={3}
            >
              <Flex
                minW={0}
                flex={1}
                pl={2}
                direction="column"
                justify="center"
              >
                <Text
                  fontSize="xl"
                  color="gray.700"
                  fontWeight="bold"
                  lineHeight="short"
                  noOfLines={2}
                  wordBreak="break-word"
                >
                  {jobsite.jobcode}
                </Text>
                {jobsite.description && (
                  <Text fontSize="sm" color="gray.600" mt={0.5}>
                    {jobsite.description}
                  </Text>
                )}
              </Flex>
              {/* Desktop: full icon cluster. Hidden on mobile where
                  the actions collapse into a single overflow menu
                  (below) — on narrow screens 6 icons + a pill wrap
                  awkwardly and crowd the hero. */}
              <Flex
                display={{ base: "none", md: "flex" }}
                direction="row"
                alignItems="center"
                gap={1}
              >
                {/* Previous years + Report are both about financial /
                    historical performance — gated to PM+ since the
                    surfaces they affect (Materials, Trucking Rates,
                    Invoices, Year/Month reports, Documents) are
                    Permission-gated below as well. Showing them to
                    foremen is misleading. */}
                <Permission minRole={UserRoles.ProjectManager}>
                  <Tooltip
                    label={
                      previousYears
                        ? "Hide previous years' data"
                        : "Show previous years' data"
                    }
                  >
                    <Badge
                      px={3}
                      h="28px"
                      display="inline-flex"
                      alignItems="center"
                      fontSize="xs"
                      lineHeight={1}
                      borderRadius="full"
                      colorScheme={previousYears ? "blue" : "gray"}
                      variant={previousYears ? "solid" : "subtle"}
                      cursor="pointer"
                      userSelect="none"
                      onClick={() => setPreviousYears(!previousYears)}
                    >
                      {previousYears ? "✓ Previous years" : "Previous years"}
                    </Badge>
                  </Tooltip>
                </Permission>
                {/* Location actions — kept as icon buttons to fit the
                    cluster aesthetic. When location is set, the green
                    navigation icon is the primary action (opens Google
                    Maps directions); admins also see a small map-pin
                    icon for re-editing. When unset, only admins see a
                    grey map-pin that opens the editor. */}
                {jobsite.location ? (
                  <>
                    <Tooltip label="Get directions">
                      <ChakraLink
                        href={`https://www.google.com/maps/dir/?api=1&destination=${jobsite.location.latitude},${jobsite.location.longitude}`}
                        isExternal
                        _hover={{ textDecoration: "none" }}
                      >
                        <IconButton
                          as="span"
                          aria-label="Get directions"
                          icon={<FiNavigation />}
                          backgroundColor="transparent"
                          color="green.600"
                        />
                      </ChakraLink>
                    </Tooltip>
                    <Permission>
                      <Tooltip label="Edit location">
                        <IconButton
                          aria-label="Edit location"
                          icon={<FiMapPin />}
                          backgroundColor="transparent"
                          onClick={() => onOpenLocation()}
                        />
                      </Tooltip>
                    </Permission>
                  </>
                ) : (
                  // No location set yet — promote to a full-width
                  // CTA-style button so PMs can't miss it. The
                  // satellite + weather strip won't render until this
                  // is filled in, so the hero is visibly impoverished
                  // without it.
                  <Permission>
                    <Button
                      leftIcon={<FiMapPin />}
                      colorScheme="blue"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenLocation()}
                    >
                      Add location
                    </Button>
                  </Permission>
                )}
                <Permission minRole={UserRoles.ProjectManager}>
                  <Tooltip label="View Report">
                    <NextLink href={`/jobsite/${jobsite._id}/report`} passHref>
                      <IconButton
                        as="a"
                        aria-label="report"
                        icon={<FiBarChart2 />}
                        backgroundColor="transparent"
                      />
                    </NextLink>
                  </Tooltip>
                </Permission>
                <Permission>
                  <IconButton
                    aria-label="edit"
                    icon={<FiEdit />}
                    backgroundColor="transparent"
                    onClick={() => onOpen()}
                  />
                  {!jobsite.archivedAt ? (
                    <Tooltip label="Archive">
                      <IconButton
                        icon={<FiArchive />}
                        aria-label="archive"
                        backgroundColor="transparent"
                        isLoading={archiveLoading}
                        onClick={() => {
                          if (window.confirm("Are you sure?")) {
                            archive({
                              variables: {
                                id: jobsite._id,
                              },
                            }).then(() => {
                              router.back();
                            });
                          }
                        }}
                      />
                    </Tooltip>
                  ) : (
                    <Tooltip label="Unarchive">
                      <IconButton
                        icon={<FiUnlock />}
                        aria-label="unarchive"
                        backgroundColor="transparent"
                        isLoading={unarchiveLoading}
                        onClick={() => {
                          if (window.confirm("Are you sure?")) {
                            unarchive({
                              variables: {
                                id: jobsite._id,
                              },
                            });
                          }
                        }}
                      />
                    </Tooltip>
                  )}
                  <IconButton
                    onClick={onOpenRemove}
                    aria-label="remove"
                    icon={<FiTrash />}
                    backgroundColor="transparent"
                  />
                </Permission>
              </Flex>
              {/* Mobile: standalone directions / "Add location" sit
                  outside the overflow menu. Directions is the single
                  most frequent action for a foreman on-site; an empty
                  location is a visible gap we want PMs to fill —
                  burying either behind ⋮ defeats the point. Edit
                  location (when set) stays in the menu since it's an
                  admin-only tweak, not a daily action. */}
              <Flex
                display={{ base: "flex", md: "none" }}
                direction="row"
                alignItems="center"
                gap={1}
              >
                {jobsite.location ? (
                  <Tooltip label="Get directions">
                    <ChakraLink
                      href={`https://www.google.com/maps/dir/?api=1&destination=${jobsite.location.latitude},${jobsite.location.longitude}`}
                      isExternal
                      _hover={{ textDecoration: "none" }}
                    >
                      <IconButton
                        as="span"
                        aria-label="Get directions"
                        icon={<FiNavigation />}
                        backgroundColor="transparent"
                        color="green.600"
                      />
                    </ChakraLink>
                  </Tooltip>
                ) : (
                  <Permission>
                    <Button
                      leftIcon={<FiMapPin />}
                      colorScheme="blue"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenLocation()}
                    >
                      Add location
                    </Button>
                  </Permission>
                )}
                {/* Menu only has PM+ and Admin items — for foremen
                    (User role) the menu would be empty, so skip it
                    entirely. They still get the Get Directions
                    button above. */}
                {isPmPlus && (
                  <Menu placement="bottom-end">
                    <MenuButton
                      as={IconButton}
                      aria-label="Jobsite actions"
                      icon={<FiMoreVertical />}
                      backgroundColor="transparent"
                    />
                    <MenuList>
                      <Permission minRole={UserRoles.ProjectManager}>
                        <MenuItem
                          icon={<FiClock />}
                          onClick={() => setPreviousYears(!previousYears)}
                        >
                          {previousYears
                            ? "Hide previous years"
                            : "Show previous years"}
                        </MenuItem>
                        <NextLink
                          href={`/jobsite/${jobsite._id}/report`}
                          passHref
                        >
                          <MenuItem as="a" icon={<FiBarChart2 />}>
                            View report
                          </MenuItem>
                        </NextLink>
                      </Permission>
                      <Permission>
                        {jobsite.location && (
                          <MenuItem
                            icon={<FiMapPin />}
                            onClick={() => onOpenLocation()}
                          >
                            Edit location
                          </MenuItem>
                        )}
                        <MenuDivider />
                        <MenuItem icon={<FiEdit />} onClick={() => onOpen()}>
                          Edit jobsite
                        </MenuItem>
                        {!jobsite.archivedAt ? (
                          <MenuItem
                            icon={<FiArchive />}
                            onClick={() => {
                              if (window.confirm("Are you sure?")) {
                                archive({
                                  variables: { id: jobsite._id },
                                }).then(() => {
                                  router.back();
                                });
                              }
                            }}
                          >
                            Archive
                          </MenuItem>
                        ) : (
                          <MenuItem
                            icon={<FiUnlock />}
                            onClick={() => {
                              if (window.confirm("Are you sure?")) {
                                unarchive({ variables: { id: jobsite._id } });
                              }
                            }}
                          >
                            Unarchive
                          </MenuItem>
                        )}
                        <MenuItem
                          icon={<FiTrash />}
                          color="red.500"
                          onClick={onOpenRemove}
                        >
                          Remove
                        </MenuItem>
                      </Permission>
                    </MenuList>
                  </Menu>
                )}
              </Flex>
            </Flex>
            {jobsite.location && (
              <Box
                mt={3}
                mx={-2}
                mb={-2}
                overflow="hidden"
                borderBottomRadius="0.25em"
              >
                <StaticMapThumbnail
                  latitude={jobsite.location.latitude}
                  longitude={jobsite.location.longitude}
                  height={{ base: "140px", md: "200px" }}
                />
                <Box bg="gray.50" borderTop="1px solid" borderColor="gray.200">
                  <WeatherForecast
                    latitude={jobsite.location.latitude}
                    longitude={jobsite.location.longitude}
                  />
                </Box>
              </Box>
            )}
          </Card>
          <Permission minRole={UserRoles.ProjectManager}>
            {/* Search + secondary actions live in a single strip.
                Trucking rates and year/month (legacy) reports are
                rarely-accessed surfaces, so keeping them here as
                compact buttons avoids giving them permanent grid
                real estate while keeping them one click away. */}
            <JobsiteInvoiceSearch
              jobsite={jobsite}
              rightActions={
                <Flex gap={2} flexWrap="wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTruckingOpen(true)}
                  >
                    Trucking rates
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLegacyReportsOpen(true)}
                  >
                    Legacy reports
                  </Button>
                </Flex>
              }
            />
            {/* Documents first: left column on desktop, first on mobile.
                On desktop 2-col, Documents stretches to match Materials'
                height via `compact` + flex column. On mobile 1-col,
                Documents renders at its natural size. */}
            <SimpleGrid columns={[1, 1, 1, 2]} spacingX={4} spacingY={2}>
              <Box
                my={2}
                display={isDesktopTwoCol ? "flex" : undefined}
                flexDirection={isDesktopTwoCol ? "column" : undefined}
              >
                <EntityFileBrowser
                  namespace="jobsites"
                  entityId={jobsite._id}
                  rootLabel="Documents"
                  userRole={user?.role}
                  compact={!!isDesktopTwoCol}
                />
              </Box>
              <JobsiteMaterialsCosting
                jobsite={jobsite}
                selectedJobsiteMaterial={jobsiteMaterialQuery as string}
                showPreviousYears={effectivePreviousYears}
              />
            </SimpleGrid>
            <SimpleGrid columns={[1, 1, 1, 2]} spacingX={4} spacingY={2}>
              <ExpenseInvoices
                jobsite={jobsite}
                expenseInvoices={expenseInvoices}
              />
              <RevenueInvoices
                jobsite={jobsite}
                revenueInvoices={revenueInvoices}
              />
            </SimpleGrid>
            <SimpleGrid spacingY={2}>
              <JobsiteContract jobsite={jobsite} />
            </SimpleGrid>
          </Permission>
          <DailyReportListCard
            dailyReports={dailyReports}
            jobsiteId={jobsite._id}
            limit={4}
          />

          {!chatOpen && (jobsite.documents?.length ?? 0) > 0 && (
            <Permission minRole={UserRoles.User}>
              <IconButton
                aria-label="Chat with documents"
                icon={<FiMessageSquare />}
                colorScheme="blue"
                size="lg"
                borderRadius="full"
                position="fixed"
                bottom={8}
                right={8}
                zIndex={4}
                onClick={onChatOpen}
                boxShadow="lg"
              />
            </Permission>
          )}

          <ChatDrawer
            isOpen={chatOpen}
            onClose={onChatClose}
            title={jobsite.name}
            messageEndpoint={chatMessageEndpoint}
            conversationsEndpoint={chatConversationsEndpoint}
            extraPayload={{ jobsiteId: jobsite._id }}
            suggestions={chatSuggestions}
            minRole={UserRoles.User}
          />

          {/* EDIT MODAL */}
          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Edit</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <JobsiteUpdateForm
                  jobsite={jobsite}
                  onSuccess={() => {
                    onClose();
                    router.reload();
                  }}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
          <JobsiteRemoveModal
            jobsite={jobsite}
            dailyReports={dailyReports || []}
            expenseInvoices={expenseInvoices || []}
            revenueInvoices={revenueInvoices || []}
            isOpen={isOpenRemove}
            onClose={onCloseRemove}
          />
          <JobsiteLocationModal jobsite={jobsite} isOpen={isOpenLocation} onClose={onCloseLocation} />

          {/* Trucking rates modal — rarely touched, hidden behind a
              secondary action to de-emphasize it on the jobsite page. */}
          <Modal
            isOpen={truckingOpen}
            onClose={() => setTruckingOpen(false)}
            size="xl"
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Trucking rates</ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                <TruckingRates
                  jobsite={jobsite}
                  bare
                  defaultCollapsed={false}
                />
              </ModalBody>
            </ModalContent>
          </Modal>

          {/* Legacy (deprecated) year/month reports — kept accessible
              but not front-and-center. */}
          <Modal
            isOpen={legacyReportsOpen}
            onClose={() => setLegacyReportsOpen(false)}
            size="4xl"
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Legacy reports</ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                <SimpleGrid columns={[1, 1, 1, 2]} spacingX={4} spacingY={2}>
                  <JobsiteYearlyReportList
                    jobsiteYearReports={jobsite.yearReports}
                  />
                  <JobsiteMonthlyReportList
                    jobsiteMonthReports={jobsite.monthReports}
                  />
                </SimpleGrid>
              </ModalBody>
            </ModalContent>
          </Modal>
        </Box>
      );
    } else return <Loading />;
  }, [
    data,
    previousYears,
    truckingOpen,
    legacyReportsOpen,
    isDesktopTwoCol,
    effectivePreviousYears,
    isPmPlus,
    user?.role,
    dailyReports,
    expenseInvoices,
    revenueInvoices,
    isOpen,
    isOpenRemove,
    jobsiteMaterialQuery,
    chatMessageEndpoint,
    chatConversationsEndpoint,
    chatSuggestions,
    onClose,
    onCloseRemove,
    onOpen,
    onOpenRemove,
    router,
    isOpenLocation,
    onCloseLocation,
    onOpenLocation,
    chatOpen,
    onChatOpen,
    onChatClose,
    archive,
    archiveLoading,
    unarchive,
    unarchiveLoading,
    refetch,
  ]);
};

export default JobsiteClientContent;
