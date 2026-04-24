import {
  Box,
  Button,
  Center,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Text,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus } from "react-icons/fi";
import {
  InvoiceCardSnippetFragment,
  JobsiteMaterialCardSnippetFragment,
} from "../../../generated/graphql";
import JobsiteMaterialInvoiceAddForm from "../../Forms/JobsiteMaterial/InvoiceAdd";
import Permission from "../Permission";
import InvoiceCardForJobsiteMaterial from "./InvoiceCard";
import dayjs from "dayjs";

interface IJobsiteMaterialInvoices {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  invoices: InvoiceCardSnippetFragment[];
  /** Parent jobsite id. Threaded through for file-attachment routing. */
  jobsiteId?: string;
  showPreviousYears?: boolean;
}

const JobsiteMaterialInvoices = ({
  jobsiteMaterial,
  invoices: propInvoices,
  jobsiteId,
  showPreviousYears,
}: IJobsiteMaterialInvoices) => {
  const [addForm, setAddForm] = React.useState(false);

  const sortedInvoices = React.useMemo(() => {
    let invoices = propInvoices;
    if (invoices && !showPreviousYears) {
      invoices = invoices?.filter((a) =>
        dayjs(a.date).isSame(dayjs(), "year")
      );
    }
    return invoices?.slice().sort((a, b) =>
      a.company.name.localeCompare(b.company.name)
    );
  }, [propInvoices, showPreviousYears]);

  const count = sortedInvoices?.length ?? 0;

  return (
    <Box w="100%" mt={3}>
      {/* Header row: count label on the left, Add button on the right.
          Matches the Sub-Contractors / Revenue card header pattern so
          the Add affordance doesn't float alone in the middle. */}
      <Flex
        align="center"
        justify="space-between"
        mb={2}
        pb={2}
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Invoices ({count})
        </Text>
        <Permission>
          <Button
            size="xs"
            variant="outline"
            leftIcon={<FiPlus />}
            onClick={() => setAddForm(true)}
          >
            Add
          </Button>
        </Permission>
      </Flex>

      {count === 0 ? (
        <Center
          py={4}
          fontSize="sm"
          color="gray.500"
          bg="gray.50"
          borderRadius="md"
        >
          No invoices yet
        </Center>
      ) : (
        <Flex flexDir="column" gap={1} maxH="30vh" overflowY="auto">
          {sortedInvoices!.map((invoice) => (
            <InvoiceCardForJobsiteMaterial
              invoice={invoice}
              jobsiteMaterialId={jobsiteMaterial._id}
              jobsiteId={jobsiteId}
              key={invoice._id}
            />
          ))}
        </Flex>
      )}

      <Drawer
        isOpen={addForm}
        onClose={() => setAddForm(false)}
        placement="right"
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Add Material Invoice(s)</DrawerHeader>
          <DrawerBody pb={6}>
            <JobsiteMaterialInvoiceAddForm
              jobsiteMaterial={jobsiteMaterial}
              jobsiteId={jobsiteId}
              onSuccess={() => setAddForm(false)}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default JobsiteMaterialInvoices;
