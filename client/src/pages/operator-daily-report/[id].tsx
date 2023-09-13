import React from "react";

import { GetServerSideProps } from "next";
import {
  PageOperatorDailyReportFullComp,
  ssrOperatorDailyReportFull,
} from "../../generated/page";
import Container from "../../components/Common/Container";
import Breadcrumbs from "../../components/Common/Breadcrumbs";
import operatorDailyReportName from "../../utils/operatorDailyReportName";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import Card from "../../components/Common/Card";
import TextGrid from "../../components/Common/TextGrid";
import dayjs from "dayjs";
import createLink from "../../utils/createLink";
import TextLink from "../../components/Common/TextLink";
import { useOperatorDailyReportForm } from "../../forms/operatorDailyReport";
import operatorDailyReportTags from "../../utils/operatorDailyReportTags";
import { FiAlertTriangle, FiX } from "react-icons/fi";
import VehicleIssueCreateForm from "../../components/Forms/VehicleIssue/Create";
import VehicleIssueCard from "../../components/Common/VehicleIssue/Card";
import { OperatorDailyReportFullDocument } from "../../generated/graphql";
import { useRouter } from "next/router";

const OperatorDailyReport: PageOperatorDailyReportFullComp = ({ data }) => {
  const operatorDailyReport = data?.operatorDailyReport!;

  /**
   * --- Hook Initialization ---
   */

  const router = useRouter();

  const [issueForm, setIssueForm] = React.useState(false);

  const { FormComponents } = useOperatorDailyReportForm({
    defaultValues: {
      ...operatorDailyReport,
    },
  });

  const isDisabled = true;

  /**
   * --- Rendering ---
   */

  const tags = React.useMemo(() => {
    return operatorDailyReportTags(operatorDailyReport);
  }, [operatorDailyReport]);

  return (
    <Container>
      <Breadcrumbs
        crumbs={[
          {
            title: "Operator Daily Reports",
            link: "/operator-daily-reports",
          },
          {
            title: operatorDailyReportName(operatorDailyReport),
            isCurrentPage: true,
          },
        ]}
      />
      <Card>
        <Box
          backgroundColor="gray.100"
          borderRadius={4}
          m={2}
          p={2}
          border="1px solid"
          borderColor="gray.200"
        >
          <TextGrid
            rows={[
              {
                title: (
                  <Text as="span" fontWeight="bold">
                    Date:{" "}
                  </Text>
                ),
                text: (
                  <Text as="span">
                    {dayjs(operatorDailyReport.startTime).format(
                      "MMMM DD, YYYY"
                    )}
                  </Text>
                ),
              },
              {
                title: (
                  <Text as="span" fontWeight="bold">
                    Vehicle:{" "}
                  </Text>
                ),
                text: (
                  <TextLink
                    link={createLink.vehicle(operatorDailyReport.vehicle._id)}
                  >
                    {operatorDailyReport.vehicle.name} (
                    {operatorDailyReport.vehicle.vehicleCode})
                  </TextLink>
                ),
              },
              {
                title: (
                  <Text as="span" fontWeight="bold">
                    Author:{" "}
                  </Text>
                ),
                text: (
                  <TextLink
                    link={createLink.employee(operatorDailyReport.author._id)}
                  >
                    {operatorDailyReport.author.name}
                  </TextLink>
                ),
              },
            ]}
          />
        </Box>
        <Flex w="100%" justifyContent="space-between">
          <Box>{tags}</Box>
          {/* REPORT ISSUE */}
          <Box>
            <TextLink
              link={createLink.server_operatorDailyReportDownloadPDF(
                operatorDailyReport._id
              )}
              newTab
              mx="3"
            >
              Download
            </TextLink>
            <Button
              mx={2}
              variant="outline"
              colorScheme="red"
              leftIcon={<FiAlertTriangle />}
              onClick={() => setIssueForm(!issueForm)}
            >
              Report
            </Button>
          </Box>
        </Flex>
      </Card>

      {/* VEHICLE ISSUE FORM */}
      {issueForm ? (
        <Box
          backgroundColor="grey.300"
          borderRadius={4}
          p={2}
          m={2}
          my={4}
          border="2px solid"
          borderColor="orange.200"
        >
          <Flex flexDir="row" justifyContent="space-between">
            <Heading size="md" mb={2}>
              Report a vehicle issue
            </Heading>
            <IconButton
              onClick={() => setIssueForm(false)}
              aria-label="close-form"
              icon={<FiX />}
              backgroundColor="transparent"
            />
          </Flex>
          <VehicleIssueCreateForm
            vehicle={operatorDailyReport.vehicle}
            operatorDailyReport={operatorDailyReport}
            onSubmit={() => {
              setIssueForm(false);
              router.reload();
            }}
            mutationOptions={{
              refetchQueries: [OperatorDailyReportFullDocument],
            }}
          />
        </Box>
      ) : null}

      {/* EXISTING VEHICLE ISSUES */}
      <Accordion allowToggle m={2}>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                Existing Vehicle Issues
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel>
            {operatorDailyReport.vehicleIssues.map((vehicleIssue) => (
              <VehicleIssueCard
                vehicleIssue={vehicleIssue}
                key={vehicleIssue._id}
              />
            ))}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      {/* OPERATOR REPORT */}
      <Card heading={<Heading size="md">Report</Heading>}>
        <Box backgroundColor="gray.200" borderRadius={4} p={2} m={2}>
          <Heading size="md">General</Heading>
          <FormComponents.EquipmentUsage isDisabled={isDisabled} />
          <FormComponents.StartTime isDisabled={isDisabled} />
        </Box>
        <Box backgroundColor="gray.200" borderRadius={4} p={2} m={2}>
          <Heading size="md">Checklist</Heading>
          <SimpleGrid columns={[1, 2]} spacing={2}>
            <FormComponents.Checklist.Walkaround isDisabled={isDisabled} />
            <FormComponents.Checklist.VisualInspection
              isDisabled={isDisabled}
            />
            <FormComponents.Checklist.Oil isDisabled={isDisabled} />
            <FormComponents.Checklist.Coolant isDisabled={isDisabled} />
            <FormComponents.Checklist.Fluids isDisabled={isDisabled} />
          </SimpleGrid>
        </Box>
        <Box backgroundColor="gray.200" borderRadius={4} p={2} m={2}>
          <Heading size="md">Function Checks</Heading>
          <SimpleGrid columns={[1, 2]} spacing={2}>
            <FormComponents.FunctionChecks.BackupAlarm
              isDisabled={isDisabled}
            />
            <FormComponents.FunctionChecks.Lights isDisabled={isDisabled} />
            <FormComponents.FunctionChecks.LicensePlate
              isDisabled={isDisabled}
            />
            <FormComponents.FunctionChecks.FireExtinguisher
              isDisabled={isDisabled}
            />
          </SimpleGrid>
        </Box>
        <Box backgroundColor="gray.200" borderRadius={4} p={2} m={2}>
          <Heading size="md">Issue Checks</Heading>
          <SimpleGrid columns={[1, 2]} spacing={2}>
            <FormComponents.DamageObserved isDisabled={isDisabled} />
            <FormComponents.Malfunction isDisabled={isDisabled} />
          </SimpleGrid>
        </Box>
        <Box backgroundColor="gray.200" borderRadius={4} p={2} m={2}>
          <Heading size="md">Leaks</Heading>
          <FormComponents.Leaks isDisabled={isDisabled} m={2} />
        </Box>
        <Box backgroundColor="gray.200" borderRadius={4} p={2} m={2}>
          <Heading size="md">Fluids Added</Heading>
          <FormComponents.FluidsAdded isDisabled={isDisabled} m={2} />
        </Box>
      </Card>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrOperatorDailyReportFull.getServerPage(
    { variables: { id: params?.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.operatorDailyReport) notFound = true;

  return { ...res, notFound };
};

export default OperatorDailyReport;
