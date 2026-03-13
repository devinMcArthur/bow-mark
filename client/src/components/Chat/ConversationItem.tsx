import React from "react";
import {
  Box,
  HStack,
  IconButton,
  Input,
  Text,
  Tooltip,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverFooter,
  Button,
  Portal,
} from "@chakra-ui/react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { ConversationContext, ConversationSummary } from "./types";

// ─── Sidebar conversation item ────────────────────────────────────────────────

const ConversationItem = ({
  convo,
  isActive,
  onSelect,
  onRename,
  onDelete,
  context,
}: {
  convo: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  context?: ConversationContext;
}) => {
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(convo.title);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { isOpen: deleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure();

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(convo.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== convo.title) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <Box
      px={3}
      py={2}
      borderRadius="md"
      bg={isActive ? "blue.50" : "transparent"}
      border="1px solid"
      borderColor={isActive ? "blue.200" : "transparent"}
      cursor="pointer"
      _hover={{ bg: isActive ? "blue.50" : "gray.100" }}
      onClick={onSelect}
      role="group"
      position="relative"
    >
      {editing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          size="xs"
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <>
          <Text fontSize="xs" fontWeight="500" color="gray.700" noOfLines={1}>
            {convo.title}
          </Text>
          {context && (
            <Text fontSize="xs" color="gray.500" noOfLines={1} mt={0.5}>
              {context.name}
            </Text>
          )}
          <Text fontSize="xs" color="gray.400" mt={context ? 0 : 0.5}>
            {relativeTime(convo.updatedAt)}
          </Text>
          <HStack
            spacing={1}
            position="absolute"
            right={2}
            top="50%"
            transform="translateY(-50%)"
            onClick={(e) => e.stopPropagation()}
            sx={{
              opacity: 0,
              pointerEvents: "none",
              "[role=group]:hover &": { opacity: 1, pointerEvents: "auto" },
            }}
          >
            <Tooltip label="Rename" placement="top" hasArrow>
              <IconButton
                aria-label="Rename"
                icon={<FiEdit2 />}
                size="xs"
                variant="ghost"
                onClick={startEdit}
              />
            </Tooltip>
            <Popover isOpen={deleteOpen} onClose={closeDelete} placement="bottom-end">
              <PopoverTrigger>
                <IconButton
                  aria-label="Delete"
                  icon={<FiTrash2 />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={openDelete}
                />
              </PopoverTrigger>
              <Portal>
                <PopoverContent w="200px" zIndex={9999}>
                  <PopoverBody>
                    <Text fontSize="xs">Delete this conversation?</Text>
                  </PopoverBody>
                  <PopoverFooter>
                    <HStack spacing={2}>
                      <Button size="xs" variant="ghost" onClick={closeDelete}>Cancel</Button>
                      <Button
                        size="xs"
                        colorScheme="red"
                        onClick={() => { closeDelete(); onDelete(); }}
                      >
                        Delete
                      </Button>
                    </HStack>
                  </PopoverFooter>
                </PopoverContent>
              </Portal>
            </Popover>
          </HStack>
        </>
      )}
    </Box>
  );
};

export default ConversationItem;
