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
import { LineItemStatus, LINE_ITEM_STATUSES, STATUS_LABELS, STATUS_COLORS } from "./statusConstants";

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
              <Flex align="center" justify="space-between" gap={2} mb={2}>
                <Text fontSize="sm" fontWeight="semibold" noOfLines={1} flex={1} minW={0}>
                  {row.itemNumber ? `${row.itemNumber} — ` : ""}{row.description || "Untitled"}
                </Text>
                <CloseButton size="sm" onClick={onClose} />
              </Flex>
              <Flex gap={2}>
                {LINE_ITEM_STATUSES.map((s) => (
                  <Flex
                    key={s}
                    align="center"
                    gap={1.5}
                    px={3}
                    py={1.5}
                    borderRadius="full"
                    cursor="pointer"
                    border="1px solid"
                    borderColor={s === status ? STATUS_COLORS[s] : "gray.200"}
                    bg={s === status ? `${STATUS_COLORS[s]}18` : "transparent"}
                    _hover={{ borderColor: STATUS_COLORS[s] }}
                    transition="all 0.15s"
                    onClick={() => onUpdateRow(row._id, { status: s })}
                  >
                    <Box w="7px" h="7px" borderRadius="full" bg={STATUS_COLORS[s]} flexShrink={0} />
                    <Text
                      fontSize="xs"
                      fontWeight={s === status ? "semibold" : "normal"}
                      color={s === status ? "gray.800" : "gray.500"}
                      whiteSpace="nowrap"
                    >
                      {STATUS_LABELS[s]}
                    </Text>
                  </Flex>
                ))}
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
