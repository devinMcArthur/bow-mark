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
  Tr,
  useToast,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import React from "react";
import { FiChevronDown, FiChevronRight, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { TenderDetail, TenderFileItem } from "./types";
import { useFileCreateMutation } from "../../generated/graphql";
import dataUrlToBlob from "../../utils/dataUrlToBlob";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const TENDER_ADD_FILE = gql`
  mutation TenderAddFile($id: ID!, $data: TenderAddFileData!) {
    tenderAddFile(id: $id, data: $data) {
      _id
      files {
        _id
        documentType
        summaryStatus
        pageCount
        summary {
          overview
          documentType
          keyTopics
        }
        file {
          _id
          mimetype
        }
      }
    }
  }
`;

const TENDER_REMOVE_FILE = gql`
  mutation TenderRemoveFile($id: ID!, $fileObjectId: ID!) {
    tenderRemoveFile(id: $id, fileObjectId: $fileObjectId) {
      _id
      files {
        _id
        documentType
        summaryStatus
        pageCount
        summary {
          overview
          documentType
          keyTopics
        }
        file {
          _id
          mimetype
        }
      }
    }
  }
`;

const TENDER_RETRY_SUMMARY = gql`
  mutation TenderRetrySummary($id: ID!, $fileObjectId: ID!) {
    tenderRetrySummary(id: $id, fileObjectId: $fileObjectId) {
      _id
      files {
        _id
        documentType
        summaryStatus
        pageCount
        summary {
          overview
          documentType
          keyTopics
        }
        file {
          _id
          mimetype
        }
      }
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenderFilesResult {
  tenderAddFile: { _id: string; files: TenderFileItem[] };
}
interface TenderAddFileVars {
  id: string;
  data: {
    fileId: string;
  };
}
interface TenderRemoveFileVars {
  id: string;
  fileObjectId: string;
}
interface TenderRetryVars {
  id: string;
  fileObjectId: string;
}

// ─── Status badge color ───────────────────────────────────────────────────────

function summaryStatusColor(status: string): string {
  if (status === "ready") return "green";
  if (status === "failed") return "red";
  if (status === "processing") return "yellow";
  return "gray"; // pending
}

// ─── Expandable file row ──────────────────────────────────────────────────────

interface FileRowProps {
  file: TenderFileItem;
  onRemove: (fileObjectId: string) => void;
  onRetry: (fileObjectId: string) => void;
  removingId: string | null;
  retryingId: string | null;
}

const FileRow = ({
  file,
  onRemove,
  onRetry,
  removingId,
  retryingId,
}: FileRowProps) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasSummary = !!file.summary;

  return (
    <>
      <Tr>
        <Td>
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
            <Text fontSize="sm">
              {file.summary?.documentType || file.documentType || (
                <Text as="span" color="gray.400" fontStyle="italic">Detecting…</Text>
              )}
            </Text>
          </HStack>
        </Td>
        <Td>
          <Badge colorScheme={summaryStatusColor(file.summaryStatus)}>
            {file.summaryStatus}
          </Badge>
        </Td>
        <Td isNumeric>{file.pageCount ?? "—"}</Td>
        <Td>
          <HStack spacing={1} justify="flex-end">
            {file.summaryStatus === "failed" && (
              <IconButton
                aria-label="Retry summary"
                icon={
                  retryingId === file._id ? (
                    <Spinner size="xs" />
                  ) : (
                    <FiRefreshCw />
                  )
                }
                size="xs"
                colorScheme="orange"
                variant="ghost"
                isDisabled={retryingId === file._id}
                onClick={() => onRetry(file._id)}
              />
            )}
            <IconButton
              aria-label="Remove file"
              icon={
                removingId === file._id ? <Spinner size="xs" /> : <FiTrash2 />
              }
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderDocumentsProps {
  tender: TenderDetail;
  onUpdated?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const TenderDocuments = ({ tender, onUpdated }: TenderDocumentsProps) => {
  const toast = useToast();

  const [uploading, setUploading] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [fileCreate] = useFileCreateMutation();

  const [tenderAddFile] = Apollo.useMutation<TenderFilesResult, TenderAddFileVars>(
    TENDER_ADD_FILE
  );

  const [tenderRemoveFile] = Apollo.useMutation<
    unknown,
    TenderRemoveFileVars
  >(TENDER_REMOVE_FILE);

  const [tenderRetrySummary] = Apollo.useMutation<unknown, TenderRetryVars>(
    TENDER_RETRY_SUMMARY
  );

  // Detect any pending/processing files
  const pendingCount = tender.files.filter(
    (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  ).length;
  const hasPending = pendingCount > 0;

  // ── Upload handler ────────────────────────────────────────────────────────

  const handleUpload = React.useCallback(
    async (file: File) => {
      setUploading(true);

      try {
        // Step 1: Upload file via GraphQL multipart upload
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target!.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const blob = dataUrlToBlob(dataUrl);
        const uploadFile = new File([blob], file.name, { type: file.type });

        const fileRes = await fileCreate({
          variables: {
            data: { file: uploadFile },
          },
        });

        const fileId = fileRes.data?.fileCreate._id;
        if (!fileId) throw new Error("File upload failed: no ID returned");

        // Step 2: Attach to tender (AI will detect document type)
        await tenderAddFile({
          variables: {
            id: tender._id,
            data: { fileId },
          },
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
        if (onUpdated) onUpdated();
      } catch (e: any) {
        toast({
          title: "Upload failed",
          description: e.message,
          status: "error",
          isClosable: true,
        });
      } finally {
        setUploading(false);
      }
    },
    [tender._id, fileCreate, tenderAddFile, toast, onUpdated]
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

  // ── Remove handler ────────────────────────────────────────────────────────

  const handleRemove = React.useCallback(
    async (fileObjectId: string) => {
      setRemovingId(fileObjectId);
      try {
        await tenderRemoveFile({
          variables: { id: tender._id, fileObjectId },
        });
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
    [tender._id, tenderRemoveFile, toast, onUpdated]
  );

  // ── Retry handler ─────────────────────────────────────────────────────────

  const handleRetry = React.useCallback(
    async (fileObjectId: string) => {
      setRetryingId(fileObjectId);
      try {
        await tenderRetrySummary({
          variables: { id: tender._id, fileObjectId },
        });
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
    [tender._id, tenderRetrySummary, toast, onUpdated]
  );

  // ── Rendering ──────────────────────────────────────────────────────────────

  return (
    <Box>
      {hasPending && (
        <Alert status="warning" mb={3} borderRadius="md" size="sm">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {pendingCount} {pendingCount === 1 ? "document is" : "documents are"} still being processed — answers may be incomplete.
          </AlertDescription>
        </Alert>
      )}

      {tender.files.length > 0 ? (
        <Table variant="simple" size="sm" mb={4}>
          <Thead>
            <Tr>
              <Th>Document Type</Th>
              <Th>Status</Th>
              <Th isNumeric>Pages</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {tender.files.map((file) => (
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
        <Text fontSize="sm" color="gray.500" mb={3}>
          No documents yet.
        </Text>
      )}

      {/* Upload area */}
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
        <Text fontSize="sm" color="gray.500" mb={2}>
          Drop a file here or click to upload. The AI will detect the document type automatically.
        </Text>
        <HStack>
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

export default TenderDocuments;
