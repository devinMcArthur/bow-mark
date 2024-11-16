import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  IconButton,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { InvoiceCardSnippetFragment, JobsiteMaterialCardSnippetFragment } from "../../../generated/graphql";
import JobsiteMaterialInvoiceAddForm from "../../Forms/JobsiteMaterial/InvoiceAdd";
import FormContainer from "../FormContainer";
import Permission from "../Permission";
import InvoiceCardForJobsiteMaterial from "./InvoiceCard";
import dayjs from "dayjs";

interface IJobsiteMaterialInvoices {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  invoices: InvoiceCardSnippetFragment[]
  showPreviousYears?: boolean;
}

const JobsiteMaterialInvoices = ({
  jobsiteMaterial,
  invoices: propInvoices,
  showPreviousYears,
}: IJobsiteMaterialInvoices) => {
  /**
   * ----- Hook Initialization -----
   */

  const [addForm, setAddForm] = React.useState(false);

  /**
   * ----- Variables -----
   */

  const sortedInvoices = React.useMemo(() => {
    let invoices = propInvoices;

    if (invoices && !showPreviousYears) {
      invoices = invoices?.filter((a) => {
        return dayjs(a.date).isSame(dayjs(), "year");
      });
    }

    return invoices?.slice().sort((a, b) => {
      return a.company.name.localeCompare(b.company.name);
    });
  }, [propInvoices, showPreviousYears]);

  /**
   * ----- Rendering -----
   */

  return (
    <Box w="100%">
      <Permission>
        {addForm ? (
          <FormContainer>
            <Flex justifyContent="space-between">
              <Heading ml={1} my="auto" size="md">
                Add Invoice
              </Heading>
              <IconButton
                icon={<FiX />}
                aria-label="exit"
                onClick={() => setAddForm(false)}
                size="sm"
                backgroundColor="transparent"
              />
            </Flex>
            <JobsiteMaterialInvoiceAddForm
              jobsiteMaterial={jobsiteMaterial}
              onSuccess={() => setAddForm(false)}
            />
          </FormContainer>
        ) : (
          <Center my={2}>
            <Button
              leftIcon={<FiPlus />}
              border="1px solid"
              borderColor="gray.800"
              variant="outline"
              onClick={() => setAddForm(true)}
            >
              Add Invoice
            </Button>
          </Center>
        )}
      </Permission>

      <Flex flexDir="column" maxH="25vh" overflowY="scroll">
        {sortedInvoices &&
          sortedInvoices.map((invoice) => (
            <InvoiceCardForJobsiteMaterial
              invoice={invoice}
              jobsiteMaterialId={jobsiteMaterial._id}
              key={invoice._id}
            />
          ))}
      </Flex>
    </Box>
  );
};

export default JobsiteMaterialInvoices;
