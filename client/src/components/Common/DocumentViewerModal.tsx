import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Button,
  Flex,
  Text,
} from "@chakra-ui/react";
import { FiExternalLink } from "react-icons/fi";
import dynamic from "next/dynamic";
import { localStorageTokenKey } from "../../contexts/Auth";

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

function buildStreamUrl(fileId: string): string {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  params.set("stream", "1");
  return `/api/enriched-files/${fileId}?${params.toString()}`;
}

function buildDownloadUrl(fileId: string): string {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  const qs = params.toString();
  return `/api/enriched-files/${fileId}${qs ? `?${qs}` : ""}`;
}

function isPdf(mimetype?: string): boolean {
  return mimetype === "application/pdf" || mimetype === undefined;
}

function isImage(mimetype?: string): boolean {
  return !!mimetype?.startsWith("image/");
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const title = file.fileName ?? "Document";

  return (
    <Modal isOpen={!!file} onClose={onClose} size="6xl" isCentered>
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent h="85vh" maxH="85vh" display="flex" flexDir="column">
        <ModalHeader fontSize="md" py={3} pr={12} borderBottom="1px solid" borderColor="gray.200">
          {title}
          {file.page && <Text as="span" color="gray.500" fontWeight="normal" ml={2}>p. {file.page}</Text>}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody flex={1} p={0} overflow="hidden">
          {isPdf(file.mimetype) ? (
            <PdfViewer
              url={buildStreamUrl(file.enrichedFileId)}
              fileName={title}
              initialPage={file.page}
            />
          ) : isImage(file.mimetype) ? (
            <Flex h="100%" align="center" justify="center" p={4} overflow="auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buildDownloadUrl(file.enrichedFileId)}
                alt={title}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </Flex>
          ) : (
            <Flex h="100%" direction="column" align="center" justify="center" gap={4}>
              <Text color="gray.500">Preview not available for this file type</Text>
              <Button
                as="a"
                href={buildDownloadUrl(file.enrichedFileId)}
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
