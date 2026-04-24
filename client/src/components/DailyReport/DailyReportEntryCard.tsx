import React from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  SimpleGrid,
  Text,
  Textarea,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  FiAlertTriangle,
  FiEdit2,
  FiMoreVertical,
  FiTrash2,
} from "react-icons/fi";
import {
  DailyReportEntriesQuery,
  UserRoles,
  useDeleteDailyReportEntryMutation,
  useUpdateDailyReportEntryMutation,
} from "../../generated/graphql";
import { localStorageTokenKey } from "../../contexts/Auth";
import hasPermission from "../../utils/hasPermission";
import DocumentViewerModal, {
  DocumentViewerFile,
} from "../Common/DocumentViewerModal";

dayjs.extend(relativeTime);

type Entry = DailyReportEntriesQuery["dailyReportEntries"][number];

interface DailyReportEntryCardProps {
  entry: Entry;
  viewerUserId?: string;
  viewerRole?: UserRoles;
}

function buildThumbUrl(documentId: string): string {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(localStorageTokenKey)
      : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  params.set("stream", "1");
  return `/api/documents/${documentId}?${params.toString()}`;
}

const DailyReportEntryCard: React.FC<DailyReportEntryCardProps> = ({
  entry,
  viewerUserId,
  viewerRole,
}) => {
  const toast = useToast();
  const [viewerFile, setViewerFile] =
    React.useState<DocumentViewerFile | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(entry.text ?? "");
  const [editIsIssue, setEditIsIssue] = React.useState(entry.isIssue);
  const [deleteEntry] = useDeleteDailyReportEntryMutation({
    refetchQueries: ["DailyReportEntries"],
    awaitRefetchQueries: true,
  });
  const [updateEntry, { loading: saving }] = useUpdateDailyReportEntryMutation();

  const authorId = entry.createdByUser?._id;
  const isAuthor = !!authorId && !!viewerUserId && authorId === viewerUserId;
  // UserRoles is a string enum — hasPermission compares role weights
  // (Admin=3, PM=2, User=1, Developer=4). PM or higher can manage.
  const isPmPlus = hasPermission(viewerRole, UserRoles.ProjectManager);
  const canManage = isAuthor || isPmPlus;
  // Edit is narrower than delete: only the author can rewrite their
  // own words/flag. PMs can still prune via Delete in the same menu.
  const canEdit = isAuthor;

  const startEdit = () => {
    setEditText(entry.text ?? "");
    setEditIsIssue(entry.isIssue);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    // If the user cleared all text AND the entry has no photos, we'd
    // be saving a blank entry — refuse. Photos-only entries can keep
    // an empty text field.
    if (!trimmed && (entry.documentIds ?? []).length === 0) {
      toast({
        title: "Entry can't be empty",
        description: "Add text or keep the photos.",
        status: "warning",
        duration: 3000,
      });
      return;
    }
    try {
      await updateEntry({
        variables: {
          id: entry._id,
          data: {
            text: trimmed || undefined,
            isIssue: editIsIssue,
          },
        },
      });
      setIsEditing(false);
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 4000,
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEntry({ variables: { id: entry._id } });
    } catch (err) {
      toast({
        title: "Couldn't delete",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 4000,
      });
    }
  };

  const created = dayjs(entry.createdAt);
  const edited =
    entry.updatedAt &&
    dayjs(entry.updatedAt).diff(created, "second") > 1
      ? dayjs(entry.updatedAt)
      : null;

  const photoIds = (entry.documentIds ?? []).map((d) => d.toString());

  return (
    <Box
      borderWidth="1px"
      borderLeftWidth={entry.isIssue ? "4px" : "1px"}
      borderLeftColor={entry.isIssue ? "red.400" : "gray.200"}
      borderColor="gray.200"
      borderRadius="md"
      bg="white"
      p={3}
    >
      <Flex align="start">
        <Box flex={1} minW={0}>
          <HStack spacing={2} mb={1} fontSize="sm" color="gray.600">
            <Text fontWeight="semibold" color="gray.800">
              {entry.createdByUser?.name ?? "Unknown"}
            </Text>
            <Text title={created.format("MMM D, YYYY h:mm A")}>
              {created.fromNow()}
            </Text>
            {edited && (
              <Text
                as="span"
                fontStyle="italic"
                title={`Edited ${edited.format("MMM D, YYYY h:mm A")}`}
              >
                · edited
              </Text>
            )}
            {entry.isIssue && (
              <Badge colorScheme="red" display="inline-flex" alignItems="center" gap={1}>
                <Icon as={FiAlertTriangle} boxSize={3} />
                Issue
              </Badge>
            )}
          </HStack>

          {!isEditing && entry.text && (
            <Text whiteSpace="pre-wrap" fontSize="sm" color="gray.800" mb={photoIds.length > 0 ? 2 : 0}>
              {entry.text}
            </Text>
          )}

          {isEditing && (
            <Box mb={photoIds.length > 0 ? 2 : 0}>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="What's happening?"
                resize="none"
                minH="60px"
                autoFocus
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    saveEdit();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
              />
              <HStack mt={2} spacing={2}>
                <Tooltip
                  label={editIsIssue ? "Clear issue flag" : "Flag as issue"}
                >
                  <IconButton
                    aria-label="Toggle issue flag"
                    icon={<FiAlertTriangle />}
                    size="sm"
                    variant={editIsIssue ? "solid" : "ghost"}
                    colorScheme={editIsIssue ? "red" : "gray"}
                    onClick={() => setEditIsIssue((v) => !v)}
                  />
                </Tooltip>
                <Box flex={1} />
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={saveEdit}
                  isLoading={saving}
                >
                  Save
                </Button>
              </HStack>
            </Box>
          )}

          {photoIds.length > 0 && (
            <SimpleGrid columns={[3, 4, 5]} spacing={2} mt={1}>
              {photoIds.map((id) => (
                <Box
                  key={id}
                  position="relative"
                  pb="100%"
                  cursor="pointer"
                  borderRadius="md"
                  overflow="hidden"
                  borderWidth="1px"
                  borderColor="gray.200"
                  onClick={() =>
                    setViewerFile({ enrichedFileId: id })
                  }
                >
                  <Image
                    src={buildThumbUrl(id)}
                    position="absolute"
                    inset={0}
                    boxSize="100%"
                    objectFit="cover"
                    alt="attachment"
                  />
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>

        {canManage && !isEditing && (
          <Menu isLazy placement="bottom-end" strategy="fixed">
            <MenuButton
              as={IconButton}
              icon={<FiMoreVertical />}
              size="xs"
              variant="ghost"
              aria-label="Entry actions"
            />
            <Portal>
              <MenuList zIndex="popover" minW="10rem">
                {canEdit && (
                  <MenuItem icon={<FiEdit2 />} onClick={startEdit}>
                    Edit
                  </MenuItem>
                )}
                <MenuItem
                  icon={<FiTrash2 />}
                  color="red.500"
                  onClick={handleDelete}
                >
                  Delete
                </MenuItem>
              </MenuList>
            </Portal>
          </Menu>
        )}
      </Flex>

      <DocumentViewerModal
        file={viewerFile}
        onClose={() => setViewerFile(null)}
      />
    </Box>
  );
};

export default DailyReportEntryCard;
