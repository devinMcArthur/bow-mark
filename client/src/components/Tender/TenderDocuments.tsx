import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Spinner,
  Text,
  Tooltip,
  useToast,
  VStack,
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
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { TenderDetail, TenderFileItem } from "./types";
import dataUrlToBlob from "../../utils/dataUrlToBlob";
import { collectDroppedFiles } from "../../utils/collectDroppedFiles";
import {
  EnrichedFileProgress,
  summaryStatusColor,
  summaryStatusLabel,
} from "../Common/EnrichedFileProgress";

const FILE_CREATE = gql`
  mutation TenderFileCreate($data: FileCreateData!) {
    fileCreate(data: $data) {
      _id
    }
  }
`;
import { localStorageTokenKey } from "../../contexts/Auth";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const TENDER_ADD_FILE = gql`
  mutation TenderAddFile($id: ID!, $data: TenderAddFileData!) {
    tenderAddFile(id: $id, data: $data) {
      _id
      files {
        _id
        documentType
        summaryStatus
        summaryError
        pageCount
        processingStartedAt
        summaryProgress {
          phase
          current
          total
          updatedAt
        }
        summary {
          overview
          documentType
          keyTopics
          chunks {
            startPage
            endPage
            overview
            keyTopics
          }
        }
        file {
          _id
          mimetype
          description
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
        summaryError
        pageCount
        processingStartedAt
        summaryProgress {
          phase
          current
          total
          updatedAt
        }
        summary {
          overview
          documentType
          keyTopics
          chunks {
            startPage
            endPage
            overview
            keyTopics
          }
        }
        file {
          _id
          mimetype
          description
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
        summaryError
        pageCount
        processingStartedAt
        summaryProgress {
          phase
          current
          total
          updatedAt
        }
        summary {
          overview
          documentType
          keyTopics
          chunks {
            startPage
            endPage
            overview
            keyTopics
          }
        }
        file {
          _id
          mimetype
          description
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

// ─── Expandable file row ──────────────────────────────────────────────────────

interface FileRowProps {
  file: TenderFileItem;
  tenderId: string;
  onRemove: (fileObjectId: string) => void;
  onRetry: (fileObjectId: string) => void;
  removingId: string | null;
  retryingId: string | null;
  onFileSelect?: (file: TenderFileItem) => void;
}

const FileCard = ({
  file,
  tenderId,
  onRemove,
  onRetry,
  removingId,
  retryingId,
  onFileSelect,
}: FileRowProps) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasSummary = !!file.summary;

  const serverBase = "";
  const openInNewTab = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const token = typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
    if (!token) return;
    window.open(`${serverBase}/api/enriched-files/${file._id}?token=${token}`, "_blank");
  };

  const handleCardClick = () => {
    if (onFileSelect) onFileSelect(file);
    else openInNewTab();
  };

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      overflow="hidden"
      cursor="pointer"
      _hover={{ borderColor: "gray.300", bg: "gray.50" }}
      transition="border-color 0.15s, background 0.15s"
      onClick={handleCardClick}
    >
      <Box px={3} pt={3} pb={2}>
        {/* Filename — full width */}
        {file.file.description && (
          <Text fontSize="sm" fontWeight="medium" wordBreak="break-word" lineHeight="short" mb={1}>
            {file.file.description}
          </Text>
        )}

        {/* Document type row */}
        <Text fontSize="xs" color="gray.500" mt={1}>
          {file.summary?.documentType || file.documentType || (
            <Text as="span" fontStyle="italic">Detecting…</Text>
          )}
        </Text>

        {/* Status/pages row + actions */}
        <HStack justify="space-between" align="center" mt={1}>
          <HStack spacing={2}>
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
                fontSize="xs"
              >
                {summaryStatusLabel(file.summaryStatus)}
              </Badge>
            </Tooltip>
            {file.pageCount != null && (
              <Text fontSize="xs" color="gray.400">{file.pageCount}p</Text>
            )}
          </HStack>

          <HStack spacing={0} flexShrink={0} onClick={(e) => e.stopPropagation()}>
            {onFileSelect && (
              <Tooltip label="Open in new tab" placement="top">
                <IconButton
                  aria-label="Open in new tab"
                  icon={<FiExternalLink />}
                  size="xs"
                  variant="ghost"
                  onClick={openInNewTab}
                />
              </Tooltip>
            )}
            {hasSummary && (
              <IconButton
                aria-label="Toggle summary"
                icon={expanded ? <FiChevronDown /> : <FiChevronRight />}
                size="xs"
                variant="ghost"
                onClick={() => setExpanded((v) => !v)}
              />
            )}
            {(file.summaryStatus === "failed" ||
              file.summaryStatus === "ready" ||
              file.summaryStatus === "partial") && (
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
        </HStack>

        {/* Live progress bar during summary/indexing phases. Rendered
            below the status row so the layout stays stable as progress
            appears and disappears. `partial` keeps showing progress
            because the watchdog will retry and resume. */}
        <EnrichedFileProgress
          status={file.summaryStatus}
          progress={file.summaryProgress}
          processingStartedAt={file.processingStartedAt}
        />
      </Box>

      {hasSummary && (
        <Collapse in={expanded} animateOpacity>
          <Box
            bg="gray.50"
            px={3}
            py={2}
            borderTop="1px solid"
            borderColor="gray.100"
            onClick={(e) => e.stopPropagation()}
          >
            <Text fontSize="xs" color="gray.700" mb={2}>{file.summary!.overview}</Text>
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
      )}
    </Box>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderDocumentsProps {
  tender: TenderDetail;
  onUpdated?: () => void;
  onFileSelect?: (file: TenderFileItem) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const TenderDocuments = ({ tender, onUpdated, onFileSelect }: TenderDocumentsProps) => {
  const toast = useToast();

  const [uploadProgress, setUploadProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  // Case-insensitive substring match over filename, AI documentType, key
  // topics, and the summary overview. Overview is included so a user
  // searching for "temperature" finds a spec book whose per-page index
  // hasn't been loaded yet — the high-level summary still mentions it.
  const filteredFiles = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tender.files;
    return tender.files.filter((f) => {
      const filename = (f.file.description ?? "").toLowerCase();
      if (filename.includes(q)) return true;
      const docType = (f.summary?.documentType ?? f.documentType ?? "").toLowerCase();
      if (docType.includes(q)) return true;
      const topics = (f.summary?.keyTopics ?? []).join(" ").toLowerCase();
      if (topics.includes(q)) return true;
      const overview = (f.summary?.overview ?? "").toLowerCase();
      if (overview.includes(q)) return true;
      return false;
    });
  }, [tender.files, searchQuery]);

  // Group filtered files by AI-generated category. Returns null when no
  // categories exist yet (newly-uploaded tender before the first
  // categorization pass) — the caller falls back to a flat list.
  //
  // Categories come server-side in display order (most-accessed first).
  // Files not claimed by any category land in the "Uncategorized" bucket
  // at the end; empty buckets are dropped so search results stay tight.
  const groupedFiles = React.useMemo(() => {
    const categories = tender.fileCategories ?? [];
    if (categories.length === 0) return null;

    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    const fileById = new Map(filteredFiles.map((f) => [f._id, f]));

    const groups: Array<{
      _id: string;
      name: string;
      files: TenderFileItem[];
    }> = [];
    const claimed = new Set<string>();

    for (const cat of sortedCategories) {
      const files = cat.fileIds
        .map((id) => fileById.get(id))
        .filter((f): f is TenderFileItem => f !== undefined);
      files.forEach((f) => claimed.add(f._id));
      groups.push({ _id: cat._id, name: cat.name, files });
    }

    const uncategorized = filteredFiles.filter((f) => !claimed.has(f._id));
    if (uncategorized.length > 0) {
      groups.push({
        _id: "uncategorized",
        name: "Uncategorized",
        files: uncategorized,
      });
    }

    return groups.filter((g) => g.files.length > 0);
  }, [filteredFiles, tender.fileCategories]);

  React.useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const [fileCreate] = Apollo.useMutation<{ fileCreate: { _id: string } }, { data: { file: File; description: string } }>(FILE_CREATE);

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

  // Count files still in flight. Treats "partial" as in-flight since the
  // watchdog will retry and complete them — the user should see the same
  // "still processing" banner until they reach a terminal state.
  const pendingCount = tender.files.filter(
    (f) =>
      f.summaryStatus === "pending" ||
      f.summaryStatus === "processing" ||
      f.summaryStatus === "partial"
  ).length;
  const hasPending = pendingCount > 0;

  // ── Upload handler ────────────────────────────────────────────────────────

  const handleUpload = React.useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const existingNames = new Set(tender.files.map((f) => f.file.description).filter(Boolean));
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

          await tenderAddFile({ variables: { id: tender._id, data: { fileId } } });
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
    [tender._id, fileCreate, tenderAddFile, toast, onUpdated]
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
    <Box display="flex" flexDirection="column" h="100%" overflow="hidden">
      {/* Upload area — pinned at top */}
      <Box
        px={5}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.200"
        flexShrink={0}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        bg={isDragOver ? "blue.50" : "white"}
        transition="background 0.15s"
      >
        <HStack justify="space-between" align="center">
          <Text fontSize="sm" color="gray.500">
            {isDragOver ? "Drop to upload" : "Add documents"}
          </Text>
          <HStack>
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
          </HStack>
        </HStack>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          accept=".pdf,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>

      {/* File list — scrollable */}
      <Box flex={1} overflowY="auto" px={5} py={3}>
        {hasPending && (
          <Alert status="warning" mb={3} borderRadius="md" size="sm">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              {pendingCount} {pendingCount === 1 ? "document is" : "documents are"} still being processed — answers may be incomplete.
            </AlertDescription>
          </Alert>
        )}

        {/* Search bar — shown when there's more than one file. Filters
            across filename, AI document type, key topics, and overview. */}
        {tender.files.length > 1 && (
          <InputGroup size="sm" mb={3}>
            <InputLeftElement pointerEvents="none" color="gray.400">
              <FiSearch />
            </InputLeftElement>
            <Input
              placeholder="Search documents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              borderRadius="md"
              bg="white"
            />
            {searchQuery && (
              <InputRightElement>
                <IconButton
                  aria-label="Clear search"
                  icon={<FiX />}
                  size="xs"
                  variant="ghost"
                  onClick={() => setSearchQuery("")}
                />
              </InputRightElement>
            )}
          </InputGroup>
        )}

        {tender.files.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            No documents yet.
          </Text>
        ) : filteredFiles.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            No documents match &ldquo;{searchQuery}&rdquo;.
          </Text>
        ) : groupedFiles && groupedFiles.length > 0 ? (
          // Grouped view — AI-categorized folders. All open by default;
          // user can collapse individual sections. Order comes from the
          // server (most-accessed folder first).
          <Accordion
            allowMultiple
            defaultIndex={groupedFiles.map((_, i) => i)}
            // Force re-mount when the group count changes so newly-added
            // folders default to expanded. Without this, Accordion holds
            // onto its original defaultIndex across re-renders.
            key={groupedFiles.length}
          >
            {groupedFiles.map((group) => (
              <AccordionItem key={group._id} border="none" mb={2}>
                <AccordionButton
                  px={2}
                  py={1}
                  borderRadius="md"
                  _hover={{ bg: "gray.100" }}
                >
                  <Box flex="1" textAlign="left">
                    <HStack spacing={2}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                        {group.name}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {group.files.length}
                      </Text>
                    </HStack>
                  </Box>
                  <AccordionIcon color="gray.400" />
                </AccordionButton>
                <AccordionPanel px={0} pb={2} pt={1}>
                  <VStack spacing={2} align="stretch">
                    {group.files.map((file) => (
                      <FileCard
                        key={file._id}
                        file={file}
                        tenderId={tender._id}
                        onRemove={handleRemove}
                        onRetry={handleRetry}
                        removingId={removingId}
                        retryingId={retryingId}
                        onFileSelect={onFileSelect}
                      />
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          // Flat list — either no categories yet (first upload before
          // categorizer has run) or categorizer returned nothing usable.
          <VStack spacing={2} align="stretch">
            {filteredFiles.map((file) => (
              <FileCard
                key={file._id}
                file={file}
                tenderId={tender._id}
                onRemove={handleRemove}
                onRetry={handleRetry}
                removingId={removingId}
                retryingId={retryingId}
                onFileSelect={onFileSelect}
              />
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
};

export default TenderDocuments;
