import {
  Box,
  Button,
  Circle,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React from "react";
import { FiClipboard, FiTruck } from "react-icons/fi";
import { OperatorDailyReportCardSnippetFragment } from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import OperatorDailyReportVehicleSelectForm from "../../Forms/OperatorDailyReport/VehicleSelect";

interface OperatorDailyReportQuickStartProps {
  /**
   * All operator daily reports currently loaded for the signed-in
   * operator (server-filtered to `author = employee._id` for User +
   * VehicleMaintenance type). Most recent is used to prefill the
   * quick-inspect shortcut; scanned for a same-day record to decide
   * whether to show the primary banner.
   */
  operatorDailyReports: readonly OperatorDailyReportCardSnippetFragment[];
}

/**
 * Operator-only banner above the Operator Reports list. Mirrors
 * DailyReportQuickStart but pivots on vehicle instead of jobsite,
 * since operator reports are vehicle inspections with no jobsite
 * association. Primary action deep-links to the inspection form for
 * the most recently used vehicle; secondary opens a vehicle picker
 * for when the operator has switched trucks today.
 */
const OperatorDailyReportQuickStart: React.FC<
  OperatorDailyReportQuickStartProps
> = ({ operatorDailyReports }) => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const mostRecent = operatorDailyReports[0];

  // Calendar-date comparison in local time. Operator reports expose
  // `createdAt` (when the inspection was filed) rather than an
  // explicit date, which is what we want: "did I already file one
  // today?" and "how long ago was the last one?" are both functions
  // of file-time.
  const todayStart = React.useMemo(() => dayjs().startOf("day"), []);
  const hasReportToday = React.useMemo(
    () =>
      operatorDailyReports.some((r) =>
        dayjs(r.createdAt).isSame(todayStart, "day")
      ),
    [operatorDailyReports, todayStart]
  );

  const relativeDateLabel = React.useMemo(() => {
    if (!mostRecent) return "";
    const d = dayjs(mostRecent.createdAt);
    const diffDays = todayStart.diff(d.startOf("day"), "day");
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays > 1 && diffDays < 7) return d.format("dddd");
    return d.format("MMM D");
  }, [mostRecent, todayStart]);

  const showPrimary = !!mostRecent && !hasReportToday;

  const goToInspection = React.useCallback(
    (vehicleId: string) => {
      router.push(createLink.vehicleOperatorDailyReportCreate(vehicleId));
    },
    [router]
  );

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
            <Flex direction="row" align="center" gap={3} flex={1} minW={0}>
              <Circle
                size="40px"
                bg="blue.100"
                color="blue.600"
                flexShrink={0}
                display={{ base: "none", sm: "flex" }}
              >
                <FiTruck />
              </Circle>
              <Box minW={0}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="blue.600"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Last inspected · {relativeDateLabel}
                </Text>
                <Heading
                  size="sm"
                  color="gray.800"
                  mt={0.5}
                  noOfLines={1}
                  wordBreak="break-word"
                >
                  {mostRecent.vehicle.name}
                </Heading>
                <Text fontSize="xs" color="gray.600" mt={0.5} noOfLines={1}>
                  {mostRecent.vehicle.vehicleCode}
                  {mostRecent.vehicle.vehicleType
                    ? ` · ${mostRecent.vehicle.vehicleType}`
                    : ""}
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
                leftIcon={<FiClipboard />}
                onClick={() => goToInspection(mostRecent.vehicle._id)}
                w={{ base: "100%", sm: "auto" }}
              >
                Start today&apos;s inspection
              </Button>
            </Stack>
          </Flex>
        </Box>
      )}
      <Flex justifyContent="flex-end" mt={showPrimary ? 1 : 2} mb={2}>
        <Button size="sm" variant="link" colorScheme="blue" onClick={onOpen}>
          {showPrimary
            ? "Operating a different vehicle? Start an inspection →"
            : "Start an inspection →"}
        </Button>
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Start an inspection</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <OperatorDailyReportVehicleSelectForm
              onSubmit={(vehicleId) => {
                onClose();
                goToInspection(vehicleId);
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default OperatorDailyReportQuickStart;
