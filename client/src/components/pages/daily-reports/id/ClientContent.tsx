import {
  Badge,
  Box,
  Flex,
  HStack,
  Heading,
  IconButton,
  Link as ChakraLink,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React from "react";
import {
  FiAlertTriangle,
  FiArchive,
  FiCloud,
  FiDownload,
  FiEdit,
  FiMessageSquare,
  FiNavigation,
} from "react-icons/fi";
import DailyReportChatDrawer from "../../../DailyReport/DailyReportChatDrawer";
import EntityFileBrowser from "../../../FileBrowser/EntityFileBrowser";
import WeatherModal from "../../../Common/Weather/WeatherModal";
import { useAuth } from "../../../../contexts/Auth";
import { useDailyReportUpdateForm } from "../../../../forms/dailyReport";
import {
  useDailyReportArchiveMutation,
  useDailyReportEntriesQuery,
  useDailyReportFullQuery,
  useDailyReportJobCostApprovalUpdateMutation,
  useDailyReportPayrollCompleteUpdateMutation,
  useDailyReportUpdateMutation,
  UserRoles,
} from "../../../../generated/graphql";
import createLink from "../../../../utils/createLink";
import hasPermission from "../../../../utils/hasPermission";

import SubmitButton from "../../../Common/forms/SubmitButton";
import Loading from "../../../Common/Loading";
import Permission from "../../../Common/Permission";
import TextLink from "../../../Common/TextLink";
import EmployeeHours from "./views/EmployeeHours";
import MaterialShipments from "./views/MaterialShipments";
import Production from "./views/Production";
import DailyReportTimeline from "../../../DailyReport/DailyReportTimeline";
import VehicleWork from "./views/VehicleWork";

interface IDailyReportClientContent {
  id: string;
  /**
   * When rendered inline inside another surface (e.g. an expanded
   * DailyReportCard), archiving should not redirect the user away from
   * the list. The list view typically refetches after the mutation and
   * the archived report simply drops out.
   */
  embedded?: boolean;
  /**
   * Compact mode for inline/list contexts (expandable cards, jobsite
   * story/daily-reports pages). Hides the journal composer AND the
   * documents section so only the hero, existing journal entries, and
   * the numbers grid render. Archive/edit icons still work — they're
   * useful inline.
   */
  inline?: boolean;
}

const DailyReportClientContent = ({
  id,
  embedded,
  inline,
}: IDailyReportClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { user },
  } = useAuth();

  const router = useRouter();

  const { data } = useDailyReportFullQuery({ variables: { id } });

  const jobsiteId = data?.dailyReport.jobsite._id;

  // Apollo dedupes this with the query inside DailyReportTimeline — same
  // variables hit the same cache slot so the network only fires once.
  const { data: entriesData } = useDailyReportEntriesQuery({
    variables: { dailyReportId: id },
    fetchPolicy: "cache-and-network",
  });
  const issueCount = React.useMemo(
    () =>
      (entriesData?.dailyReportEntries ?? []).filter((e) => e.isIssue).length,
    [entriesData?.dailyReportEntries]
  );

  const {
    isOpen: editModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure();

  const {
    isOpen: chatOpen,
    onOpen: onChatOpen,
    onClose: onChatClose,
  } = useDisclosure();

  const {
    isOpen: weatherOpen,
    onOpen: onWeatherOpen,
    onClose: onWeatherClose,
  } = useDisclosure();

  const [update, { loading }] = useDailyReportUpdateMutation();

  const [updateApproval, { loading: approvalLoading }] =
    useDailyReportJobCostApprovalUpdateMutation();

  const [updatePayrollComplete, { loading: payrollLoading }] =
    useDailyReportPayrollCompleteUpdateMutation();

  const [archive, { loading: archiveLoading }] =
    useDailyReportArchiveMutation();

  const { FormComponents } = useDailyReportUpdateForm();

  const toast = useToast();

  /**
   * ----- Variables -----
   */

  const canUpdateJobsite = React.useMemo(() => {
    let canUpdate = true;
    if (data?.dailyReport)
      for (let i = 0; i < data?.dailyReport.materialShipments.length; i++) {
        const materialShipment = data.dailyReport.materialShipments[i];
        if (materialShipment.noJobsiteMaterial === false) canUpdate = false;
      }

    return canUpdate;
  }, [data?.dailyReport]);

  const editPermission = React.useMemo(
    () =>
      user?.employee.crews
        .map((crew) => crew._id)
        .includes(data?.dailyReport.crew._id || "randomString") &&
      data?.dailyReport.jobCostApproved !== true &&
      data?.dailyReport.payrollComplete !== true,
    [
      data?.dailyReport.crew._id,
      data?.dailyReport.jobCostApproved,
      data?.dailyReport.payrollComplete,
      user?.employee.crews,
    ]
  );

  const isAdmin = hasPermission(user?.role, UserRoles.Admin);
  // Foremen (UserRoles.User) don't see the approval / payroll pills at
  // all — those are back-office concerns. Any PM+ sees them; only
  // admins can actually toggle.
  const canSeeStatusPills = hasPermission(user?.role, UserRoles.ProjectManager);

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    if (!data?.dailyReport) return <Loading />;

    const report = data.dailyReport;
    const jobsiteHasDocuments =
      (report.jobsite.documents?.length ?? 0) > 0;

    const approved = !!report.jobCostApproved;
    const payrollComplete = !!report.payrollComplete;

    // Clickable pills for admins: one tap toggles the server-side
    // mutation. Non-admins see the same visual treatment but without
    // the pointer cursor / click handler, so they get the status at a
    // glance without edit affordance.
    const toggleApproval = () =>
      updateApproval({
        variables: { id: report._id, approved: !approved },
      });
    const togglePayroll = () =>
      updatePayrollComplete({
        variables: { id: report._id, complete: !payrollComplete },
      });

    return (
      <Box>
        {/* ─── Hero ─────────────────────────────────────────────────── */}
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={[3, 4, 5]}
          mb={4}
        >
          <Flex
            direction={{ base: "column", md: "row" }}
            gap={{ base: 3, md: 4 }}
            align={{ base: "stretch", md: "flex-start" }}
          >
            <Box flex={1} minW={0}>
              <Heading size="lg" lineHeight="short" mb={1}>
                {dayjs(report.date).format("dddd, MMMM D, YYYY")}
              </Heading>
              <Flex
                direction={{ base: "column", sm: "row" }}
                align={{ base: "stretch", sm: "center" }}
                gap={{ base: 0, sm: 2 }}
                fontSize="md"
                color="gray.700"
                minW={0}
              >
                <Flex
                  minW={0}
                  align="center"
                  gap={1}
                  maxW="100%"
                  overflow="hidden"
                >
                  <Text
                    as="span"
                    fontWeight="semibold"
                    color="gray.500"
                    flexShrink={0}
                  >
                    {report.jobsite.jobcode}
                  </Text>
                  <TextLink
                    link={createLink.jobsite(report.jobsite._id)}
                    color="blue.600"
                    isTruncated
                    minW={0}
                  >
                    {report.jobsite.name}
                  </TextLink>
                </Flex>
                <Text
                  as="span"
                  color="gray.400"
                  display={{ base: "none", sm: "inline" }}
                  flexShrink={0}
                >
                  ·
                </Text>
                <TextLink
                  link={createLink.crew(report.crew._id)}
                  isTruncated
                  minW={0}
                >
                  {report.crew.name}
                </TextLink>
              </Flex>
            </Box>

            {/*
              Right column: pills on top, actions on bottom (desktop).
              On mobile, pills and actions share a single row — pills
              anchor left, actions anchor right via ml="auto". Keeps the
              hero compact for single-pill / single-action cases.
            */}
            <Flex
              direction={{ base: "row", md: "column" }}
              align={{ base: "center", md: "flex-end" }}
              gap={2}
              flexWrap="wrap"
              w={{ base: "100%", md: "auto" }}
            >
              <HStack spacing={2} flexWrap="wrap">
                {issueCount > 0 && (
                  <Badge
                    px={2}
                    py={1}
                    fontSize="xs"
                    borderRadius="full"
                    colorScheme="red"
                    display="inline-flex"
                    alignItems="center"
                    gap={1}
                  >
                    <FiAlertTriangle size={12} />
                    {issueCount} {issueCount === 1 ? "issue" : "issues"}
                  </Badge>
                )}

                {canSeeStatusPills && (
                  <>
                    <Tooltip
                      label={
                        isAdmin
                          ? approved
                            ? "Click to revoke approval"
                            : "Click to approve"
                          : approved
                            ? "Job cost approved"
                            : "Awaiting approval"
                      }
                    >
                      <Badge
                        px={2}
                        py={1}
                        fontSize="xs"
                        borderRadius="full"
                        colorScheme={approved ? "green" : "gray"}
                        variant={approved ? "solid" : "subtle"}
                        cursor={isAdmin && !approvalLoading ? "pointer" : "default"}
                        opacity={approvalLoading ? 0.5 : 1}
                        onClick={
                          isAdmin && !approvalLoading ? toggleApproval : undefined
                        }
                        userSelect="none"
                      >
                        {approvalLoading ? (
                          <Spinner size="xs" />
                        ) : approved ? (
                          "✓ Approved"
                        ) : (
                          "Not approved"
                        )}
                      </Badge>
                    </Tooltip>

                    <Tooltip
                      label={
                        isAdmin
                          ? payrollComplete
                            ? "Click to reopen payroll"
                            : "Click to mark payroll complete"
                          : payrollComplete
                            ? "Payroll complete"
                            : "Payroll pending"
                      }
                    >
                      <Badge
                        px={2}
                        py={1}
                        fontSize="xs"
                        borderRadius="full"
                        colorScheme={payrollComplete ? "green" : "gray"}
                        variant={payrollComplete ? "solid" : "subtle"}
                        cursor={isAdmin && !payrollLoading ? "pointer" : "default"}
                        opacity={payrollLoading ? 0.5 : 1}
                        onClick={
                          isAdmin && !payrollLoading ? togglePayroll : undefined
                        }
                        userSelect="none"
                      >
                        {payrollLoading ? (
                          <Spinner size="xs" />
                        ) : payrollComplete ? (
                          "✓ Payroll"
                        ) : (
                          "Payroll pending"
                        )}
                      </Badge>
                    </Tooltip>
                  </>
                )}
              </HStack>

              <HStack
                spacing={1}
                flexWrap="wrap"
                ml={{ base: "auto", md: 0 }}
              >
              <Permission minRole={UserRoles.ProjectManager}>
                <Tooltip label="Download report">
                  <TextLink
                    link={createLink.server_dailyReportExcelDownload(
                      report._id
                    )}
                    newTab
                  >
                    <IconButton
                      aria-label="Download"
                      icon={<FiDownload />}
                      variant="ghost"
                      size="sm"
                    />
                  </TextLink>
                </Tooltip>
              </Permission>

              {/* Location-derived actions: directions launches Google
                  Maps to the jobsite, weather opens the 7-day modal.
                  Both gated on the jobsite having coordinates set —
                  no fallback prompt to set the location from here
                  since that's a jobsite-page concern. */}
              {report.jobsite.location && (
                <>
                  <Tooltip label="Get directions">
                    <ChakraLink
                      href={`https://www.google.com/maps/dir/?api=1&destination=${report.jobsite.location.latitude},${report.jobsite.location.longitude}`}
                      isExternal
                      _hover={{ textDecoration: "none" }}
                    >
                      <IconButton
                        as="span"
                        aria-label="Get directions"
                        icon={<FiNavigation />}
                        variant="ghost"
                        size="sm"
                        color="green.600"
                      />
                    </ChakraLink>
                  </Tooltip>
                  <Tooltip label="7-day forecast">
                    <IconButton
                      aria-label="Weather"
                      icon={<FiCloud />}
                      variant="ghost"
                      size="sm"
                      onClick={onWeatherOpen}
                    />
                  </Tooltip>
                </>
              )}

              <Permission
                minRole={UserRoles.ProjectManager}
                otherCriteria={editPermission}
              >
                <Tooltip label="Edit report">
                  <IconButton
                    aria-label="Edit"
                    icon={<FiEdit />}
                    variant="ghost"
                    size="sm"
                    onClick={onEditModalOpen}
                  />
                </Tooltip>
                <Permission>
                  <Tooltip label="Archive report">
                    <IconButton
                      aria-label="Archive"
                      icon={<FiArchive />}
                      variant="ghost"
                      size="sm"
                      isLoading={archiveLoading}
                      onClick={() => {
                        if (window.confirm("Are you sure?")) {
                          archive({ variables: { id: report._id } }).then(
                            () => {
                              if (!embedded) router.push("/");
                            }
                          );
                        }
                      }}
                    />
                  </Tooltip>
                </Permission>
              </Permission>
              </HStack>
            </Flex>
          </Flex>
        </Box>

        {/* ─── Journal ──────────────────────────────────────────────── */}
        <DailyReportTimeline
          dailyReportId={report._id}
          // Inline surfaces are view-only for posting — the host page
          // (expanded card, jobsite story feed) is not the right place
          // to compose. Existing entries still render for context.
          canPost={!inline && !approved && !payrollComplete}
        />

        {/* ─── Today's Numbers ──────────────────────────────────────── */}
        <SimpleGrid columns={[1, 1, 1, 2]} spacingX={4} spacingY={2}>
          <EmployeeHours dailyReport={report} editPermission={editPermission} />
          <VehicleWork dailyReport={report} editPermission={editPermission} />
          <MaterialShipments
            dailyReport={report}
            editPermission={editPermission}
          />
          <Production dailyReport={report} editPermission={editPermission} />
        </SimpleGrid>

        {/* ─── Documents ────────────────────────────────────────────── */}
        {/* Skip the documents section in inline mode — the host page
            (jobsite story, jobsite daily-reports list, expandable card)
            already has its own document surface, so rendering another
            one would be redundant. EntityFileBrowser handles the
            no-root empty state natively in read-only mode. */}
        {!inline && jobsiteId && (
          <Box mt={6}>
            <EntityFileBrowser
              namespace="jobsites"
              entityId={jobsiteId}
              rootLabel="Documents"
              userRole={user?.role}
              compact={false}
              readOnly
            />
          </Box>
        )}

        {/* ─── Chat with jobsite documents ─────────────────────────── */}
        {/* Floating FAB + drawer — the foreman's primary entrypoint to
            chat with this jobsite's documents. Hidden on inline
            surfaces (card, story, jobsite daily-reports list) since
            those pages render inside a larger layout where a fixed
            FAB would be disruptive. */}
        {!inline && jobsiteHasDocuments && (
          <>
            {!chatOpen && (
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
            )}
            <DailyReportChatDrawer
              isOpen={chatOpen}
              onClose={onChatClose}
              jobsiteId={report.jobsite._id}
              jobsiteName={report.jobsite.name}
            />
          </>
        )}

        {/* Weather modal — mounted unconditionally so the open/close
            state isn't tied to the location existing (the trigger
            button is gated, so the modal is only ever opened when
            location is set). */}
        {report.jobsite.location && (
          <WeatherModal
            isOpen={weatherOpen}
            onClose={onWeatherClose}
            latitude={report.jobsite.location.latitude}
            longitude={report.jobsite.location.longitude}
            title={report.jobsite.name}
          />
        )}

        {/* ─── Edit Modal ──────────────────────────────────────────── */}
        <Modal isOpen={editModalOpen} onClose={onEditModalClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Edit Report</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormComponents.Form
                submitHandler={(formData) => {
                  update({ variables: { id, data: formData } }).then(() => {
                    onEditModalClose();
                    toast({
                      title: "Successfully edited.",
                      description: "Daily Report was successfully edited",
                      status: "success",
                      isClosable: true,
                    });
                  });
                }}
              >
                <FormComponents.Date
                  isLoading={loading}
                  defaultValue={report.date}
                />
                <FormComponents.Jobsite
                  helperText={
                    !canUpdateJobsite && (
                      <Tooltip label="Material shipments linked to Jobsite materials">
                        Cannot update jobsite
                      </Tooltip>
                    )
                  }
                  isLoading={canUpdateJobsite ? loading : true}
                  defaultValue={report.jobsite._id}
                />
                <SubmitButton isLoading={loading} />
              </FormComponents.Form>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    );
  }, [
    FormComponents,
    approvalLoading,
    archive,
    archiveLoading,
    canUpdateJobsite,
    chatOpen,
    data?.dailyReport,
    editModalOpen,
    editPermission,
    embedded,
    inline,
    id,
    isAdmin,
    canSeeStatusPills,
    issueCount,
    jobsiteId,
    loading,
    onChatClose,
    onChatOpen,
    onEditModalClose,
    onEditModalOpen,
    onWeatherClose,
    onWeatherOpen,
    payrollLoading,
    router,
    toast,
    weatherOpen,
    update,
    updateApproval,
    updatePayrollComplete,
    user?.role,
  ]);

  return content;
};

export default DailyReportClientContent;
