import {
  Box,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { MdDelete } from "react-icons/md";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import React from "react";
import { TenderDetail, timeAgo } from "./types";

const DELETE_NOTE = gql`
  mutation TenderDeleteNote($id: ID!, $noteId: ID!) {
    tenderDeleteNote(id: $id, noteId: $noteId) {
      _id
      notes {
        _id
        content
        savedBy {
          name
        }
        savedAt
        conversationId
      }
      jobSummary {
        content
        generatedAt
        generatedBy
        generatedFrom
      }
    }
  }
`;

interface Props {
  tender: TenderDetail;
  onUpdated: () => void;
}

const TenderNotesTab: React.FC<Props> = ({ tender, onUpdated }) => {
  const [deleteNote] = Apollo.useMutation(DELETE_NOTE, {
    onCompleted: onUpdated,
  });
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  if (tender.notes.length === 0) {
    return (
      <Box p={4}>
        <Text fontSize="sm" color="gray.500">
          No notes saved yet. Claude will suggest saving important context during conversations.
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={2} p={4}>
      {tender.notes.map((note) => (
        <Box
          key={note._id}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          px={3}
          py={2}
        >
          <HStack justify="space-between" align="flex-start">
            <Text fontSize="sm" flex={1} mr={2}>
              {note.content}
            </Text>
            <IconButton
              aria-label="Delete note"
              icon={<MdDelete />}
              size="xs"
              variant="ghost"
              colorScheme="red"
              isLoading={deletingId === note._id}
              onClick={() => {
                setDeletingId(note._id);
                deleteNote({ variables: { id: tender._id, noteId: note._id } }).finally(() =>
                  setDeletingId(null)
                );
              }}
            />
          </HStack>
          <Text fontSize="xs" color="gray.400" mt={1}>
            {note.savedBy?.name ?? "Claude"} · {timeAgo(note.savedAt)}
          </Text>
        </Box>
      ))}
    </VStack>
  );
};

export default TenderNotesTab;
