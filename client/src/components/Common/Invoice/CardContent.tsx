import { Box, HStack, Text } from "@chakra-ui/react";
import { InvoiceCardSnippetFragment } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";

interface IInvoiceCardContent {
  invoice: InvoiceCardSnippetFragment;
}

const InvoiceCardContent = ({ invoice }: IInvoiceCardContent) => {
  return (
    <Box>
      <Text>
        <Text as="span">
          <Text fontWeight="bold" as="span">
            {invoice.company.name} #{invoice.invoiceNumber}
          </Text>
          <Text as="span"> - ${formatNumber(invoice.cost)}</Text>
        </Text>
        <Text whiteSpace="pre-wrap">{invoice.description}</Text>
      </Text>
      <HStack spacing={2}>
        {invoice.internal && (
          <Text fontSize="small" fontStyle="italic">
            internal
          </Text>
        )}
        {invoice.accrual && (
          <Text fontSize="small" fontStyle="italic">
            accrual
          </Text>
        )}
      </HStack>
    </Box>
  );
};

export default InvoiceCardContent;
