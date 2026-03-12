import React from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { FiPlus, FiEdit2, FiTrash2, FiMaximize2, FiCopy, FiDownload } from "react-icons/fi";
import { QRCodeCanvas } from "qrcode.react";
import {
  PublicDocumentSnippetFragment,
  usePublicDocumentsQuery,
  usePublicDocumentCreateMutation,
  usePublicDocumentUpdateMutation,
  usePublicDocumentDeleteMutation,
} from "../../../../generated/graphql";

const serverBase = () =>
  (process.env.NEXT_PUBLIC_API_URL as string).replace("/graphql", "");

const publicUrl = (slug: string) => `${serverBase()}/public/${slug}`;

// ─── QR Code Popover ──────────────────────────────────────────────────────────

const QRPopover = ({ slug, title }: { slug: string; title: string }) => {
  const url = publicUrl(slug);
  const toast = useToast();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${slug}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const copyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast({ title: "QR code copied to clipboard", status: "success", duration: 2000 });
      }, "image/png");
    } catch {
      toast({ title: "Copy not supported in this browser", status: "warning", duration: 3000 });
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied", status: "success", duration: 2000, isClosable: true });
  };

  return (
    <Popover placement="left">
      <PopoverTrigger>
        <IconButton
          aria-label="Show QR code"
          icon={<FiMaximize2 />}
          size="sm"
          variant="ghost"
        />
      </PopoverTrigger>
      <PopoverContent w="260px">
        <PopoverArrow />
        <PopoverBody p={5}>
          <Stack spacing={4} align="center">
            <Box p={3} bg="white" borderRadius="md" boxShadow="sm" border="1px solid" borderColor="gray.100">
              <QRCodeCanvas ref={canvasRef} value={url} size={176} />
            </Box>
            <Stack spacing={1} align="center" w="full">
              <Text fontSize="sm" fontWeight="semibold" textAlign="center">{title}</Text>
              <Text fontSize="xs" color="gray.400" textAlign="center" wordBreak="break-all" lineHeight="short">
                {url}
              </Text>
            </Stack>
            <Stack spacing={3} w="full">
              <Button size="sm" leftIcon={<FiDownload />} onClick={downloadPng} w="full" colorScheme="blue">
                Download PNG
              </Button>
              <Flex>
                <Button size="sm" leftIcon={<FiCopy />} onClick={copyImage} flex={1} variant="outline" mr={2}>
                  Copy Image
                </Button>
                <Button size="sm" leftIcon={<FiCopy />} onClick={copyUrl} flex={1} variant="outline">
                  Copy URL
                </Button>
              </Flex>
            </Stack>
          </Stack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

interface IDocumentFormModal {
  isOpen: boolean;
  onClose: () => void;
  existing?: PublicDocumentSnippetFragment;
  onSuccess: (doc: PublicDocumentSnippetFragment) => void;
}

const DocumentFormModal = ({
  isOpen,
  onClose,
  existing,
  onSuccess,
}: IDocumentFormModal) => {
  const toast = useToast();
  const isEdit = !!existing;

  const [title, setTitle] = React.useState(existing?.title ?? "");
  const [slug, setSlug] = React.useState(existing?.slug ?? "");
  const [description, setDescription] = React.useState(existing?.description ?? "");
  const [file, setFile] = React.useState<File | null>(null);

  // Reset form when modal opens with new data
  React.useEffect(() => {
    if (isOpen) {
      setTitle(existing?.title ?? "");
      setSlug(existing?.slug ?? "");
      setDescription(existing?.description ?? "");
      setFile(null);
    }
  }, [isOpen, existing]);

  // Auto-generate slug from title when creating
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEdit) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  const [create, { loading: creating }] = usePublicDocumentCreateMutation({
    update(cache, { data }) {
      if (data?.publicDocumentCreate) {
        cache.evict({ fieldName: "publicDocuments" });
        cache.gc();
      }
    },
  });

  const [update, { loading: updating }] = usePublicDocumentUpdateMutation();

  const loading = creating || updating;

  const handleSubmit = async () => {
    if (!title.trim() || !slug.trim()) {
      toast({ title: "Title and slug are required", status: "error", duration: 3000 });
      return;
    }
    if (!isEdit && !file) {
      toast({ title: "Please select a file", status: "error", duration: 3000 });
      return;
    }

    try {
      if (isEdit) {
        const { data } = await update({
          variables: {
            id: existing!._id,
            data: {
              title: title.trim(),
              description: description.trim() || undefined,
              ...(file ? { file } : {}),
            },
          },
        });
        if (data?.publicDocumentUpdate) {
          onSuccess(data.publicDocumentUpdate);
          toast({ title: "Document updated", status: "success", duration: 2000 });
          onClose();
        }
      } else {
        const { data } = await create({
          variables: {
            data: {
              title: title.trim(),
              slug: slug.trim(),
              description: description.trim() || undefined,
              file,
            },
          },
        });
        if (data?.publicDocumentCreate) {
          onSuccess(data.publicDocumentCreate);
          toast({ title: "Document created", status: "success", duration: 2000 });
          onClose();
        }
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        status: "error",
        duration: 4000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEdit ? "Edit Document" : "Add Public Document"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap={4}>
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Safety Harness Policy"
              />
            </FormControl>

            <FormControl isRequired isDisabled={isEdit}>
              <FormLabel>Slug</FormLabel>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="safety-harness-policy"
              />
              <FormHelperText>
                {isEdit
                  ? "Slug cannot be changed after creation (would break existing QR codes)"
                  : `Public URL: ${serverBase()}/public/${slug || "…"}`}
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Description (optional)</FormLabel>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document"
              />
            </FormControl>

            <FormControl isRequired={!isEdit}>
              <FormLabel>{isEdit ? "Replace File (optional)" : "File"}</FormLabel>
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                p={1}
              />
            </FormControl>
          </Flex>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
            {isEdit ? "Save Changes" : "Create"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// ─── Delete Confirmation ───────────────────────────────────────────────────────

interface IDeleteDialog {
  isOpen: boolean;
  onClose: () => void;
  doc: PublicDocumentSnippetFragment;
  onDeleted: (id: string) => void;
}

const DeleteDialog = ({ isOpen, onClose, doc, onDeleted }: IDeleteDialog) => {
  const cancelRef = React.useRef(null);
  const toast = useToast();

  const [deleteDoc, { loading }] = usePublicDocumentDeleteMutation({
    update(cache, { data }) {
      if (data?.publicDocumentDelete) {
        cache.evict({ fieldName: "publicDocuments" });
        cache.gc();
      }
    },
  });

  const handleDelete = async () => {
    try {
      await deleteDoc({ variables: { id: doc._id } });
      onDeleted(doc._id);
      toast({ title: "Document deleted", status: "success", duration: 2000 });
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Delete failed",
        status: "error",
        duration: 4000,
      });
    }
  };

  return (
    <AlertDialog isOpen={isOpen} onClose={onClose} leastDestructiveRef={cancelRef}>
      <AlertDialogContent>
        <AlertDialogHeader>Delete &ldquo;{doc.title}&rdquo;?</AlertDialogHeader>
        <AlertDialogBody>
          This will permanently delete the document and its underlying file. Any
          existing QR codes for this slug will stop working.
        </AlertDialogBody>
        <AlertDialogFooter gap={2}>
          <Button ref={cancelRef} variant="ghost" onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button colorScheme="red" onClick={handleDelete} isLoading={loading}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PublicDocumentsSettings = () => {
  const { data, loading } = usePublicDocumentsQuery({ fetchPolicy: "cache-and-network" });
  const docs = data?.publicDocuments ?? [];

  const createModal = useDisclosure();
  const [editTarget, setEditTarget] = React.useState<PublicDocumentSnippetFragment | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PublicDocumentSnippetFragment | null>(null);

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="md">Public Documents</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm" onClick={createModal.onOpen}>
          Add Document
        </Button>
      </Flex>

      {loading && !docs.length ? (
        <Flex justify="center" py={8}>
          <Spinner />
        </Flex>
      ) : docs.length === 0 ? (
        <Text color="gray.500">
          No public documents yet. Add one to generate a QR code.
        </Text>
      ) : (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Title</Th>
              <Th>Slug</Th>
              <Th isNumeric>Views</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {docs.map((doc) => (
              <Tr key={doc._id}>
                <Td>
                  <Text fontWeight="medium">{doc.title}</Text>
                  {doc.description && (
                    <Text fontSize="xs" color="gray.500">
                      {doc.description}
                    </Text>
                  )}
                </Td>
                <Td>
                  <Text fontSize="xs" color="gray.600" fontFamily="mono">
                    {doc.slug}
                  </Text>
                </Td>
                <Td isNumeric>{doc.viewCount.toLocaleString()}</Td>
                <Td>
                  <Flex gap={1}>
                    <QRPopover slug={doc.slug} title={doc.title} />
                    <IconButton
                      aria-label="Edit"
                      icon={<FiEdit2 />}
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditTarget(doc)}
                    />
                    <IconButton
                      aria-label="Delete"
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => setDeleteTarget(doc)}
                    />
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <DocumentFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        onSuccess={() => {}}
      />

      {editTarget && (
        <DocumentFormModal
          isOpen
          onClose={() => setEditTarget(null)}
          existing={editTarget}
          onSuccess={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          isOpen
          onClose={() => setDeleteTarget(null)}
          doc={deleteTarget}
          onDeleted={() => setDeleteTarget(null)}
        />
      )}
    </Box>
  );
};

export default PublicDocumentsSettings;
