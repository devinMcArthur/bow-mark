// client/src/components/Tender/TenderMobileDocumentsTab.tsx
import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { FiChevronLeft, FiDownload } from "react-icons/fi";
import dynamic from "next/dynamic";
import ClientOnly from "../Common/ClientOnly";
import { TenderDocumentItem } from "./types";
import { localStorageTokenKey } from "../../contexts/Auth";
import { EnrichedFileProgress } from "../Common/EnrichedFileProgress";

const PdfViewer = dynamic(
  () => import("../TenderPricing/PdfViewer"),
  { ssr: false, loading: () => <Flex h="100%" align="center" justify="center"><Spinner /></Flex> }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFileUrl(fileId: string, stream = false): string {
  const token = typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (stream) params.set("stream", "1");
  const qs = params.toString();
  return `/api/documents/${fileId}${qs ? `?${qs}` : ""}`;
}

// ─── File list item ───────────────────────────────────────────────────────────

interface FileListItemProps {
  file: TenderDocumentItem;
  onSelect: (file: TenderDocumentItem) => void;
}

const FileListItem: React.FC<FileListItemProps> = ({ file, onSelect }) => {
  const status = file.enrichment?.status ?? "pending";
  const isProcessing = status === "processing" || status === "partial";
  const isPending = status === "pending";
  const isOrphaned = status === "orphaned";
  const docType = file.enrichment?.summary?.documentType;
  return (
    <Flex
      px={4}
      py={3}
      borderBottom="1px solid"
      borderColor="gray.100"
      align="flex-start"
      cursor="pointer"
      _active={{ bg: "gray.50" }}
      onClick={() => onSelect(file)}
    >
      <Box flex={1} minW={0}>
        <Flex align="center" mb={1} flexWrap="wrap">
          {docType && (
            <Badge fontSize="xs" colorScheme="blue" flexShrink={0} mr={2}>
              {docType}
            </Badge>
          )}
          <Text fontSize="sm" color="gray.800" isTruncated>
            {file.name || "Untitled"}
          </Text>
        </Flex>
        {isOrphaned ? (
          <Text fontSize="xs" color="red.500">
            Source file missing
          </Text>
        ) : isPending ? (
          <Flex align="center">
            <Spinner size="xs" color="gray.400" mr={1} />
            <Text fontSize="xs" color="gray.400">
              Queued…
            </Text>
          </Flex>
        ) : isProcessing ? (
          <EnrichedFileProgress
            status={status}
            progress={file.enrichment?.summaryProgress ?? null}
            processingStartedAt={file.enrichment?.processingStartedAt ?? null}
            compact
          />
        ) : file.enrichment?.summary?.overview ? (
          <Text fontSize="xs" color="gray.500" noOfLines={2}>
            {file.enrichment.summary.overview}
          </Text>
        ) : null}
      </Box>
    </Flex>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderMobileDocumentsTabProps {
  documents: TenderDocumentItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

const TenderMobileDocumentsTab: React.FC<TenderMobileDocumentsTabProps> = ({
  documents,
}) => {
  const [selectedFile, setSelectedFile] = useState<TenderDocumentItem | null>(
    null
  );

  if (selectedFile) {
    const isPdf =
      selectedFile.mimetype === "application/pdf" ||
      selectedFile.name?.toLowerCase().endsWith(".pdf");
    const fileUrl = buildFileUrl(selectedFile.documentId);
    const pdfStreamUrl = buildFileUrl(selectedFile.documentId, true);

    return (
      <Flex direction="column" h="100%">
        {/* Viewer top bar */}
        <Flex
          h="44px"
          align="center"
          px={2}
          borderBottom="1px solid"
          borderColor="gray.200"
          bg="gray.50"
          flexShrink={0}
        >
          <IconButton
            aria-label="Back to file list"
            icon={<FiChevronLeft />}
            size="sm"
            variant="ghost"
            onClick={() => setSelectedFile(null)}
            mr={1}
          />
          <Text fontSize="sm" color="gray.700" isTruncated flex={1}>
            {selectedFile.name || "File"}
          </Text>
          <IconButton
            aria-label="Download"
            icon={<FiDownload size={14} />}
            size="sm"
            variant="ghost"
            onClick={() => window.open(fileUrl, "_blank")}
          />
        </Flex>

        {/* Viewer body */}
        <Box flex={1} overflow="hidden">
          {isPdf ? (
            <ClientOnly>
              <PdfViewer
                url={pdfStreamUrl}
                fileName={selectedFile.name}
              />
            </ClientOnly>
          ) : (
            <Flex h="100%" align="center" justify="center" direction="column" p={4}>
              <Text fontSize="sm" color="gray.500" textAlign="center" mb={3}>
                Preview not available for this file type.
              </Text>
              <Button size="sm" leftIcon={<FiDownload />} onClick={() => window.open(fileUrl, "_blank")}>
                Open File
              </Button>
            </Flex>
          )}
        </Box>
      </Flex>
    );
  }

  return (
    <Box h="100%" overflowY="auto">
      {documents.length === 0 ? (
        <Flex h="100%" align="center" justify="center">
          <Text fontSize="sm" color="gray.400">No documents attached.</Text>
        </Flex>
      ) : (
        documents.map((file) => (
          <FileListItem key={file._id} file={file} onSelect={setSelectedFile} />
        ))
      )}
    </Box>
  );
};

export default TenderMobileDocumentsTab;
