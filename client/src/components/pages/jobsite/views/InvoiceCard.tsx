import React from "react";
import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { InvoiceCardSnippetFragment } from "../../../../generated/graphql";
import formatNumber from "../../../../utils/formatNumber";
import { FiEdit, FiX } from "react-icons/fi";
import InvoiceUpdate from "../../../Forms/Invoice/InvoiceUpdate";

interface IInvoiceCard {
  invoice: InvoiceCardSnippetFragment;
}

const InvoiceCard = ({ invoice }: IInvoiceCard) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <Flex flexDir="row" justifyContent="space-between">
        <Text>
          <Text as="span">
            <Text fontWeight="bold" as="span">
              {invoice.company.name} #{invoice.invoiceNumber}
            </Text>
            <Text as="span"> - ${formatNumber(invoice.cost)}</Text>
          </Text>
          <Text whiteSpace="pre-wrap">{invoice.description}</Text>
        </Text>
        <IconButton
          backgroundColor="transparent"
          aria-label="edit"
          icon={edit ? <FiX /> : <FiEdit />}
          onClick={() => setEdit(!edit)}
        />
      </Flex>
      {edit && <InvoiceUpdate invoice={invoice} />}
    </Box>
  );
};

export default InvoiceCard;