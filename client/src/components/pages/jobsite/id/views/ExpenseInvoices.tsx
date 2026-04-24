import {
  Center,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  IconButton,
  Skeleton,
  Stack,
} from "@chakra-ui/react";
import React from "react";
import { FiMaximize, FiPlus } from "react-icons/fi";
import { usePanel } from "../../../../../contexts/Panel";
import {
  JobsiteFullSnippetFragment,
  InvoiceCardSnippetFragment,
} from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
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
          invoiceKind="subcontractor"
        />
      ));
    } else {
      list = (
        <ShowMore
          maxH="50vh"
          limit={6}
          list={sortedInvoices.map((invoice) => (
            <InvoiceCardForJobsite
              invoice={invoice}
              key={invoice._id}
              jobsiteId={jobsite._id}
              invoiceKind="subcontractor"
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
    <Card
      variant="flat"
      heading={
        <Flex flexDir="row" justifyContent="space-between" align="center">
          <Heading my="auto" ml={2} size="md" w="100%">
            Sub-Contractors {expenseInvoices ? `(${expenseInvoices.length})` : ""}
          </Heading>
          <Flex flexDir="row" justifyContent="space-between">
            <Permission>
              <IconButton
                icon={<FiPlus />}
                aria-label="Add invoice"
                backgroundColor="transparent"
                onClick={() => setAddForm(true)}
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
      }
    >
      <Flex w="100%" flexDir="column" px={4} py={2}>
        {list}
      </Flex>

      {/* Add drawer — matches the edit drawer pattern so create and
          edit feel like one mental model. Bulk create lives in the
          same drawer since the form is already bulk-capable. */}
      <Drawer
        isOpen={addForm}
        onClose={() => setAddForm(false)}
        placement="right"
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Add Subcontractor Invoice(s)</DrawerHeader>
          <DrawerBody pb={6}>
            <JobsiteExpenseInvoiceCreate
              onSuccess={() => setAddForm(false)}
              jobsiteId={jobsite._id}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Card>
  );
};

export default ExpenseInvoices;
