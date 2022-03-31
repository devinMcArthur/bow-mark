import { Box, Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { JobsiteFullSnippetFragment } from "../../../../generated/graphql";
import Card from "../../../Common/Card";
import InvoiceCreate from "../../../Forms/Invoice/InvoiceCreate";
import InvoiceCard from "./InvoiceCard";

interface IInvoices {
  jobsite: JobsiteFullSnippetFragment;
}

const Invoices = ({ jobsite }: IInvoices) => {
  /**
   * ----- Hook Initialization -----
   */

  const [collapsed, setCollapsed] = React.useState(true);

  const [addForm, setAddForm] = React.useState(false);

  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between">
        <Heading
          my="auto"
          ml={2}
          size="md"
          w="100%"
          cursor="pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          Invoices ({jobsite.invoices.length})
        </Heading>
        <IconButton
          icon={addForm ? <FiX /> : <FiPlus />}
          aria-label="add"
          backgroundColor="transparent"
          onClick={() => setAddForm(!addForm)}
        />
      </Flex>
      {addForm && (
        <Box backgroundColor="gray.200" borderRadius={4} p={2} m={2}>
          <InvoiceCreate
            onSuccess={() => setAddForm(false)}
            jobsiteId={jobsite._id}
          />
        </Box>
      )}
      {!collapsed && (
        <Flex w="100%" flexDir="column" px={4} py={2}>
          {jobsite.invoices.map((invoice) => (
            <InvoiceCard invoice={invoice} key={invoice._id} />
          ))}
        </Flex>
      )}
    </Card>
  );
};

export default Invoices;