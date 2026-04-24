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
  InvoiceCardSnippetFragment,
  JobsiteFullSnippetFragment,
} from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import Permission from "../../../../Common/Permission";
import ShowMore from "../../../../Common/ShowMore";
import JobsiteRevenueInvoiceCreate from "../../../../Forms/Jobsite/RevenueInvoiceCreate";
import InvoiceCardForJobsite from "./InvoiceCard";

interface IRevenueInvoices {
  jobsite: JobsiteFullSnippetFragment;
  revenueInvoices?: InvoiceCardSnippetFragment[];
  displayFullList?: boolean;
  hideExpand?: boolean;
}

const RevenueInvoices = ({
  jobsite,
  revenueInvoices,
  displayFullList = false,
  hideExpand = false,
}: IRevenueInvoices) => {
  /**
   * ----- Hook Initialization -----
   */

  const [addForm, setAddForm] = React.useState(false);

  const { addPanel } = usePanel();

  /**
   * ----- Variables -----
   */

  const sortedInvoices = revenueInvoices
    ? [...revenueInvoices].sort((a, b) =>
        a.company.name.localeCompare(b.company.name)
      )
    : undefined;

  /**
   * ----- Rendering -----
   */

  let list: React.ReactNode = <Center>No Invoices</Center>;
  if (sortedInvoices && sortedInvoices.length > 0) {
    if (displayFullList) {
      list = sortedInvoices.map((invoice) => (
        <InvoiceCardForJobsite
          invoice={invoice}
          key={invoice._id}
          jobsiteId={jobsite._id}
          invoiceKind="revenue"
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
              invoiceKind="revenue"
            />
          ))}
        />
      );
    }
  } else if (revenueInvoices === undefined) {
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
            Revenue {revenueInvoices ? `(${revenueInvoices.length})` : ""}
          </Heading>
          <Flex flexDir="row">
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
                onClick={() => addPanel.jobsiteRevenueInvoices(jobsite)}
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

      <Drawer
        isOpen={addForm}
        onClose={() => setAddForm(false)}
        placement="right"
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Add Revenue Invoice(s)</DrawerHeader>
          <DrawerBody pb={6}>
            <JobsiteRevenueInvoiceCreate
              onSuccess={() => setAddForm(false)}
              jobsiteId={jobsite._id}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Card>
  );
};

export default RevenueInvoices;
