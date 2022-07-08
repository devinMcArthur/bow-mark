import { Center, Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { JobsiteFullSnippetFragment } from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import FormContainer from "../../../../Common/FormContainer";
import Permission from "../../../../Common/Permission";
import ShowMore from "../../../../Common/ShowMore";
import JobsiteRevenueInvoiceCreate from "../../../../Forms/Jobsite/RevenueInvoiceCreate";
import InvoiceCardForJobsite from "./InvoiceCard";

interface IRevenueInvoices {
  jobsite: JobsiteFullSnippetFragment;
}

const RevenueInvoices = ({ jobsite }: IRevenueInvoices) => {
  /**
   * ----- Hook Initialization -----
   */

  const [addForm, setAddForm] = React.useState(false);

  /**
   * ----- Variables -----
   */

  const sortedInvoices = [...jobsite.revenueInvoices].sort((a, b) =>
    a.company.name.localeCompare(b.company.name)
  );

  /**
   * ----- Rendering -----
   */

  return (
    <Card h="fit-content">
      <Flex flexDir="row" justifyContent="space-between">
        <Heading my="auto" ml={2} size="md" w="100%">
          Revenue ({jobsite.revenueInvoices.length})
        </Heading>
        <Permission>
          <IconButton
            icon={addForm ? <FiX /> : <FiPlus />}
            aria-label="add"
            backgroundColor="transparent"
            onClick={() => setAddForm(!addForm)}
          />
        </Permission>
      </Flex>
      {addForm && (
        <FormContainer>
          <JobsiteRevenueInvoiceCreate
            onSuccess={() => setAddForm(false)}
            jobsiteId={jobsite._id}
          />
        </FormContainer>
      )}
      <Flex w="100%" flexDir="column" px={4} py={2}>
        {jobsite.revenueInvoices.length > 0 ? (
          <ShowMore
            list={sortedInvoices.map((invoice) => (
              <InvoiceCardForJobsite
                invoice={invoice}
                key={invoice._id}
                jobsiteId={jobsite._id}
              />
            ))}
          />
        ) : (
          <Center>No Invoices</Center>
        )}
      </Flex>
    </Card>
  );
};

export default RevenueInvoices;
