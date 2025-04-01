import {
  Box,
  Flex,
  Icon,
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
  useToast,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React from "react";
import { FiArchive, FiDownload, FiEdit } from "react-icons/fi";
import { useAuth } from "../../../../contexts/Auth";
import { useDailyReportUpdateForm } from "../../../../forms/dailyReport";
import {
  useDailyReportArchiveMutation,
  useDailyReportFullQuery,
  useDailyReportJobCostApprovalUpdateMutation,
  useDailyReportPayrollCompleteUpdateMutation,
  useDailyReportUpdateMutation,
  UserRoles,
} from "../../../../generated/graphql";
import createLink from "../../../../utils/createLink";

import Card from "../../../Common/Card";
import Checkbox from "../../../Common/forms/Checkbox";
import SubmitButton from "../../../Common/forms/SubmitButton";
import Loading from "../../../Common/Loading";
import Permission from "../../../Common/Permission";
import TextGrid from "../../../Common/TextGrid";
import TextLink from "../../../Common/TextLink";
import EmployeeHours from "./views/EmployeeHours";
import MaterialShipments from "./views/MaterialShipments";
import Production from "./views/Production";
import ReportNotes from "./views/ReportNotes";
import VehicleWork from "./views/VehicleWork";

interface IDailyReportClientContent {
  id: string;
}

const DailyReportClientContent = ({ id }: IDailyReportClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { user },
  } = useAuth();

  const router = useRouter();

  const { data } = useDailyReportFullQuery({
    variables: {
      id,
    },
  });

  const {
    isOpen: editModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
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

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    if (data?.dailyReport) {
      return (
        <Box>
          <Card>
            <Flex flexDir="row" justifyContent="space-evenly">
              <SimpleGrid
                columns={user?.role === UserRoles.Admin ? [1, 1, 2] : 1}
                spacing={4}
                w={["85%", "90%", "95%"]}
              >
                <Box
                  backgroundColor="gray.100"
                  borderRadius={4}
                  m={2}
                  p={2}
                  w="100%"
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
                            {dayjs(data?.dailyReport.date).format(
                              "MMMM DD, YYYY"
                            )}
                          </Text>
                        ),
                      },
                      {
                        title: (
                          <Text as="span" fontWeight="bold">
                            Jobsite:{" "}
                          </Text>
                        ),
                        text: (
                          <TextLink
                            link={createLink.jobsite(
                              data?.dailyReport.jobsite._id
                            )}
                          >
                            {data?.dailyReport.jobsite.name}
                          </TextLink>
                        ),
                      },
                      {
                        title: (
                          <Text as="span" fontWeight="bold">
                            Crew:{" "}
                          </Text>
                        ),
                        text: (
                          <TextLink
                            link={createLink.crew(data?.dailyReport.crew._id)}
                          >
                            {data?.dailyReport.crew.name}
                          </TextLink>
                        ),
                      },
                    ]}
                  />
                </Box>
                <Permission>
                  <Box
                    backgroundColor="gray.100"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius={4}
                    m={2}
                    p={2}
                    w="100%"
                  >
                    <Flex flexDir="column">
                      <Checkbox
                        isDisabled={approvalLoading}
                        isChecked={data?.dailyReport.jobCostApproved}
                        onChange={(e) => {
                          updateApproval({
                            variables: {
                              id: data?.dailyReport._id,
                              approved: e.target.checked,
                            },
                          });
                        }}
                      >
                        Job Cost Approval
                      </Checkbox>
                      <Checkbox
                        isDisabled={payrollLoading}
                        isChecked={data?.dailyReport.payrollComplete}
                        onChange={(e) => {
                          updatePayrollComplete({
                            variables: {
                              id: data?.dailyReport._id,
                              complete: e.target.checked,
                            },
                          });
                        }}
                      >
                        Pay Roll Complete
                      </Checkbox>
                      <Text as="span" fontWeight="light">
                        Created At: {dayjs(new Date(parseInt(data.dailyReport._id.substring(0, 8), 16) * 1000)).format("MMMM DD, YYYY, h:mm a")}
                      </Text>
                    </Flex>
                  </Box>
                </Permission>
              </SimpleGrid>
              <Flex flexDir="column">
                <TextLink
                  link={createLink.server_dailyReportExcelDownload(
                    data?.dailyReport._id
                  )}
                  newTab
                  mx="auto"
                >
                  <Icon
                    cursor="pointer"
                    as={FiDownload}
                    backgroundColor="transparent"
                  />
                </TextLink>
                <Permission
                  minRole={UserRoles.ProjectManager}
                  otherCriteria={editPermission}
                >
                  <IconButton
                    backgroundColor="transparent"
                    icon={<FiEdit />}
                    aria-label="edit"
                    onClick={onEditModalOpen}
                  />
                  <Permission>
                    <IconButton
                      backgroundColor="transparent"
                      icon={<FiArchive />}
                      aria-label="archive"
                      isLoading={archiveLoading}
                      onClick={() => {
                        if (window.confirm("Are you sure?")) {
                          archive({
                            variables: {
                              id: data.dailyReport._id,
                            },
                          }).then(() => {
                            router.push("/");
                          });
                        }
                      }}
                    />
                  </Permission>
                </Permission>
              </Flex>
            </Flex>
          </Card>

          <SimpleGrid columns={[1, 1, 1, 2]} spacingX={4} spacingY={2}>
            <EmployeeHours
              dailyReport={data.dailyReport}
              editPermission={editPermission}
            />

            <VehicleWork
              dailyReport={data.dailyReport}
              editPermission={editPermission}
            />

            <Production
              dailyReport={data.dailyReport}
              editPermission={editPermission}
            />

            <MaterialShipments
              dailyReport={data.dailyReport}
              editPermission={editPermission}
            />
          </SimpleGrid>

          <ReportNotes
            dailyReport={data.dailyReport}
            editPermission={editPermission}
          />

          {/* REPORT EDIT MODAL */}
          <Modal isOpen={editModalOpen} onClose={onEditModalClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Edit Report</ModalHeader>
              <ModalCloseButton />

              <ModalBody>
                <FormComponents.Form
                  submitHandler={(data) => {
                    update({
                      variables: {
                        id,
                        data,
                      },
                    }).then(() => {
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
                    defaultValue={data.dailyReport.date}
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
                    defaultValue={data.dailyReport.jobsite._id}
                  />
                  <SubmitButton isLoading={loading} />
                </FormComponents.Form>
              </ModalBody>
            </ModalContent>
          </Modal>
        </Box>
      );
    } else {
      return <Loading />;
    }
  }, [
    FormComponents,
    approvalLoading,
    archive,
    archiveLoading,
    canUpdateJobsite,
    data?.dailyReport,
    editModalOpen,
    editPermission,
    id,
    loading,
    onEditModalClose,
    onEditModalOpen,
    payrollLoading,
    router,
    toast,
    update,
    updateApproval,
    updatePayrollComplete,
    user?.role,
  ]);

  return content;
};

export default DailyReportClientContent;
