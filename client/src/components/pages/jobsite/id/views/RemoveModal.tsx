import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import router from "next/router";
import React from "react";
import { FiTrash, FiX } from "react-icons/fi";
import {
  DailyReportCardSnippetFragment,
  InvoiceCardSnippetFragment,
  JobsiteFullSnippetFragment,
  useJobsiteRemoveMutation,
} from "../../../../../generated/graphql";
import createLink from "../../../../../utils/createLink";
import TextField from "../../../../Common/forms/TextField";
import JobsiteSearch from "../../../../Search/JobsiteSearch";

interface IJobsiteRemoveModal {
  jobsite: JobsiteFullSnippetFragment;
  dailyReports: DailyReportCardSnippetFragment[];
  revenueInvoices: InvoiceCardSnippetFragment[];
  expenseInvoices: InvoiceCardSnippetFragment[];
  isOpen: boolean;
  onClose: () => void;
}

const JobsiteRemoveModal = ({
  jobsite,
  dailyReports,
  revenueInvoices,
  expenseInvoices,
  isOpen,
  onClose,
}: IJobsiteRemoveModal) => {
  /**
   * ----- Hook Initialization -----
   */

  const [step, setStep] = React.useState(0);

  const [transferJobsiteId, setTransferJobsiteId] = React.useState<string>();

  const [jobsiteNameConfirmation, setJobsiteNameConfirmation] =
    React.useState<string>("");

  const [remove, { loading }] = useJobsiteRemoveMutation();

  const toast = useToast();

  /**
   * ----- Variables -----
   */

  const requiresTransfer = React.useMemo(() => {
    if (dailyReports.length > 0) return true;
    if (revenueInvoices.length > 0) return true;
    if (expenseInvoices.length > 0) return true;
    if (jobsite.materials.length > 0) return true;
    return false;
  }, [
    dailyReports.length,
    expenseInvoices.length,
    jobsite.materials.length,
    revenueInvoices.length,
  ]);

  /**
   * ----- Functions -----
   */

  const handleRemove = async () => {
    try {
      const res = await remove({
        variables: {
          id: jobsite._id,
          transferJobsiteId,
        },
      });

      if (res.data?.jobsiteRemove) {
        onClose();
        if (transferJobsiteId) {
          router.push(createLink.jobsite(transferJobsiteId));
        } else {
          router.push("/");
        }
      } else {
        toast({
          status: "error",
          title: "Error",
          description: "Something went wrong, please try again",
          isClosable: true,
        });
      }
    } catch (e: any) {
      toast({
        status: "error",
        title: "Error",
        description: e.message,
        isClosable: true,
      });
    }
  };

  const handleRemoveButtonClick = () => {
    if (step === 0) {
      if (requiresTransfer) {
        setStep(1);
      } else {
        handleRemove();
      }
    } else {
      if (jobsiteNameConfirmation.trim() === jobsite.name.trim()) {
        handleRemove();
      } else {
        toast({
          status: "error",
          title: "Error",
          description: "Jobsite name does not match",
          isClosable: true,
        });
      }
    }
  };

  /**
   * ----- Render -----
   */

  const bodyContent = React.useMemo(() => {
    if (step === 0) {
      if (requiresTransfer) {
        return (
          <Stack spacing={2}>
            <Text>
              This jobsite has associated invoices, reports and/or materials.
            </Text>
            <Text fontWeight="bold">
              Please choose a jobsite to transfer this data to before removing
              this jobsite.
            </Text>
            <JobsiteSearch
              jobsiteSelected={(jobsite) => setTransferJobsiteId(jobsite._id)}
            />
          </Stack>
        );
      } else {
        return (
          <Text fontWeight="bold">
            Are you sure you want to remove this jobsite? This action cannot be
            undone.
          </Text>
        );
      }
    } else {
      // Get user to enter name of jobsite they are deleting
      return (
        <Stack spacing={2}>
          <Text fontWeight="bold">
            Please enter the name of the jobsite you are deleting.
          </Text>
          <Text>
            This is to prevent accidental deletions. If you are sure you want to
            delete this jobsite, please enter the name of the jobsite below.
          </Text>
          <Text fontWeight="bold">Jobsite Name</Text>
          <TextField
            value={jobsiteNameConfirmation}
            onChange={(e) => setJobsiteNameConfirmation(e.target.value)}
          />
        </Stack>
      );
    }
  }, [jobsiteNameConfirmation, requiresTransfer, step]);

  return (
    <Modal isOpen={isOpen} onClose={() => onClose()}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Remove Jobsite</ModalHeader>
        <ModalBody>{bodyContent}</ModalBody>
        <ModalFooter>
          <SimpleGrid columns={2} spacing={2}>
            <Button
              onClick={() => onClose()}
              colorScheme="gray"
              variant="outline"
              leftIcon={<FiX />}
              size="md"
              isLoading={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleRemoveButtonClick();
              }}
              colorScheme="red"
              isLoading={loading}
              loadingText="Removing..."
              variant="solid"
              leftIcon={<FiTrash />}
              size="md"
              mr={2}
            >
              Remove
            </Button>
          </SimpleGrid>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default JobsiteRemoveModal;
