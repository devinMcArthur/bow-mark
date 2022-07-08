import { Center, Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { JobsiteFullSnippetFragment } from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import FormContainer from "../../../../Common/FormContainer";
import Permission from "../../../../Common/Permission";
import ShowMore from "../../../../Common/ShowMore";
import JobsiteExpenseInvoiceCreate from "../../../../Forms/Jobsite/ExpenseInvoiceCreate";
import InvoiceCardForJobsite from "./InvoiceCard";

interface IExpenseInvoices {
  jobsite: JobsiteFullSnippetFragment;
}

const ExpenseInvoices = ({ jobsite }: IExpenseInvoices) => {
  /**
   * ----- Hook Initialization -----
   */

  const [addForm, setAddForm] = React.useState(false);

  /**
   * ----- Variables -----
   */

  const sortedInvoices = [...jobsite.expenseInvoices].sort((a, b) =>
    a.company.name.localeCompare(b.company.name)
  );

  /**
   * ----- Rendering -----
   */

  return (
    <Card h="fit-content">
      <Flex flexDir="row" justifyContent="space-between">
        <Heading my="auto" ml={2} size="md" w="100%">
          Sub-Contractors ({jobsite.expenseInvoices.length})
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
          <JobsiteExpenseInvoiceCreate
            onSuccess={() => setAddForm(false)}
            jobsiteId={jobsite._id}
          />
        </FormContainer>
      )}
      <Flex w="100%" flexDir="column" px={4} py={2}>
        {jobsite.expenseInvoices.length > 0 ? (
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

export default ExpenseInvoices;
