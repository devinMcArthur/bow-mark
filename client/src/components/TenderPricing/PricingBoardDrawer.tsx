import React from "react";
import {
  Box,
  CloseButton,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
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
  const status = row ? ((row.status as LineItemStatus) ?? "not_started") : "not_started";

  return (
    <Drawer isOpen={!!row} onClose={onClose} placement="bottom" size="md">
      <DrawerOverlay bg="blackAlpha.300" />
      <DrawerContent maxH="60vh" borderTopRadius="xl">
        {row && (
          <>
            <DrawerHeader px={4} py={3} borderBottom="1px solid" borderColor="gray.100">
              <Flex align="center" justify="space-between" gap={2}>
                <Flex align="center" gap={3} flex={1} minW={0}>
                  <StatusDot status={status} onChange={(s) => onUpdateRow(row._id, { status: s })} />
                  <Box flex={1} minW={0}>
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                      {row.itemNumber ? `${row.itemNumber} — ` : ""}{row.description || "Untitled"}
                    </Text>
                    <Text fontSize="xs" color="gray.500" fontWeight="normal">{STATUS_LABELS[status]}</Text>
                  </Box>
                </Flex>
                <CloseButton size="sm" onClick={onClose} />
              </Flex>
            </DrawerHeader>
            <DrawerBody p={0} overflowY="auto">
              <LineItemDetail
                row={row}
                defaultMarkupPct={sheet.defaultMarkupPct}
                sheetId={sheet._id}
                tenderId={tenderId}
                onUpdate={onUpdateRow}
                onClose={onClose}
                tenderFiles={tenderFiles}
              />
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default PricingBoardDrawer;
