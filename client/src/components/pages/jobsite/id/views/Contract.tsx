import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiPlus } from "react-icons/fi";

import {
  JobsiteContractData,
  JobsiteFullSnippetFragment,
  useJobsiteUpdateContractMutation,
} from "../../../../../generated/graphql";
import formatNumber from "../../../../../utils/formatNumber";
import Card from "../../../../Common/Card";
import Permission from "../../../../Common/Permission";
import JobsiteContractForm from "../../../../Forms/Jobsite/Contract";

interface IJobsiteContract {
  jobsite: JobsiteFullSnippetFragment;
}

const JobsiteContract = ({ jobsite }: IJobsiteContract) => {
  /**
   * ----- Hook Initialization -----
   */

  const [showForm, setShowForm] = React.useState(false);

  const [update, { loading }] = useJobsiteUpdateContractMutation();

  const toast = useToast();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: JobsiteContractData) => {
      try {
        const res = await update({
          variables: {
            id: jobsite._id,
            data,
          },
        });

        if (res.data?.jobsiteContract) {
          toast({
            status: "success",
            title: "Success",
            description: "Successfully updated contract",
            isClosable: true,
          });
          setShowForm(false);
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
    },
    [jobsite._id, toast, update]
  );

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    if (jobsite.contract) {
      return (
        <SimpleGrid spacing={2} columns={[2, 2, 3]}>
          <Stat display="flex" justifyContent="center">
            <StatLabel>Bid Value</StatLabel>
            <StatNumber>${formatNumber(jobsite.contract.bidValue)}</StatNumber>
          </Stat>
          <Stat display="flex" justifyContent="center">
            <StatLabel>Profit</StatLabel>
            <StatNumber>
              ${formatNumber(jobsite.contract.expectedProfit)}
            </StatNumber>
          </Stat>
          <Stat display="flex" justifyContent="center">
            <StatLabel>Work on Hand</StatLabel>
            <StatNumber>
              ${formatNumber(jobsite.contract.workOnHand)}
            </StatNumber>
          </Stat>
        </SimpleGrid>
      );
    } else {
      return (
        <Permission>
          <Button
            mx="auto"
            w="72"
            rightIcon={<FiPlus />}
            onClick={() => setShowForm(true)}
          >
            Add Contract Details
          </Button>
        </Permission>
      );
    }
  }, [jobsite.contract]);

  const rightButton = React.useMemo(() => {
    if (!jobsite.contract) return null;

    return (
      <IconButton
        icon={<FiEdit />}
        aria-label="Edit contract"
        backgroundColor="transparent"
        onClick={() => setShowForm(true)}
      />
    );
  }, [jobsite.contract]);

  const progress = React.useMemo(() => {
    if (jobsite.contract) {
      const percentComplete =
        100 -
        (jobsite.contract.workOnHand /
          (jobsite.contract.bidValue - jobsite.contract.expectedProfit)) *
          100;

      let percent = percentComplete;

      let borderTopRightRadius = "";
      let backgroundColor = "blue.200";
      if (percentComplete > 100) {
        percent = 100;
        backgroundColor = "green.200";
      } else borderTopRightRadius = "0.25em";

      return (
        <Box
          w="inherit"
          position="relative"
          bottom={-2}
          marginX={-2}
          h={1}
          borderBottomRadius="0.25em"
        >
          <Tooltip label={`Progress: ${formatNumber(percentComplete)}%`}>
            <Box
              cursor="help"
              borderTopRightRadius={borderTopRightRadius}
              borderBottomRadius="0.25em"
              backgroundColor={backgroundColor}
              w={`${percent}%`}
              h="100%"
            />
          </Tooltip>
        </Box>
      );
    } else return null;
  }, [jobsite.contract]);

  return (
    <Card variant="flat" h="fit-content">
      <Flex flexDirection="row" justifyContent="space-between">
        <Heading my="auto" ml={2} size="md" w="100%">
          Contract
        </Heading>
        <Permission>{rightButton}</Permission>
      </Flex>
      {content}
      {progress}

      <Drawer
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        placement="right"
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            {jobsite.contract ? "Edit Contract" : "Add Contract Details"}
          </DrawerHeader>
          <DrawerBody pb={6}>
            <JobsiteContractForm
              submitHandler={handleSubmit}
              formOptions={{
                defaultValues: {
                  bidValue: jobsite.contract?.bidValue,
                  expectedProfit: jobsite.contract?.expectedProfit,
                },
              }}
              isLoading={loading}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Card>
  );
};

export default JobsiteContract;
