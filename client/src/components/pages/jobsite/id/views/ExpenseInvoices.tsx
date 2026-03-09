import {
  Center,
  Flex,
  Heading,
  IconButton,
  Skeleton,
  Stack,
} from "@chakra-ui/react";
import React from "react";
import { FiMaximize, FiPlus, FiX } from "react-icons/fi";
import { usePanel } from "../../../../../contexts/Panel";
import {
  JobsiteFullSnippetFragment,
  InvoiceCardSnippetFragment,
} from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import FormContainer from "../../../../Common/FormContainer";
import Permission from "../../../../Common/Permission";
import ShowMore from "../../../../Common/ShowMore";
import JobsiteExpenseInvoiceCreate from "../../../../Forms/Jobsite/ExpenseInvoiceCreate";
import InvoiceCardForJobsite from "./InvoiceCard";

interface IExpenseInvoices {
  jobsite: JobsiteFullSnippetFragment;
  expenseInvoices?: InvoiceCardSnippetFragment[];
  displayFullList?: boolean;
  hideExpand?: boolean;
}

const ExpenseInvoices = ({
  jobsite,
  expenseInvoices,
  displayFullList = false,
  hideExpand = false,
}: IExpenseInvoices) => {
  /**
   * ----- Hook Initialization -----
   */

  const [addForm, setAddForm] = React.useState(false);

  const { addPanel } = usePanel();

  /**
   * ----- Variables -----
   */

  const sortedInvoices = expenseInvoices
    ? [...expenseInvoices].sort((a, b) =>
        a.company.name.localeCompare(b.company.name)
      )
    : undefined;

  /**
   * ----- Rendering -----
   */

  let list: React.ReactNode = <Center>No Invoices</Center>;
  if (sortedInvoices && expenseInvoices && expenseInvoices.length > 0) {
    if (displayFullList) {
      list = sortedInvoices.map((invoice) => (
        <InvoiceCardForJobsite
          invoice={invoice}
          key={invoice._id}
          jobsiteId={jobsite._id}
        />
      ));
    } else {
      list = (
        <ShowMore
          list={sortedInvoices.map((invoice) => (
            <InvoiceCardForJobsite
              invoice={invoice}
              key={invoice._id}
              jobsiteId={jobsite._id}
            />
          ))}
        />
      );
    }
  } else if (expenseInvoices === undefined) {
    list = (
      <Stack>
        <Skeleton h="4em" />
        <Skeleton h="4em" />
        <Skeleton h="4em" />
      </Stack>
    );
  }

  return (
    <Card h="fit-content">
      <Flex flexDir="row" justifyContent="space-between">
        <Heading my="auto" ml={2} size="md" w="100%">
          Sub-Contractors {expenseInvoices ? `(${expenseInvoices.length})` : ""}
        </Heading>
        <Flex flexDir="row" justifyContent="space-between">
          <Permission>
            <IconButton
              icon={addForm ? <FiX /> : <FiPlus />}
              aria-label="add"
              backgroundColor="transparent"
              onClick={() => setAddForm(!addForm)}
            />
          </Permission>
          {!hideExpand && (
            <IconButton
              icon={<FiMaximize />}
              aria-label="maximize"
              onClick={() => addPanel.jobsiteExpenseInvoices(jobsite)}
              background="transparent"
            />
          )}
        </Flex>
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
        {list}
      </Flex>
    </Card>
  );
};

export default ExpenseInvoices;
