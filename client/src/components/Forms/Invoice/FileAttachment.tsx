import React from "react";
import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { FiExternalLink, FiFile, FiPaperclip, FiX } from "react-icons/fi";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useEnsureInvoiceFolderMutation } from "../../../generated/graphql";
import { localStorageTokenKey } from "../../../contexts/Auth";

const buildDocumentUrl = (documentId: string): string => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(localStorageTokenKey)
      : null;
  return token
    ? `/api/documents/${documentId}?token=${encodeURIComponent(token)}`
    : `/api/documents/${documentId}`;
};

/**
 * File attachment control embedded in the invoice create/update form.
 * Handles three states:
 *   - No existing document, no picked file  → "Attach file" button
 *   - A file is picked but not yet uploaded → shows filename + cancel
 *   - Existing document attached            → shows filename + View / Remove
 *
 * Parent owns the final submit orchestration: when it's time to save,
 * it calls `prepareDocumentId()` which either (a) returns the existing
 * id unchanged, (b) uploads the picked file into the right invoice
 * folder and returns the new Document id, or (c) returns null if the
 * user cleared the attachment.
 */

const EXISTING_FILE_QUERY = gql`
  query InvoiceFileAttachmentDoc($id: ID!) {
    document(id: $id) {
      _id
      currentFile {
        _id
        mimetype
        originalFilename
      }
    }
  }
`;

const UPLOAD_DOCUMENT = gql`
  mutation InvoiceFileAttachmentUpload($input: UploadDocumentInput!) {
    uploadDocument(input: $input) {
      _id
      documentId
    }
  }
`;

export interface InvoiceFileAttachmentHandle {
  /**
   * Resolves a final `documentId` (or null) to stash on the invoice
   * record. Uploads the picked file, provisioning the folder chain if
   * needed. Called by the form's submit handler before dispatching the
   * invoice mutation.
   */
  prepare: () => Promise<string | null | undefined>;
}

interface InvoiceFileAttachmentProps {
  jobsiteId: string;
  kind: "subcontractor" | "revenue" | "material";
  /** Existing Document id to show as the current attachment (update form only). */
  initialDocumentId?: string | null;
  isLoading?: boolean;
}

const InvoiceFileAttachment = React.forwardRef<
  InvoiceFileAttachmentHandle,
  InvoiceFileAttachmentProps
>(({ jobsiteId, kind, initialDocumentId, isLoading }, ref) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tracks three user intents:
  //   currentDocumentId === initialDocumentId  → unchanged
  //   currentDocumentId === null               → user cleared it
  //   pickedFile !== null                      → user replaced it
  const [currentDocumentId, setCurrentDocumentId] = React.useState<
    string | null | undefined
  >(initialDocumentId ?? null);
  const [pickedFile, setPickedFile] = React.useState<File | null>(null);

  const existingQuery = useQuery<{
    document: {
      _id: string;
      currentFile: {
        _id: string;
        mimetype?: string | null;
        originalFilename?: string | null;
      } | null;
    } | null;
  }>(EXISTING_FILE_QUERY, {
    variables: { id: currentDocumentId ?? "" },
    skip: !currentDocumentId,
  });

  const [ensureFolder] = useEnsureInvoiceFolderMutation();
  const [uploadDocument] = useMutation<
    { uploadDocument: { _id: string; documentId: string | null } },
    {
      input: {
        parentFileNodeId: string;
        fileUpload: File;
        displayName?: string;
        systemManaged?: boolean;
      };
    }
  >(UPLOAD_DOCUMENT);

  React.useImperativeHandle(
    ref,
    () => ({
      prepare: async () => {
        // Nothing picked, nothing changed → keep existing id (may be undefined).
        if (!pickedFile) return currentDocumentId;

        // New / replacement file. Ensure folder, upload, return new id.
        const folderRes = await ensureFolder({
          variables: { jobsiteId, kind },
        });
        const parentFileNodeId = folderRes.data?.ensureInvoiceFolder._id;
        if (!parentFileNodeId) {
          throw new Error("Could not provision invoice folder");
        }

        const uploadRes = await uploadDocument({
          variables: {
            input: {
              parentFileNodeId,
              fileUpload: pickedFile,
              displayName: pickedFile.name,
              // Lock the resulting FileNode so tree-side rename/move/
              // trash is blocked — the invoice record is the source of
              // truth, detach-and-replace must go through the form.
              systemManaged: true,
            },
          },
        });
        const documentId = uploadRes.data?.uploadDocument.documentId;
        if (!documentId) {
          throw new Error("Upload returned no documentId");
        }
        return documentId;
      },
    }),
    [currentDocumentId, ensureFolder, jobsiteId, kind, pickedFile, uploadDocument]
  );

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    setPickedFile(file);
  };

  const cancelPick = () => setPickedFile(null);
  const removeExisting = () => {
    setCurrentDocumentId(null);
    setPickedFile(null);
  };

  const existingFile = existingQuery.data?.document?.currentFile;
  const existingName =
    existingFile?.originalFilename ?? "Attached file";

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={3}
      bg="gray.50"
    >
      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
        <Icon as={FiPaperclip} mr={1} /> Invoice file
      </Text>

      {/* Picked but not uploaded (overrides any existing attachment). */}
      {pickedFile && (
        <Flex
          align="center"
          gap={2}
          bg="blue.50"
          borderWidth="1px"
          borderColor="blue.200"
          borderRadius="md"
          px={2}
          py={1}
        >
          <Icon as={FiFile} color="blue.500" />
          <Text flex={1} fontSize="sm" isTruncated>
            {pickedFile.name}
          </Text>
          <IconButton
            aria-label="Clear selected file"
            icon={<FiX />}
            size="xs"
            variant="ghost"
            onClick={cancelPick}
          />
        </Flex>
      )}

      {/* Existing attachment (only shown if nothing newer is picked). */}
      {!pickedFile && currentDocumentId && (
        <Flex
          align="center"
          gap={2}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          px={2}
          py={1}
        >
          <Icon as={FiFile} color="gray.500" />
          <Text flex={1} fontSize="sm" isTruncated>
            {existingQuery.loading ? <Spinner size="xs" /> : existingName}
          </Text>
          <IconButton
            as="a"
            href={buildDocumentUrl(currentDocumentId)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open file"
            icon={<FiExternalLink />}
            size="xs"
            variant="ghost"
          />
          <IconButton
            aria-label="Remove attachment"
            icon={<FiX />}
            size="xs"
            variant="ghost"
            onClick={removeExisting}
          />
        </Flex>
      )}

      {/* Pick / replace buttons. */}
      <Flex mt={2} gap={2}>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<FiPaperclip />}
          isDisabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
        >
          {pickedFile || currentDocumentId ? "Replace file" : "Attach file"}
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          display="none"
          onChange={onFileSelected}
        />
      </Flex>
      <Text fontSize="xs" color="gray.500" mt={1}>
        {kind === "subcontractor"
          ? "Subcontractor"
          : kind === "revenue"
          ? "Revenue"
          : "Material"} invoices are filed under{" "}
        <code>
          /jobsites/&lt;id&gt;/Invoices/
          {kind === "subcontractor"
            ? "Subcontractor"
            : kind === "revenue"
            ? "Revenue"
            : "MaterialInvoices"}
          /
        </code>{" "}
        and run through AI summarization automatically.
      </Text>
    </Box>
  );
});

InvoiceFileAttachment.displayName = "InvoiceFileAttachment";

export default InvoiceFileAttachment;
