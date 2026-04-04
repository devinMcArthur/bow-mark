// client/src/components/Tender/TenderMobilePricingTab.tsx
import React, { useCallback, useState } from "react";
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  IconButton,
  Text,
} from "@chakra-ui/react";
import { gql, useMutation } from "@apollo/client";
import { FiX } from "react-icons/fi";
import LineItemDetail from "../TenderPricing/LineItemDetail";
import { TenderPricingSheet, TenderPricingRow, TenderPricingRowType } from "../TenderPricing/types";
import { computeRow, computeSheetTotal, formatCurrency } from "../TenderPricing/compute";

// ─── GQL ──────────────────────────────────────────────────────────────────────

const ROW_FIELDS = `
  _id
  type
  sortOrder
  itemNumber
  description
  indentLevel
  quantity
  unit
  unitPrice
  notes
  calculatorType
  calculatorInputsJson
  markupOverride
  rateBuildupSnapshot
  extraUnitPrice
  extraUnitPriceMemo
  docRefs {
    _id
    enrichedFileId
    page
    description
  }
`;

const SHEET_FIELDS = `
  _id
  defaultMarkupPct
  rows {
    ${ROW_FIELDS}
  }
`;

const UPDATE_ROW = gql`
  mutation MobileTenderPricingRowUpdate($sheetId: ID!, $rowId: ID!, $data: TenderPricingRowUpdateData!) {
    tenderPricingRowUpdate(sheetId: $sheetId, rowId: $rowId, data: $data) {
      ${SHEET_FIELDS}
    }
  }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderMobilePricingTabProps {
  sheet: TenderPricingSheet;
  tenderId: string;
  onSheetUpdate: (sheet: TenderPricingSheet) => void;
}

// ─── Row list item ────────────────────────────────────────────────────────────

interface RowItemProps {
  row: TenderPricingRow;
  defaultMarkupPct: number;
  onSelect: (row: TenderPricingRow) => void;
}

const RowItem: React.FC<RowItemProps> = ({ row, defaultMarkupPct, onSelect }) => {
  if (row.type === TenderPricingRowType.Schedule) {
    return (
      <Flex
        align="center"
        px={4}
        py={2}
        bg="gray.100"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Text fontSize="xs" fontWeight="700" color="gray.600" textTransform="uppercase" letterSpacing="wide">
          {row.description || "Schedule"}
        </Text>
      </Flex>
    );
  }

  if (row.type === TenderPricingRowType.Group) {
    return (
      <Flex
        align="center"
        px={4}
        pl={`${4 + (row.indentLevel ?? 1) * 12}px`}
        py={2}
        bg="gray.50"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Text fontSize="sm" fontWeight="600" color="gray.700" flex={1} isTruncated>
          {row.description || "Group"}
        </Text>
      </Flex>
    );
  }

  // Item row
  const { lineItemTotal } = computeRow(row, defaultMarkupPct);
  return (
    <Flex
      align="center"
      px={4}
      pl={`${4 + (row.indentLevel ?? 2) * 12}px`}
      py={3}
      borderBottom="1px solid"
      borderColor="gray.100"
      cursor="pointer"
      _active={{ bg: "gray.50" }}
      onClick={() => onSelect(row)}
      gap={2}
    >
      {row.itemNumber ? (
        <Text fontSize="xs" fontFamily="mono" color="gray.400" flexShrink={0} w="32px">
          {row.itemNumber}
        </Text>
      ) : null}
      <Text fontSize="sm" color="gray.800" flex={1} isTruncated>
        {row.description || <Text as="span" color="gray.400">No description</Text>}
      </Text>
      <Box flexShrink={0} textAlign="right">
        {row.quantity != null && row.unit ? (
          <Text fontSize="xs" color="gray.400">{row.quantity} {row.unit}</Text>
        ) : null}
        <Text fontSize="sm" fontWeight="600" color="gray.700">
          {formatCurrency(lineItemTotal)}
        </Text>
      </Box>
    </Flex>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const TenderMobilePricingTab: React.FC<TenderMobilePricingTabProps> = ({
  sheet,
  tenderId,
  onSheetUpdate,
}) => {
  const [selectedRow, setSelectedRow] = useState<TenderPricingRow | null>(null);
  const [updateRow] = useMutation(UPDATE_ROW);

  const sheetTotal = computeSheetTotal(sheet.rows, sheet.defaultMarkupPct);

  const handleUpdateRow = useCallback(
    async (rowId: string, data: Record<string, unknown>) => {
      const res = await updateRow({
        variables: { sheetId: sheet._id, rowId, data },
      });
      const updated: TenderPricingSheet = res.data.tenderPricingRowUpdate;
      onSheetUpdate(updated);
      // Keep selectedRow in sync with the updated sheet
      const updatedRow = updated.rows.find((r) => r._id === rowId);
      if (updatedRow) setSelectedRow(updatedRow);
    },
    [sheet._id, updateRow, onSheetUpdate]
  );

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Summary strip */}
      <Flex
        px={4}
        py={2}
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <Text fontSize="xs" color="gray.500">
          Markup: {sheet.defaultMarkupPct}%
        </Text>
        <Text fontSize="md" fontWeight="700" color="gray.800">
          {formatCurrency(sheetTotal)}
        </Text>
      </Flex>

      {/* Row list */}
      <Box flex={1} overflowY="auto">
        {sheet.rows.map((row) => (
          <RowItem
            key={row._id}
            row={row}
            defaultMarkupPct={sheet.defaultMarkupPct}
            onSelect={setSelectedRow}
          />
        ))}
      </Box>

      {/* Line item drawer */}
      <Drawer
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        placement="bottom"
      >
        <DrawerOverlay />
        <DrawerContent maxH="85vh" borderTopRadius="xl">
          <DrawerHeader
            px={4}
            py={3}
            borderBottom="1px solid"
            borderColor="gray.200"
            display="flex"
            alignItems="center"
            gap={2}
          >
            {selectedRow?.itemNumber && (
              <Text fontFamily="mono" fontSize="sm" color="gray.500" flexShrink={0}>
                {selectedRow.itemNumber}
              </Text>
            )}
            <Text fontSize="sm" fontWeight="600" flex={1} isTruncated>
              {selectedRow?.description || "Line Item"}
            </Text>
            <IconButton
              aria-label="Close"
              icon={<FiX />}
              size="sm"
              variant="ghost"
              onClick={() => setSelectedRow(null)}
            />
          </DrawerHeader>
          <DrawerBody p={0} overflow="hidden">
            {selectedRow && (
              <LineItemDetail
                row={selectedRow}
                defaultMarkupPct={sheet.defaultMarkupPct}
                sheetId={sheet._id}
                tenderId={tenderId}
                onUpdate={handleUpdateRow}
                onClose={() => setSelectedRow(null)}
              />
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default TenderMobilePricingTab;
