import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { TenderPricingRow, TenderPricingRowType } from "./types";

interface ScheduleListProps {
  rows: TenderPricingRow[];
  selectedRowId: string | null;
  onSelect: (rowId: string) => void;
}

const ScheduleList: React.FC<ScheduleListProps> = ({ rows, selectedRowId, onSelect }) => {
  return (
    <Box
      h="100%"
      overflowY="auto"
      borderRight="1px solid"
      borderColor="gray.200"
      py={2}
    >
      {rows.map((row) => {
        const isSchedule = row.type === TenderPricingRowType.Schedule;
        const isGroup = row.type === TenderPricingRowType.Group;
        const isItem = row.type === TenderPricingRowType.Item;
        const isSelected = row._id === selectedRowId;

        if (isSchedule) {
          return (
            <Box key={row._id} px={3} py={1} bg="gray.700" mt={2}>
              <Text fontSize="xs" color="gray.300" fontWeight="semibold" isTruncated>
                {row.itemNumber ? `${row.itemNumber} ` : ""}{row.description || "Schedule"}
              </Text>
            </Box>
          );
        }

        if (isGroup) {
          return (
            <Box key={row._id} px={3} py={1} bg="gray.100">
              <Text fontSize="xs" color="gray.700" fontWeight="semibold" isTruncated>
                {row.itemNumber ? `${row.itemNumber} ` : ""}{row.description || "Group"}
              </Text>
            </Box>
          );
        }

        // Item row
        return (
          <Box
            key={row._id}
            px={3}
            py="5px"
            cursor="pointer"
            bg={isSelected ? "blue.50" : undefined}
            borderLeft="3px solid"
            borderLeftColor={isSelected ? "blue.500" : "transparent"}
            _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
            onClick={() => onSelect(row._id)}
          >
            <Text fontSize="xs" color={isSelected ? "blue.700" : "gray.700"} isTruncated>
              {row.itemNumber ? (
                <Text as="span" fontWeight="semibold" mr={1}>
                  {row.itemNumber}
                </Text>
              ) : null}
              {row.description || <Text as="span" color="gray.400">Untitled</Text>}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

export default ScheduleList;
