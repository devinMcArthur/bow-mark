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
import { TenderFileItem } from "./types";
import { localStorageTokenKey } from "../../contexts/Auth";

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
  return `/api/enriched-files/${fileId}${qs ? `?${qs}` : ""}`;
}

// ─── File list item ───────────────────────────────────────────────────────────

interface FileListItemProps {
  file: TenderFileItem;
  onSelect: (file: TenderFileItem) => void;
}

const FileListItem: React.FC<FileListItemProps> = ({ file, onSelect }) => {
  const isProcessing = file.summaryStatus === "pending" || file.summaryStatus === "processing";
  return (
    <Flex
      px={4}
      py={3}
      borderBottom="1px solid"
      borderColor="gray.100"
      align="flex-start"
      gap={3}
      cursor="pointer"
      _active={{ bg: "gray.50" }}
      onClick={() => onSelect(file)}
    >
      <Box flex={1} minW={0}>
        <Flex align="center" gap={2} mb={1} flexWrap="wrap">
          {file.documentType && (
            <Badge fontSize="xs" colorScheme="blue" flexShrink={0}>
              {file.documentType}
            </Badge>
          )}
          <Text fontSize="sm" color="gray.800" isTruncated>
            {file.file.description || "Untitled"}
          </Text>
        </Flex>
        {isProcessing ? (
          <Flex align="center" gap={1}>
            <Spinner size="xs" color="gray.400" />
            <Text fontSize="xs" color="gray.400">Processing…</Text>
          </Flex>
        ) : file.summary?.overview ? (
          <Text fontSize="xs" color="gray.500" noOfLines={2}>
            {file.summary.overview}
          </Text>
        ) : null}
      </Box>
    </Flex>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderMobileDocumentsTabProps {
  files: TenderFileItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

const TenderMobileDocumentsTab: React.FC<TenderMobileDocumentsTabProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<TenderFileItem | null>(null);

  if (selectedFile) {
    const isPdf =
      selectedFile.file.mimetype === "application/pdf" ||
      selectedFile.file.description?.toLowerCase().endsWith(".pdf");
    const fileUrl = buildFileUrl(selectedFile._id);
    const pdfStreamUrl = buildFileUrl(selectedFile._id, true);

    return (
      <Flex direction="column" h="100%">
        {/* Viewer top bar */}
        <Flex
          h="44px"
          align="center"
          gap={2}
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
          />
          <Text fontSize="sm" color="gray.700" isTruncated flex={1}>
            {selectedFile.file.description || "File"}
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
                fileName={selectedFile.file.description ?? undefined}
              />
            </ClientOnly>
          ) : (
            <Flex h="100%" align="center" justify="center" direction="column" gap={3} p={4}>
              <Text fontSize="sm" color="gray.500" textAlign="center">
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
      {files.length === 0 ? (
        <Flex h="100%" align="center" justify="center">
          <Text fontSize="sm" color="gray.400">No documents attached.</Text>
        </Flex>
      ) : (
        files.map((file) => (
          <FileListItem key={file._id} file={file} onSelect={setSelectedFile} />
        ))
      )}
    </Box>
  );
};

export default TenderMobileDocumentsTab;
