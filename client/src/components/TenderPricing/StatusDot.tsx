import React from "react";
import {
  Box,
  Flex,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  LineItemStatus,
  LINE_ITEM_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
} from "./statusConstants";

interface StatusDotProps {
  status: LineItemStatus;
  onChange: (status: LineItemStatus) => void;
}

const StatusDot: React.FC<StatusDotProps> = ({ status, onChange }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start" isLazy>
      <PopoverTrigger>
        <Box
          as="button"
          w="10px"
          h="10px"
          borderRadius="full"
          bg={STATUS_COLORS[status]}
          flexShrink={0}
          cursor="pointer"
          _hover={{ transform: "scale(1.3)" }}
          transition="transform 0.1s"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onOpen();
          }}
          title={STATUS_LABELS[status]}
        />
      </PopoverTrigger>
      <PopoverContent w="180px" shadow="lg" border="1px solid" borderColor="gray.200">
        <PopoverBody p={1}>
          {LINE_ITEM_STATUSES.map((s) => (
            <Flex
              key={s}
              align="center"
              gap={2}
              px={2}
              py={1.5}
              cursor="pointer"
              borderRadius="sm"
              bg={s === status ? "gray.100" : "transparent"}
              _hover={{ bg: "gray.50" }}
              onClick={(e) => {
                e.stopPropagation();
                onChange(s);
                onClose();
              }}
            >
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={STATUS_COLORS[s]}
                flexShrink={0}
              />
              <Text fontSize="xs" fontWeight={s === status ? "semibold" : "normal"}>
                {STATUS_LABELS[s]}
              </Text>
            </Flex>
          ))}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default StatusDot;
