import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Text,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { FiPaperclip } from "react-icons/fi";
import { InvoiceCardSnippetFragment } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import DocumentViewerModal, {
  DocumentViewerFile,
} from "../DocumentViewerModal";

interface IInvoiceCardContent {
  invoice: InvoiceCardSnippetFragment;
  /**
   * Optional slot rendered in the top-right, next to the cost — used
   * by caller-owned actions (edit, trash) so they sit on the same
   * horizontal axis as the money. Keeps the right column visually
   * consistent: actions + money on top, date + file on the bottom.
   */
  rightActions?: React.ReactNode;
}

/**
 * Invoice card body. Two-column layout:
 *
 *   left  — company · invoice # · description · internal/accrual flags
 *   right — cost + caller actions (top), date + file link (bottom)
 *
 * The right column is pinned top/bottom via space-between so the
 * card's vertical space is filled even when the description is short.
 */
const InvoiceCardContent = ({ invoice, rightActions }: IInvoiceCardContent) => {
  const [viewerFile, setViewerFile] =
    React.useState<DocumentViewerFile | null>(null);

  return (
    <Flex w="100%" gap={3} align="stretch">
      {/* Left column — identity + description + flags */}
      <Box minW={0} flex={1}>
        <Text
          fontWeight="bold"
          fontSize="md"
          color="gray.800"
          isTruncated
          title={invoice.company.name}
        >
          {invoice.company.name}
        </Text>
        <Text fontSize="xs" color="gray.500" lineHeight={1.2}>
          #{invoice.invoiceNumber}
        </Text>
        {invoice.description && (
          <Text
            mt={1}
            fontSize="sm"
            color="gray.700"
            whiteSpace="pre-wrap"
          >
            {invoice.description}
          </Text>
        )}
        {(invoice.internal || invoice.accrual) && (
          <HStack mt={2} spacing={2} flexWrap="wrap">
            {invoice.internal && (
              <Badge colorScheme="purple" fontSize="0.65rem" variant="subtle">
                Internal
              </Badge>
            )}
            {invoice.accrual && (
              <Badge colorScheme="orange" fontSize="0.65rem" variant="subtle">
                Accrual
              </Badge>
            )}
          </HStack>
        )}
      </Box>

      {/* Right column — cost + actions (top), date + file (bottom) */}
      <Flex
        flexDir="column"
        align="flex-end"
        justify="space-between"
        flexShrink={0}
        gap={2}
      >
        <Flex align="center" gap={1}>
          <Text
            fontWeight="bold"
            fontSize="lg"
            color="gray.800"
            whiteSpace="nowrap"
          >
            ${formatNumber(invoice.cost)}
          </Text>
          {rightActions}
        </Flex>
        <HStack spacing={3} align="center">
          <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
            {dayjs(invoice.date).format("MMM D, YYYY")}
          </Text>
          {invoice.documentId && (
            <Button
              size="xs"
              variant="link"
              color="blue.600"
              leftIcon={<Icon as={FiPaperclip} />}
              whiteSpace="nowrap"
              onClick={(e) => {
                e.stopPropagation();
                setViewerFile({
                  enrichedFileId: invoice.documentId!,
                  fileName: `${invoice.company.name} #${invoice.invoiceNumber}`,
                });
              }}
            >
              View file
            </Button>
          )}
        </HStack>
      </Flex>

      <DocumentViewerModal
        file={viewerFile}
        onClose={() => setViewerFile(null)}
      />
    </Flex>
  );
};

export default InvoiceCardContent;
