import React from "react";
import {
  Box,
  CloseButton,
  Flex,
  Text,
} from "@chakra-ui/react";
import { TenderPricingRow, TenderPricingSheet } from "./types";
import { TenderFileItem } from "../Tender/types";
import LineItemDetail from "./LineItemDetail";
import StatusDot from "./StatusDot";
import { LineItemStatus, STATUS_LABELS } from "./statusConstants";

interface PricingBoardDrawerProps {
  row: TenderPricingRow | null;
  sheet: TenderPricingSheet;
  tenderId: string;
  onClose: () => void;
  onUpdateRow: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  tenderFiles?: TenderFileItem[];
}

const PricingBoardDrawer: React.FC<PricingBoardDrawerProps> = ({
  row,
  sheet,
  tenderId,
  onClose,
  onUpdateRow,
  tenderFiles,
}) => {
  const isOpen = !!row;
  const status = row ? ((row.status as LineItemStatus) ?? "not_started") : "not_started";

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      h="55%"
      bg="white"
      borderTop="1px solid"
      borderColor="gray.200"
      boxShadow="0 -4px 16px rgba(0,0,0,0.08)"
      transform={isOpen ? "translateY(0)" : "translateY(100%)"}
      transition="transform 0.25s ease"
      display="flex"
      flexDir="column"
      overflow="hidden"
      zIndex={10}
    >
      {row && (
        <>
          {/* Header with status */}
          <Flex
            px={4}
            py={2}
            align="center"
            justify="space-between"
            borderBottom="1px solid"
            borderColor="gray.100"
            flexShrink={0}
            gap={2}
            bg="gray.50"
          >
            <Flex align="center" gap={3} flex={1} minW={0}>
              <StatusDot status={status} onChange={(s) => onUpdateRow(row._id, { status: s })} />
              <Box flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                  {row.itemNumber ? `${row.itemNumber} — ` : ""}{row.description || "Untitled"}
                </Text>
                <Text fontSize="xs" color="gray.500">{STATUS_LABELS[status]}</Text>
              </Box>
            </Flex>
            <CloseButton size="sm" onClick={onClose} />
          </Flex>

          {/* Full LineItemDetail */}
          <Box flex={1} overflowY="auto">
            <LineItemDetail
              row={row}
              defaultMarkupPct={sheet.defaultMarkupPct}
              sheetId={sheet._id}
              tenderId={tenderId}
              onUpdate={onUpdateRow}
              onClose={onClose}
              tenderFiles={tenderFiles}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default PricingBoardDrawer;
