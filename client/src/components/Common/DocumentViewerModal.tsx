import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Flex,
  IconButton,
  Spinner,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { FiDownload, FiExternalLink, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import dynamic from "next/dynamic";
import { gql, useQuery } from "@apollo/client";
import { localStorageTokenKey } from "../../contexts/Auth";

/**
 * Fallback lookup when a caller opens the viewer with just an id and no
 * mimetype. Also pulls size + originalFilename so the header can always
 * surface them — callers rarely know size upfront.
 */
const DOCUMENT_VIEWER_META_QUERY = gql`
  query DocumentViewerMeta($id: ID!) {
    document(id: $id) {
      _id
      currentFile {
        _id
        mimetype
        originalFilename
        size
      }
    }
  }
`;

/** Human-readable byte size (e.g. "124 KB", "2.3 MB"). */
function formatFileSize(bytes?: number | null): string | null {
  if (bytes == null || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIdx]}`;
}

/** Friendly short label for a mimetype (e.g. "PDF", "PNG", "XLSX"). */
function friendlyMimetype(mimetype?: string): string | null {
  if (!mimetype) return null;
  const tail = mimetype.split("/").pop() ?? mimetype;
  // Strip common prefixes that aren't useful to a user ("vnd.ms-excel" → "excel").
  return tail
    .replace(/^vnd\.(openxmlformats-officedocument\.)?/, "")
    .replace(/^(spreadsheetml|wordprocessingml|presentationml)\./, "")
    .toUpperCase();
}

const PdfViewer = dynamic(
  () => import("../TenderPricing/PdfViewer"),
  { ssr: false, loading: () => <Flex h="100%" align="center" justify="center"><Text color="gray.400">Loading viewer...</Text></Flex> }
);

export interface DocumentViewerFile {
  enrichedFileId: string;
  fileName?: string;
  mimetype?: string;
  page?: number;
}

interface DocumentViewerModalProps {
  file: DocumentViewerFile | null;
  onClose: () => void;
}

function buildStreamUrl(fileId: string, fileName?: string): string {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  params.set("stream", "1");
  if (fileName) params.set("filename", fileName);
  return `/api/documents/${fileId}?${params.toString()}`;
}

function buildDownloadUrl(fileId: string, fileName?: string): string {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (fileName) params.set("filename", fileName);
  const qs = params.toString();
  return `/api/documents/${fileId}${qs ? `?${qs}` : ""}`;
}

function isPdf(mimetype?: string): boolean {
  return mimetype === "application/pdf";
}

function isImage(mimetype?: string): boolean {
  return !!mimetype?.startsWith("image/");
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ file, onClose }) => {
  const [fullscreen, setFullscreen] = React.useState(false);
  // Reset fullscreen state when the modal's file changes (opens fresh /
  // closes). Avoids carrying state across unrelated opens.
  React.useEffect(() => {
    if (!file) setFullscreen(false);
  }, [file]);

  // Always fetch so we can surface size + filename + mimetype in the
  // header. Cached after the first lookup per documentId so it's cheap.
  const lookupQuery = useQuery<{
    document: {
      _id: string;
      currentFile: {
        _id: string;
        mimetype?: string | null;
        originalFilename?: string | null;
        size?: number | null;
      } | null;
    } | null;
  }>(DOCUMENT_VIEWER_META_QUERY, {
    variables: { id: file?.enrichedFileId ?? "" },
    skip: !file,
  });

  if (!file) return null;

  const currentFile = lookupQuery.data?.document?.currentFile;
  const resolvedMimetype =
    file.mimetype ?? currentFile?.mimetype ?? undefined;
  const originalFilename = currentFile?.originalFilename ?? undefined;
  const resolvedSize = currentFile?.size ?? null;

  // Title prefers the caller-provided label (usually something
  // human-meaningful like "ACME Supply #12345"), falling back to the
  // actual filename. When both are available and distinct, the filename
  // surfaces in the metadata row below — see below.
  const title = file.fileName ?? originalFilename ?? "Document";
  const showFilenameInMeta =
    !!originalFilename && originalFilename !== title;
  // What to send to the stream/download endpoint as the Content-
  // Disposition filename. Prefer the real originalFilename so the
  // browser saves with a sensible name; fall back to the title.
  const downloadFileName = originalFilename ?? file.fileName;
  const sizeLabel = formatFileSize(resolvedSize);
  const typeLabel = friendlyMimetype(resolvedMimetype);
  const lookupPending =
    !file.mimetype && lookupQuery.loading && !lookupQuery.data;

  return (
    <Modal
      isOpen={!!file}
      onClose={onClose}
      size={fullscreen ? "full" : "6xl"}
      isCentered={!fullscreen}
    >
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent
        h={fullscreen ? "100vh" : "85vh"}
        maxH={fullscreen ? "100vh" : "85vh"}
        m={fullscreen ? 0 : undefined}
        borderRadius={fullscreen ? 0 : undefined}
        display="flex"
        flexDir="column"
      >
        <ModalHeader
          fontSize="md"
          py={3}
          pr={14}
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          <Flex align="center" gap={1}>
            <Text isTruncated lineHeight={1.2}>
              {title}
              {file.page && (
                <Text
                  as="span"
                  color="gray.500"
                  fontWeight="normal"
                  ml={2}
                >
                  p. {file.page}
                </Text>
              )}
            </Text>
            <Tooltip label="Download">
              <IconButton
                aria-label="Download"
                icon={<FiDownload size={14} />}
                size="xs"
                variant="ghost"
                flexShrink={0}
                as="a"
                href={buildDownloadUrl(file.enrichedFileId, downloadFileName)}
                download={downloadFileName ?? true}
              />
            </Tooltip>
          </Flex>
          {/* Metadata row — filename (when distinct from the title),
              type badge, and size. Muted so it doesn't compete with
              the title above. */}
          {(showFilenameInMeta || sizeLabel || typeLabel) && (
            <Flex
              gap={2}
              mt={1}
              align="center"
              fontSize="xs"
              fontWeight="normal"
              color="gray.500"
              flexWrap="wrap"
            >
              {typeLabel && (
                <Text
                  px={1.5}
                  py={0.5}
                  bg="gray.100"
                  borderRadius="sm"
                  letterSpacing="wide"
                >
                  {typeLabel}
                </Text>
              )}
              {showFilenameInMeta && (
                <Text isTruncated maxW="50ch" title={originalFilename}>
                  {originalFilename}
                </Text>
              )}
              {sizeLabel && <Text>{sizeLabel}</Text>}
            </Flex>
          )}
        </ModalHeader>
        <Tooltip label={fullscreen ? "Exit full screen" : "Full screen"}>
          <IconButton
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            icon={fullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
            size="sm"
            variant="ghost"
            position="absolute"
            top={2}
            right={14}
            onClick={() => setFullscreen((v) => !v)}
          />
        </Tooltip>
        <ModalCloseButton />
        <ModalBody flex={1} p={0} overflow="hidden">
          {lookupPending ? (
            <Flex h="100%" align="center" justify="center">
              <Spinner />
            </Flex>
          ) : isPdf(resolvedMimetype) ? (
            <PdfViewer
              url={buildStreamUrl(file.enrichedFileId, downloadFileName)}
              fileName={title}
              initialPage={file.page}
            />
          ) : isImage(resolvedMimetype) ? (
            <Flex h="100%" align="center" justify="center" p={4} overflow="auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buildDownloadUrl(file.enrichedFileId, downloadFileName)}
                alt={title}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </Flex>
          ) : (
            <Flex h="100%" direction="column" align="center" justify="center" gap={4}>
              <Text color="gray.500">Preview not available for this file type</Text>
              <Button
                as="a"
                href={buildDownloadUrl(file.enrichedFileId, downloadFileName)}
                target="_blank"
                rel="noopener noreferrer"
                leftIcon={<FiExternalLink />}
                colorScheme="blue"
                variant="outline"
                size="sm"
              >
                Open in new tab
              </Button>
            </Flex>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default DocumentViewerModal;
