import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useToast,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import React from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiExternalLink,
  FiMoreVertical,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import dataUrlToBlob from "../../utils/dataUrlToBlob";
import { collectDroppedFiles } from "../../utils/collectDroppedFiles";
import { localStorageTokenKey } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const FILE_CREATE = gql`
  mutation JobsiteEnrichedFileCreate($data: FileCreateData!) {
    fileCreate(data: $data) {
      _id
    }
  }
`;

const ENRICHED_FILE_ENTRY_FRAGMENT = `
  _id
  minRole
  enrichedFile {
    _id
    documentType
    summaryStatus
    summaryError
    pageCount
    summary {
      overview
      documentType
      keyTopics
    }
    file {
      _id
      mimetype
      description
    }
  }
`;

const JOBSITE_ADD_ENRICHED_FILE = gql`
  mutation JobsiteAddEnrichedFile($id: ID!, $fileId: ID!, $minRole: UserRoles!) {
    jobsiteAddEnrichedFile(id: $id, fileId: $fileId, minRole: $minRole) {
      _id
      enrichedFiles {
        ${ENRICHED_FILE_ENTRY_FRAGMENT}
      }
    }
  }
`;

const JOBSITE_REMOVE_ENRICHED_FILE = gql`
  mutation JobsiteRemoveEnrichedFile($id: ID!, $fileObjectId: ID!) {
    jobsiteRemoveEnrichedFile(id: $id, fileObjectId: $fileObjectId) {
      _id
      enrichedFiles {
        ${ENRICHED_FILE_ENTRY_FRAGMENT}
      }
    }
  }
`;

const JOBSITE_RETRY_ENRICHED_FILE = gql`
  mutation JobsiteRetryEnrichedFile($id: ID!, $fileObjectId: ID!) {
    jobsiteRetryEnrichedFile(id: $id, fileObjectId: $fileObjectId) {
      _id
      enrichedFiles {
        ${ENRICHED_FILE_ENTRY_FRAGMENT}
      }
    }
  }
`;

