import {
  Box,
  Flex,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { FiArchive, FiEdit, FiTrash, FiUnlock } from "react-icons/fi";
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
import JobsiteFileObjects from "./views/FileObjects";
import JobsiteMaterialsCosting from "./views/JobsiteMaterials";
import JobsiteRemoveModal from "./views/RemoveModal";
import RevenueInvoices from "./views/RevenueInvoices";
import TruckingRates from "./views/TruckingRates";
import JobsiteContract from "./views/Contract";
import Switch from "../../../Common/forms/Switch";

interface IJobsiteClientContent {
  id: string;
}

const JobsiteClientContent = ({ id }: IJobsiteClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data } = useJobsiteFullQuery({
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

  const router = useRouter();

  const [previousYears, setPreviousYears] = React.useState(false);

  /**
   * ----- Variables -----
   */

  const jobsiteMaterialQuery = React.useMemo(() => {
    if (router.query[JobsiteQueryKeys.jobsiteMaterial])
      return router.query[JobsiteQueryKeys.jobsiteMaterial];
    else return null;
  }, [router]);

  const dailyReports = React.useMemo(() => {
    if (previousYears) {
      return allData?.jobsite.dailyReports;
    } else {
      return currentYearData?.jobsite.yearsDailyReports;
    }
  }, [
    allData?.jobsite.dailyReports,
    currentYearData?.jobsite.yearsDailyReports,
    previousYears,
  ]);

  const expenseInvoices = React.useMemo(() => {
    if (previousYears) {
      return allData?.jobsite.expenseInvoices;
    } else {
      return currentYearData?.jobsite.yearsExpenseInvoices;
    }
  }, [
    allData?.jobsite.expenseInvoices,
    currentYearData?.jobsite.yearsExpenseInvoices,
    previousYears,
  ]);

  const revenueInvoices = React.useMemo(() => {
    if (previousYears) {
      return allData?.jobsite.revenueInvoices;
    } else {
      return currentYearData?.jobsite.yearsRevenueInvoices;
    }
  }, [
    allData?.jobsite.revenueInvoices,
    currentYearData?.jobsite.yearsRevenueInvoices,
    previousYears,
  ]);

  /**
   * ----- Lifecycle -----
   */

  React.useEffect(() => {
    if (previousYears && !allData?.jobsite) {
      allDataQuery();
    } else if (!previousYears && !currentYearData?.jobsite) {
      currentYearQuery();
    }
  }, [
    allData?.jobsite,
    allDataQuery,
    currentYearData?.jobsite,
    currentYearQuery,
    previousYears,
  ]);

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (data?.jobsite) {
      const { jobsite } = data;

      return (
        <Box>
          <Card>
            <Flex flexDir="row" justifyContent="space-between">
              <Box>
                <Text>
                  <Text fontWeight="bold" as="span">
                    Number:{" "}
                  </Text>
                  {jobsite.jobcode}
                </Text>
                {jobsite.description && (
                  <Text>
                    <Text fontWeight="bold" as="span">
                      Description:{" "}
                    </Text>
                    {jobsite.description}
                  </Text>
                )}
                <Switch
                  label="Previous Data"
                  isChecked={previousYears}
                  onChange={() => setPreviousYears(!previousYears)}
                  id="previous-data"
                />
              </Box>
              <Flex flexDir="row" spacing={2}>
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
            </Flex>
          </Card>
          <JobsiteFileObjects jobsite={jobsite} />
          <Permission minRole={UserRoles.ProjectManager}>
            <SimpleGrid columns={[1, 1, 1, 2]} spacingX={4} spacingY={2}>
              <JobsiteMaterialsCosting
                jobsite={jobsite}
                selectedJobsiteMaterial={jobsiteMaterialQuery as string}
                showPreviousYears={previousYears}
              />
              <TruckingRates jobsite={jobsite} />
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
            <SimpleGrid columns={[1, 1, 1, 2]} spacingX={4} spacingY={2}>
              <JobsiteYearlyReportList
                jobsiteYearReports={jobsite.yearReports}
              />
              <JobsiteMonthlyReportList
                jobsiteMonthReports={jobsite.monthReports}
              />
            </SimpleGrid>
          </Permission>
          <DailyReportListCard
            dailyReports={dailyReports}
            jobsiteId={jobsite._id}
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
        </Box>
      );
    } else return <Loading />;
  }, [
    data,
    previousYears,
    dailyReports,
    expenseInvoices,
    revenueInvoices,
    isOpen,
    isOpenRemove,
    jobsiteMaterialQuery,
    onClose,
    onCloseRemove,
    onOpen,
    onOpenRemove,
    router,
  ]);
};

export default JobsiteClientContent;
