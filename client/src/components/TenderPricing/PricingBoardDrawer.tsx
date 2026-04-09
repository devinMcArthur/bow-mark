import React from "react";
import {
  Box,
  CloseButton,
  Divider,
  Flex,
  Text,
} from "@chakra-ui/react";
import { TenderPricingRow, TenderPricingSheet } from "./types";
import { TenderFileItem } from "../Tender/types";
import { computeRow, formatCurrency } from "./compute";
import { EditableCell } from "./PricingRow";
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
  onClose,
  onUpdateRow,
}) => {
  if (!row) return null;

  const status = (row.status as LineItemStatus) ?? "not_started";
  const { effectiveMarkup, suggestedBidUP, lineItemTotal } = computeRow(row, sheet.defaultMarkupPct);
  const costUP = (row.unitPrice ?? 0) + (row.extraUnitPrice ?? 0);

  return (
    <Box
      position="fixed"
      right={0}
      top={0}
      bottom={0}
      w="400px"
      maxW="100vw"
      bg="white"
      boxShadow="-4px 0 16px rgba(0,0,0,0.1)"
      zIndex={20}
      display="flex"
      flexDir="column"
      overflowY="auto"
    >
      {/* Header */}
      <Flex px={4} py={3} align="center" justify="space-between" borderBottom="1px solid" borderColor="gray.200" flexShrink={0}>
        <Flex align="center" gap={3}>
          <StatusDot status={status} onChange={(s) => onUpdateRow(row._id, { status: s })} />
          <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
            {row.itemNumber ? `${row.itemNumber} — ` : ""}{row.description || "Untitled"}
          </Text>
        </Flex>
        <CloseButton size="sm" onClick={onClose} />
      </Flex>

      {/* Status label */}
      <Box px={4} py={2} bg="gray.50" borderBottom="1px solid" borderColor="gray.100">
        <Text fontSize="xs" color="gray.500">{STATUS_LABELS[status]}</Text>
      </Box>

      {/* Fields */}
      <Box px={4} py={4} flex={1}>
        <Box mb={4}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Description
          </Text>
          <EditableCell
            value={row.description}
            onSave={(v) => onUpdateRow(row._id, { description: v })}
            placeholder="Enter description"
            wrap
          />
        </Box>

        <Flex gap={4} mb={4}>
          <Box flex={1}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Quantity
            </Text>
            <EditableCell
              value={row.quantity}
              onSave={(v) => onUpdateRow(row._id, { quantity: parseFloat(v) || null })}
              placeholder="—"
            />
          </Box>
          <Box flex={1}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Unit
            </Text>
            <EditableCell
              value={row.unit}
              onSave={(v) => onUpdateRow(row._id, { unit: v || null })}
              placeholder="—"
            />
          </Box>
        </Flex>

        <Divider mb={4} />

        <Flex gap={4} mb={4}>
          <Box flex={1}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Cost Unit Price
            </Text>
            <Text fontSize="sm" color={costUP > 0 ? "gray.800" : "gray.400"}>
              {costUP > 0 ? `$${costUP.toFixed(2)}` : "—"}
            </Text>
          </Box>
          <Box flex={1}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Bid Unit Price
            </Text>
            <Text fontSize="sm" fontWeight="medium" color={suggestedBidUP > 0 ? "blue.700" : "gray.400"}>
              {suggestedBidUP > 0 ? `$${suggestedBidUP.toFixed(2)}` : "—"}
            </Text>
          </Box>
        </Flex>

        <Box mb={4}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Line Item Total
          </Text>
          <Text fontSize="md" fontWeight="semibold" color={lineItemTotal > 0 ? "gray.800" : "gray.400"}>
            {lineItemTotal > 0 ? formatCurrency(lineItemTotal) : "—"}
          </Text>
        </Box>

        <Divider mb={4} />

        <Box mb={4}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Notes
          </Text>
          <EditableCell
            value={row.notes}
            onSave={(v) => onUpdateRow(row._id, { notes: v || null })}
            placeholder="Add notes..."
            wrap
          />
        </Box>
      </Box>
    </Box>
  );
};

export default PricingBoardDrawer;
