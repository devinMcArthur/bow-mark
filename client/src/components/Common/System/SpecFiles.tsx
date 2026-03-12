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
import React from "react";
import { FiChevronDown, FiChevronRight, FiExternalLink, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import {
  SystemSnippetFragment,
  useSystemQuery,
  useSystemAddSpecFileMutation,
  useSystemRemoveSpecFileMutation,
  useSystemRetrySpecFileMutation,
} from "../../../generated/graphql";
import dataUrlToBlob from "../../../utils/dataUrlToBlob";
import { localStorageTokenKey } from "../../../contexts/Auth";

const FILE_CREATE = gql`
  mutation SpecFileCreate($data: FileCreateData!) {
    fileCreate(data: $data) {
      _id
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type SpecFile = SystemSnippetFragment["specFiles"][number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function summaryStatusColor(status: string): string {
  if (status === "ready") return "green";
  if (status === "failed") return "red";
  if (status === "processing") return "yellow";
  return "gray";
}

// ─── File row ─────────────────────────────────────────────────────────────────

interface FileRowProps {
  file: SpecFile;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  removingId: string | null;
  retryingId: string | null;
}

const FileRow = ({ file, onRemove, onRetry, removingId, retryingId }: FileRowProps) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasSummary = !!file.summary;

  const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace("/graphql", "");
  const openFile = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
    if (!token) return;
    window.open(`${serverBase}/api/enriched-files/${file._id}?token=${token}`, "_blank");
  };

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
                  <Text fontSize="sm" fontWeight="medium" isTruncated>{file.file.description}</Text>
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
            <Badge colorScheme={summaryStatusColor(file.summaryStatus)} cursor={file.summaryError ? "help" : undefined}>
              {file.summaryStatus}
            </Badge>
          </Tooltip>
        </Td>
        <Td isNumeric>{file.pageCount ?? "—"}</Td>
        <Td>
          <HStack spacing={1} justify="flex-end">
            <IconButton
              aria-label="Open file"
              icon={<FiExternalLink />}
              size="xs"
              variant="ghost"
              onClick={openFile}
            />
            {(file.summaryStatus === "failed" || file.summaryStatus === "ready") && (
              <IconButton
                aria-label="Retry summary"
                icon={retryingId === file._id ? <Spinner size="xs" /> : <FiRefreshCw />}
                size="xs"
                colorScheme="orange"
                variant="ghost"
                isDisabled={retryingId === file._id}
                onClick={() => onRetry(file._id)}
              />
            )}
            <IconButton
              aria-label="Remove file"
              icon={removingId === file._id ? <Spinner size="xs" /> : <FiTrash2 />}
              size="xs"
              colorScheme="red"
              variant="ghost"
              isDisabled={removingId === file._id}
              onClick={() => onRemove(file._id)}
            />
          </HStack>
        </Td>
      </Tr>
      {hasSummary && (
        <Tr>
          <Td colSpan={4} p={0}>
            <Collapse in={expanded} animateOpacity>
              <Box bg="gray.50" px={6} py={3} borderBottom="1px solid" borderColor="gray.100">
                <Text fontSize="sm" mb={2} color="gray.700">{file.summary!.overview}</Text>
                {file.summary!.keyTopics.length > 0 && (
                  <Wrap spacing={1}>
                    {file.summary!.keyTopics.map((topic) => (
                      <WrapItem key={topic}>
                        <Badge colorScheme="blue" fontSize="xs">{topic}</Badge>
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

interface SystemSpecFilesProps {
  system: SystemSnippetFragment;
}

const SystemSpecFiles = ({ system: systemProp }: SystemSpecFilesProps) => {
  const toast = useToast();

  const { data, startPolling, stopPolling } = useSystemQuery();
  const system = data?.system ?? systemProp;

  const hasPending = system.specFiles.some(
    (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  );

  React.useEffect(() => {
    if (hasPending) {
      startPolling(3000);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [hasPending, startPolling, stopPolling]);

  const [uploading, setUploading] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [fileCreate] = Apollo.useMutation<{ fileCreate: { _id: string } }, { data: { file: File; description: string } }>(FILE_CREATE);
  const [systemAddSpecFile] = useSystemAddSpecFileMutation();
  const [systemRemoveSpecFile] = useSystemRemoveSpecFileMutation();
  const [systemRetrySpecFile] = useSystemRetrySpecFileMutation();

  const pendingCount = system.specFiles.filter(
    (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  ).length;


  const handleUpload = React.useCallback(
    async (file: File) => {
      setUploading(true);
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
        if (!fileId) throw new Error("File upload failed: no ID returned");

        await systemAddSpecFile({ variables: { fileId } });

        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e: any) {
        toast({ title: "Upload failed", description: e.message, status: "error", isClosable: true });
      } finally {
        setUploading(false);
      }
    },
    [fileCreate, systemAddSpecFile, toast]
  );

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleRemove = React.useCallback(
    async (fileObjectId: string) => {
      setRemovingId(fileObjectId);
      try {
        await systemRemoveSpecFile({ variables: { fileObjectId } });
      } catch (e: any) {
        toast({ title: "Error removing file", description: e.message, status: "error", isClosable: true });
      } finally {
        setRemovingId(null);
      }
    },
    [systemRemoveSpecFile, toast]
  );

  const handleRetry = React.useCallback(
    async (fileObjectId: string) => {
      setRetryingId(fileObjectId);
      try {
        await systemRetrySpecFile({ variables: { fileObjectId } });
      } catch (e: any) {
        toast({ title: "Error retrying summary", description: e.message, status: "error", isClosable: true });
      } finally {
        setRetryingId(null);
      }
    },
    [systemRetrySpecFile, toast]
  );

  return (
    <Box mt={8}>
      <Text fontWeight="semibold" fontSize="lg" mb={3}>Reference Spec Library</Text>
      <Text fontSize="sm" color="gray.500" mb={4}>
        Shared specification documents (e.g. City of Calgary specs, municipal standards) available to the AI in every Tender chat.
      </Text>

      {pendingCount > 0 && (
        <Alert status="warning" mb={3} borderRadius="md" size="sm">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {pendingCount} {pendingCount === 1 ? "document is" : "documents are"} still being processed.
          </AlertDescription>
        </Alert>
      )}

      {system.specFiles.length > 0 ? (
        <Table variant="simple" size="sm" mb={4} style={{ tableLayout: "fixed" }} w="100%">
          <colgroup>
            <col style={{ width: "auto" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "58px" }} />
            <col style={{ width: "88px" }} />
          </colgroup>
          <Thead>
            <Tr>
              <Th whiteSpace="nowrap">File</Th>
              <Th whiteSpace="nowrap">Status</Th>
              <Th isNumeric whiteSpace="nowrap">Pages</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {system.specFiles.map((file) => (
              <FileRow
                key={file._id}
                file={file}
                onRemove={handleRemove}
                onRetry={handleRetry}
                removingId={removingId}
                retryingId={retryingId}
              />
            ))}
          </Tbody>
        </Table>
      ) : (
        <Text fontSize="sm" color="gray.500" mb={3}>No spec files yet.</Text>
      )}

      <Box
        border="2px dashed"
        borderColor={isDragOver ? "blue.400" : "gray.200"}
        borderRadius="md"
        p={3}
        bg={isDragOver ? "blue.50" : "gray.50"}
        transition="border-color 0.15s, background 0.15s"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <Text fontSize="sm" color="gray.500" mb={2} textAlign="center">
          Drop a file here or click to upload.
        </Text>
        <HStack justify="center">
          <Button
            size="sm"
            colorScheme="blue"
            isLoading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
        </HStack>
      </Box>
    </Box>
  );
};

export default SystemSpecFiles;
