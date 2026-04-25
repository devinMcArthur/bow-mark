import {
  Box,
  Button,
  Circle,
  Flex,
  Heading,
  Link as ChakraLink,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React from "react";
import { FiBriefcase, FiNavigation, FiPlus } from "react-icons/fi";
import {
  DailyReportCardSnippetFragment,
  useDailyReportCreateMutation,
} from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import DailyReportCreateForm from "../../Forms/DailyReport/DailyReportCreate";

interface DailyReportQuickStartProps {
  /**
   * All daily reports currently loaded for the foreman's crew(s). The
   * most recent is used to prefill the quick-start action; the rest
   * are scanned to decide whether today is already logged.
   */
  dailyReports: readonly DailyReportCardSnippetFragment[];
}

/**
 * Foreman-only banner that lives above the Daily Reports list. If the
 * crew didn't log a report today, it offers a one-click button to
 * create one carrying over yesterday's jobsite + crew (plus directions,
 * when the jobsite has coordinates). A secondary action opens the
 * full create modal for when they're heading somewhere new.
 */
const DailyReportQuickStart: React.FC<DailyReportQuickStartProps> = ({
  dailyReports,
}) => {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [create, { loading: creating }] = useDailyReportCreateMutation();

  const mostRecent = dailyReports[0];

  // Has any loaded report been filed for today? Compared as calendar
  // dates in local time — a report created this morning at 07:00 and
  // "now is 09:15" should collapse to the same day.
  const todayStart = React.useMemo(() => dayjs().startOf("day"), []);
  const hasReportToday = React.useMemo(
    () => dailyReports.some((r) => dayjs(r.date).isSame(todayStart, "day")),
    [dailyReports, todayStart]
  );

  const onQuickStart = React.useCallback(async () => {
    if (!mostRecent) return;
    try {
      const res = await create({
        variables: {
          data: {
            crewId: mostRecent.crew._id,
            jobsiteId: mostRecent.jobsite._id,
            date: todayStart.toDate(),
          },
        },
      });
      const created = res.data?.dailyReportCreate;
      if (created) {
        router.push(createLink.dailyReport(created._id));
      } else {
        toast({
          status: "error",
          title: "Couldn't start daily report",
          description: "Please try again.",
          isClosable: true,
        });
      }
    } catch (e) {
      toast({
        status: "error",
        title: "Couldn't start daily report",
        description: e instanceof Error ? e.message : "Please try again.",
        isClosable: true,
      });
    }
  }, [create, mostRecent, router, todayStart, toast]);

  const showPrimary = !!mostRecent && !hasReportToday;
  const hasLocation = !!mostRecent?.jobsite.location;

  // Friendly relative date: "Today / Yesterday / Monday / Apr 14".
  // Foremen glance at this in the morning — "Yesterday" is far more
  // meaningful than "Monday, April 21" even though that's the same
  // information.
  const relativeDateLabel = React.useMemo(() => {
    if (!mostRecent) return "";
    const d = dayjs(mostRecent.date);
    const diffDays = todayStart.diff(d.startOf("day"), "day");
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays > 1 && diffDays < 7) return d.format("dddd");
    return d.format("MMM D");
  }, [mostRecent, todayStart]);

  return (
    <>
      {showPrimary && (
        <Box
          borderWidth="1px"
          borderColor="blue.100"
          borderLeftWidth="4px"
          borderLeftColor="blue.400"
          borderRadius="md"
          bg="blue.50"
          p={{ base: 4, md: 5 }}
          mb={3}
        >
          <Flex
            direction={{ base: "column", md: "row" }}
            align={{ base: "stretch", md: "center" }}
            gap={{ base: 3, md: 4 }}
          >
            <Flex
              direction="row"
              align="center"
              gap={3}
              flex={1}
              minW={0}
            >
              <Circle
                size="40px"
                bg="blue.100"
                color="blue.600"
                flexShrink={0}
                display={{ base: "none", sm: "flex" }}
              >
                <FiBriefcase />
              </Circle>
              <Box minW={0}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="blue.600"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Last worked · {relativeDateLabel}
                </Text>
                <Heading
                  size="sm"
                  color="gray.800"
                  mt={0.5}
                  noOfLines={1}
                  wordBreak="break-word"
                >
                  {mostRecent.jobsite.name}
                </Heading>
                <Text fontSize="xs" color="gray.600" mt={0.5} noOfLines={1}>
                  {mostRecent.jobsite.jobcode}
                  {mostRecent.crew?.name ? ` · ${mostRecent.crew.name}` : ""}
                </Text>
              </Box>
            </Flex>
            <Stack
              direction={{ base: "column", sm: "row" }}
              spacing={2}
              flexShrink={0}
              w={{ base: "100%", md: "auto" }}
            >
              <Button
                colorScheme="blue"
                leftIcon={<FiPlus />}
                onClick={onQuickStart}
                isLoading={creating}
                w={{ base: "100%", sm: "auto" }}
              >
                Start today&apos;s report
              </Button>
              {hasLocation && (
                <ChakraLink
                  href={`https://www.google.com/maps/dir/?api=1&destination=${mostRecent.jobsite.location!.latitude},${mostRecent.jobsite.location!.longitude}`}
                  isExternal
                  _hover={{ textDecoration: "none" }}
                  w={{ base: "100%", sm: "auto" }}
                >
                  <Button
                    leftIcon={<FiNavigation />}
                    variant="outline"
                    colorScheme="green"
                    bg="white"
                    w="100%"
                  >
                    Directions
                  </Button>
                </ChakraLink>
              )}
            </Stack>
          </Flex>
        </Box>
      )}
      <Flex justifyContent="flex-end" mt={showPrimary ? 1 : 2} mb={2}>
        <Button
          size="sm"
          variant="link"
          colorScheme="blue"
          onClick={onOpen}
        >
          {showPrimary
            ? "Going to a different job? Start a daily report →"
            : "Start a daily report →"}
        </Button>
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Start a daily report</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <DailyReportCreateForm
              onSuccess={(dailyReport) => {
                onClose();
                router.push(createLink.dailyReport(dailyReport._id));
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default DailyReportQuickStart;
