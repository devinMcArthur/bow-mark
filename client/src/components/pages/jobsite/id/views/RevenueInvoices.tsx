import { Center, Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiMaximize, FiPlus, FiX } from "react-icons/fi";
import { usePanel } from "../../../../../contexts/Panel";
import { JobsiteFullSnippetFragment } from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import FormContainer from "../../../../Common/FormContainer";
import Permission from "../../../../Common/Permission";
import ShowMore from "../../../../Common/ShowMore";
import JobsiteRevenueInvoiceCreate from "../../../../Forms/Jobsite/RevenueInvoiceCreate";
import InvoiceCardForJobsite from "./InvoiceCard";

interface IRevenueInvoices {
  jobsite: JobsiteFullSnippetFragment;
  displayFullList?: boolean;
  hideExpand?: boolean;
}

const RevenueInvoices = ({
  jobsite,
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

  const sortedInvoices = [...jobsite.revenueInvoices].sort((a, b) =>
    a.company.name.localeCompare(b.company.name)
  );

  /**
   * ----- Rendering -----
   */

  let list: React.ReactNode = <Center>No Invoices</Center>;
  if (jobsite.revenueInvoices.length > 0) {
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
  }

  return (
    <Card h="fit-content">
      <Flex flexDir="row" justifyContent="space-between">
        <Heading my="auto" ml={2} size="md" w="100%">
          Revenue ({jobsite.revenueInvoices.length})
        </Heading>
        <Flex flexDir="row">
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
              onClick={() => addPanel.jobsiteRevenueInvoices(jobsite)}
              background="transparent"
            />
          )}
        </Flex>
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
        {list}
      </Flex>
    </Card>
  );
};

export default RevenueInvoices;