const JOBSITE_UPDATE_ENRICHED_FILE_ROLE = gql`
  mutation JobsiteUpdateEnrichedFileRole($id: ID!, $fileObjectId: ID!, $minRole: UserRoles!) {
    jobsiteUpdateEnrichedFileRole(id: $id, fileObjectId: $fileObjectId, minRole: $minRole) {
      _id
      enrichedFiles {
        ${ENRICHED_FILE_ENTRY_FRAGMENT}
      }
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnrichedFileDetails {
  _id: string;
  documentType?: string | null;
  summaryStatus: string;
  summaryError?: string | null;
  pageCount?: number | null;
  summary?: {
    overview: string;
    documentType: string;
    keyTopics: string[];
  } | null;
  file: {
    _id: string;
    mimetype: string;
    description?: string | null;
  };
}

export interface EnrichedFileItem {
  _id: string;
  minRole: UserRoles;
  enrichedFile: EnrichedFileDetails;
}

const ROLE_LABELS: Record<UserRoles, string> = {
  [UserRoles.User]: "All users",
  [UserRoles.ProjectManager]: "PM & Admin",
  [UserRoles.Admin]: "Admin only",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function summaryStatusColor(status: string): string {
  if (status === "ready") return "green";
  if (status === "failed") return "red";
  if (status === "processing") return "yellow";
  return "gray";
}

// ─── File row ─────────────────────────────────────────────────────────────────

interface FileRowProps {
  entry: EnrichedFileItem;
  jobsiteId: string;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  removingId: string | null;
  retryingId: string | null;
  readOnly?: boolean;
}

const FileRow = ({ entry, jobsiteId, onRemove, onRetry, removingId, retryingId, readOnly }: FileRowProps) => {
  const { enrichedFile: file, minRole, _id: entryId } = entry;
  const [expanded, setExpanded] = React.useState(false);
  const hasSummary = !!file.summary;

  const [updateRole] = Apollo.useMutation(
    gql`
      mutation JobsiteUpdateEnrichedFileRoleInline($id: ID!, $fileObjectId: ID!, $minRole: UserRoles!) {
        jobsiteUpdateEnrichedFileRole(id: $id, fileObjectId: $fileObjectId, minRole: $minRole) {
          _id
          enrichedFiles {
            _id
            minRole
            enrichedFile {
              _id
              documentType
              summaryStatus
              summaryError
              pageCount
              summary { overview documentType keyTopics }
              file { _id mimetype description }
            }
          }
        }
      }
    `
  );

  const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace("/graphql", "");
  const openFile = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
    if (!token) return;
    window.open(`${serverBase}/api/enriched-files/${file._id}?token=${token}`, "_blank");
  };

  if (readOnly) {
    return (
      <Tr cursor="pointer" _hover={{ bg: "gray.50" }} onClick={openFile}>
        <Td overflow="hidden">
          <Text fontSize="sm" fontWeight="medium" isTruncated>
            {file.file.description || "Untitled"}
          </Text>
          {(file.summary?.documentType || file.documentType) && (
            <Text fontSize="xs" color="gray.500" isTruncated>
              {file.summary?.documentType || file.documentType}
            </Text>
          )}
        </Td>
        <Td>
          <HStack justify="flex-end">
            <FiExternalLink color="gray" />
          </HStack>
        </Td>
      </Tr>
    );
  }

  return (
    <>
      <Tr>
        <Td overflow="hidden">
          <HStack spacing={1}>
            {hasSummary && (
              <IconButton
                aria-label="Toggle summary"
                icon={expanded ? <FiChevronDown /> : <FiChevronRight />}
                size="xs"
                variant="ghost"
                onClick={() => setExpanded((v) => !v)}
              />
            )}
            <Box minW={0}>
              {file.file.description && (
                <Tooltip label={file.file.description} placement="top" fontSize="xs" openDelay={500}>
                  <Text fontSize="sm" fontWeight="medium" isTruncated>
                    {file.file.description}
                  </Text>
                </Tooltip>
              )}
              <Text fontSize="xs" color="gray.500" isTruncated>
                {file.summary?.documentType || file.documentType || (
                  <Text as="span" fontStyle="italic">Detecting…</Text>
                )}
              </Text>
            </Box>
          </HStack>
        </Td>
        <Td>
          <Tooltip
            label={file.summaryError ?? undefined}
            isDisabled={!file.summaryError}
            placement="top"
            maxW="320px"
            fontSize="xs"
          >
            <Badge
              colorScheme={summaryStatusColor(file.summaryStatus)}
              cursor={file.summaryError ? "help" : undefined}
            >
              {file.summaryStatus}
            </Badge>
          </Tooltip>
        </Td>
        <Td isNumeric>{file.pageCount ?? "—"}</Td>
        <Td textAlign="right">
          <Menu isLazy>
            <MenuButton
              as={IconButton}
              aria-label="Actions"
              icon={<FiMoreVertical />}
              size="xs"
              variant="ghost"
            />
            <MenuList fontSize="sm" minW="160px">
              <MenuItem icon={<FiExternalLink />} onClick={openFile}>
                Open file
              </MenuItem>
              {(file.summaryStatus === "failed" || file.summaryStatus === "ready") && (
                <MenuItem
                  icon={retryingId === file._id ? <Spinner size="xs" /> : <FiRefreshCw />}
                  isDisabled={retryingId === file._id}
                  onClick={() => onRetry(file._id)}
                >
                  Retry summary
                </MenuItem>
              )}
              <MenuDivider />
              <MenuOptionGroup
                title="Access"
                type="radio"
                value={minRole}
                onChange={(val) =>
                  updateRole({
                    variables: {
                      id: jobsiteId,
                      fileObjectId: file._id,
                      minRole: val as UserRoles,
                    },
                  })
                }
              >
                {(Object.values(UserRoles).filter((v) => typeof v === "string") as UserRoles[]).map((role) => (
                  <MenuItemOption key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </MenuItemOption>
                ))}
              </MenuOptionGroup>
              <MenuDivider />
              <MenuItem
                icon={removingId === file._id ? <Spinner size="xs" /> : <FiTrash2 />}
                isDisabled={removingId === file._id}
                color="red.500"
                onClick={() => onRemove(file._id)}
              >
                Remove
              </MenuItem>
            </MenuList>
          </Menu>
        </Td>
      </Tr>
      {hasSummary && (
        <Tr>
          <Td colSpan={4} p={0}>
            <Collapse in={expanded} animateOpacity>
              <Box
                bg="gray.50"
                px={6}
                py={3}
                borderBottom="1px solid"
                borderColor="gray.100"
              >
                <Text fontSize="sm" mb={2} color="gray.700">
                  {file.summary!.overview}
                </Text>
                {file.summary!.keyTopics.length > 0 && (
                  <Wrap spacing={1}>
                    {file.summary!.keyTopics.map((topic) => (
                      <WrapItem key={topic}>
                        <Badge colorScheme="blue" fontSize="xs">
                          {topic}
                        </Badge>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
              </Box>
            </Collapse>
          </Td>
        </Tr>
      )}
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface JobsiteEnrichedFilesProps {
  jobsiteId: string;
  enrichedFiles: EnrichedFileItem[];
  onUpdated?: () => void;
  hideUpload?: boolean;
  readOnly?: boolean;
}

const JobsiteEnrichedFiles = ({
  jobsiteId,
  enrichedFiles,
  onUpdated,
  hideUpload = false,
  readOnly = false,
}: JobsiteEnrichedFilesProps) => {
  const toast = useToast();

  const [uploadProgress, setUploadProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const [fileCreate] = Apollo.useMutation<
    { fileCreate: { _id: string } },
    { data: { file: File; description: string } }
  >(FILE_CREATE);

  const [addEnrichedFile] = Apollo.useMutation(JOBSITE_ADD_ENRICHED_FILE);
  const [removeEnrichedFile] = Apollo.useMutation(JOBSITE_REMOVE_ENRICHED_FILE);
  const [retryEnrichedFile] = Apollo.useMutation(JOBSITE_RETRY_ENRICHED_FILE);

  const pendingCount = enrichedFiles.filter(
    (entry) =>
      entry.enrichedFile.summaryStatus === "pending" ||
      entry.enrichedFile.summaryStatus === "processing"
  ).length;

  const handleUpload = React.useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const existingNames = new Set(enrichedFiles.map((e) => e.enrichedFile.file.description).filter(Boolean));
      const duplicates = files.filter((f) => existingNames.has(f.name));
      files = files.filter((f) => !existingNames.has(f.name));

      if (duplicates.length > 0) {
        toast({
          title: `${duplicates.length} duplicate${duplicates.length > 1 ? "s" : ""} skipped`,
          description: duplicates.map((f) => f.name).join(", "),
          status: "warning",
          isClosable: true,
          duration: null,
        });
      }
      if (files.length === 0) return;

      setUploadProgress({ done: 0, total: files.length });
      const failedNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target!.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const blob = dataUrlToBlob(dataUrl);
          const uploadFile = new File([blob], file.name, { type: file.type });

          const fileRes = await fileCreate({
            variables: { data: { file: uploadFile, description: file.name } },
          });

          const fileId = fileRes.data?.fileCreate._id;
          if (!fileId) throw new Error("no ID returned");

          await addEnrichedFile({
            variables: { id: jobsiteId, fileId, minRole: UserRoles.ProjectManager },
          });
        } catch {
          failedNames.push(file.name);
        }
        setUploadProgress({ done: i + 1, total: files.length });
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
      setUploadProgress(null);
      if (onUpdated) onUpdated();

      if (failedNames.length > 0) {
        toast({
          title: `${failedNames.length} file${failedNames.length > 1 ? "s" : ""} failed to upload`,
          description: failedNames.join(", "),
          status: "error",
          isClosable: true,
          duration: null,
        });
      }
    },
    [jobsiteId, fileCreate, addEnrichedFile, toast, onUpdated]
  );

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) handleUpload(files);
    },
    [handleUpload]
  );

  const handleDrop = React.useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = await collectDroppedFiles(e.dataTransfer);
      if (files.length) handleUpload(files);
    },
    [handleUpload]
  );

  const handleRemove = React.useCallback(
    async (fileObjectId: string) => {
      setRemovingId(fileObjectId);
      try {
        await removeEnrichedFile({ variables: { id: jobsiteId, fileObjectId } });
        if (onUpdated) onUpdated();
      } catch (e: any) {
        toast({
          title: "Error removing file",
          description: e.message,
          status: "error",
          isClosable: true,
        });
      } finally {
        setRemovingId(null);
      }
    },
    [jobsiteId, removeEnrichedFile, toast, onUpdated]
  );

  const handleRetry = React.useCallback(
    async (fileObjectId: string) => {
      setRetryingId(fileObjectId);
      try {
        await retryEnrichedFile({ variables: { id: jobsiteId, fileObjectId } });
        if (onUpdated) onUpdated();
      } catch (e: any) {
        toast({
          title: "Error retrying summary",
          description: e.message,
          status: "error",
          isClosable: true,
        });
      } finally {
        setRetryingId(null);
      }
    },
    [jobsiteId, retryEnrichedFile, toast, onUpdated]
  );

  return (
    <Box>
      {pendingCount > 0 && !readOnly && (
        <Alert status="warning" mb={3} borderRadius="md" size="sm">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {pendingCount} {pendingCount === 1 ? "document is" : "documents are"} still being
            processed — answers may be incomplete.
          </AlertDescription>
        </Alert>
      )}

      {enrichedFiles.length > 0 ? (
        <Table
          variant="simple"
          size="sm"
          mb={readOnly ? 0 : 4}
          style={{ tableLayout: "fixed" }}
          w="100%"
        >
          {!readOnly && (
            <>
              <colgroup>
                <col style={{ width: "45%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <Thead>
                <Tr>
                  <Th whiteSpace="nowrap">File</Th>
                  <Th whiteSpace="nowrap">Status</Th>
                  <Th isNumeric whiteSpace="nowrap">Pages</Th>
                  <Th></Th>
                </Tr>
              </Thead>
            </>
          )}
          <Tbody>
            {enrichedFiles.map((entry) => (
              <FileRow
                key={entry._id}
                entry={entry}
                jobsiteId={jobsiteId}
                onRemove={handleRemove}
                onRetry={handleRetry}
                removingId={removingId}
                retryingId={retryingId}
                readOnly={readOnly}
              />
            ))}
          </Tbody>
        </Table>
      ) : (
        <Text fontSize="sm" color="gray.500" mb={3}>
          {hideUpload || readOnly
            ? "No documents have been uploaded for this jobsite."
            : "No documents yet. Upload jobsite-specific documents here."}
        </Text>
      )}

      {!hideUpload && !readOnly && (
        <Box
          border="2px dashed"
          borderColor={isDragOver ? "blue.400" : "gray.200"}
          borderRadius="md"
          p={3}
          bg={isDragOver ? "blue.50" : "gray.50"}
          transition="border-color 0.15s, background 0.15s"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <Text fontSize="sm" color="gray.500" mb={2} textAlign="center">
            Drop files or a folder here, or click to upload.
          </Text>
          <HStack justify="center">
            <Button
              size="sm"
              colorScheme="blue"
              isLoading={uploadProgress !== null}
              loadingText={
                uploadProgress && uploadProgress.total > 1
                  ? `${uploadProgress.done} / ${uploadProgress.total}`
                  : undefined
              }
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Files
            </Button>
            <Button
              size="sm"
              variant="outline"
              isDisabled={uploadProgress !== null}
              onClick={() => folderInputRef.current?.click()}
            >
              Choose Folder
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={handleFileChange}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </HStack>
        </Box>
      )}
    </Box>
  );
};

export default JobsiteEnrichedFiles;
