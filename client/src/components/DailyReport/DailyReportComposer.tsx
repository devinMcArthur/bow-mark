import React from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Text,
  Textarea,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { FiAlertTriangle, FiCamera, FiImage, FiSend, FiX } from "react-icons/fi";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  useCreateDailyReportEntryMutation,
  useEnsureEntityRootMutation,
} from "../../generated/graphql";

/**
 * Composer for a DailyReportEntry. Foreman types (optional) text,
 * attaches (optional) photos via camera/gallery, optionally flags as
 * issue, taps send. Photos upload in sequence through the unified
 * uploadDocument pipeline into the daily report's FileNode root; once
 * all photos land we create the entry referencing their Document ids.
 *
 * Stays a single screen — no modals, no multi-step description prompt.
 */

// Used once at mount to resolve the daily report's FileNode root. The
// server provisioned `/daily-reports/<id>/` when the report was created,
// so this just looks it up.
const DAILY_REPORT_ROOT_QUERY = gql`
  query DailyReportEntryComposerRoot($entityId: ID!) {
    entityRoot(namespace: "daily-reports", entityId: $entityId) {
      _id
    }
  }
`;

// Local inline mutation — mirrors FileBrowser's version. Returns the
// new FileNode so we can read documentId off it.
const UPLOAD_DOCUMENT = gql`
  mutation DailyReportEntryUploadDocument($input: UploadDocumentInput!) {
    uploadDocument(input: $input) {
      _id
      documentId
    }
  }
`;

interface DailyReportComposerProps {
  dailyReportId: string;
  /**
   * Called with the optimistic entry payload so the caller can insert
   * it into its local timeline state immediately. Avoids a refetch
   * round-trip on post — the server's actual entry replaces it in
   * Apollo's cache once the mutation resolves.
   */
  onPosted?: () => void;
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
}

const DailyReportComposer: React.FC<DailyReportComposerProps> = ({
  dailyReportId,
  onPosted,
}) => {
  const toast = useToast();
  const [text, setText] = React.useState("");
  const [isIssue, setIsIssue] = React.useState(false);
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  const [posting, setPosting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const rootQuery = useQuery<{ entityRoot: { _id: string } | null }>(
    DAILY_REPORT_ROOT_QUERY,
    { variables: { entityId: dailyReportId } }
  );
  const existingRootId = rootQuery.data?.entityRoot?._id ?? null;

  const [uploadDocument] = useMutation<
    { uploadDocument: { _id: string; documentId: string | null } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { input: { parentFileNodeId: string; fileUpload: File; displayName?: string } }
  >(UPLOAD_DOCUMENT);
  const [ensureEntityRoot] = useEnsureEntityRootMutation();
  const [createEntry] = useCreateDailyReportEntryMutation({
    refetchQueries: ["DailyReportEntries"],
    awaitRefetchQueries: true,
  });

  // Revoke object URLs on unmount so we don't leak memory. The cleanup
  // reads from a ref that's kept in sync on every render — using
  // `attachments` directly would freeze at the first-render value
  // (`[]`), meaning we'd revoke nothing on unmount when the user had
  // queued files but navigated away.
  const attachmentsRef = React.useRef(attachments);
  React.useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  React.useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) =>
        URL.revokeObjectURL(a.previewUrl)
      );
    };
    // Deliberately only on unmount — individual URLs are revoked in
    // removeAttachment when the user drops them from the list.
  }, []);

  const pickFiles = () => fileInputRef.current?.click();
  const takePhoto = () => cameraInputRef.current?.click();

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Materialize the FileList into a plain array BEFORE resetting
    // e.target.value. FileList is live — clearing the input first can
    // cause the list to report length 0 in some browsers (notably
    // camera captures on Android Chrome), so snapshot it up front.
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    const next: PendingAttachment[] = files.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setAttachments((prev) => [...prev, ...next]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const canSend =
    !posting && (text.trim().length > 0 || attachments.length > 0);

  const handleSend = async () => {
    if (!canSend) return;
    setPosting(true);
    try {
      // Only resolve the daily report's FileNode root if we actually
      // have attachments — the root is provisioned lazily, and a text-
      // only post doesn't need one. If we do need it, ensureEntityRoot
      // is idempotent: fast when it already exists, creates it otherwise.
      let uploadTargetRootId = existingRootId;
      if (attachments.length > 0 && !uploadTargetRootId) {
        const ensured = await ensureEntityRoot({
          variables: { namespace: "daily-reports", entityId: dailyReportId },
        });
        uploadTargetRootId = ensured.data?.ensureEntityRoot._id ?? null;
        if (!uploadTargetRootId) {
          throw new Error("Couldn't provision document folder for this report");
        }
        await rootQuery.refetch();
      }

      // Sequential uploads keep things simple; a typical entry is 1-5
      // photos so the parallelism gain from concurrent uploads is
      // marginal and isn't worth the extra complexity here.
      const documentIds: string[] = [];
      for (const a of attachments) {
        if (!uploadTargetRootId) break;
        const res = await uploadDocument({
          variables: {
            input: {
              parentFileNodeId: uploadTargetRootId,
              fileUpload: a.file,
              displayName: a.file.name,
            },
          },
        });
        const docId = res.data?.uploadDocument?.documentId;
        if (docId) documentIds.push(docId);
      }
      await createEntry({
        variables: {
          data: {
            dailyReportId,
            text: text.trim() || undefined,
            documentIds,
            isIssue,
          },
        },
      });
      // Reset composer state + free preview URLs.
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      setAttachments([]);
      setText("");
      setIsIssue(false);
      onPosted?.();
    } catch (err) {
      toast({
        title: "Couldn't post",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderColor={isIssue ? "red.300" : "gray.200"}
      borderRadius="md"
      bg="white"
      p={3}
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's happening?"
        resize="none"
        minH="44px"
        maxH="200px"
        border="none"
        _focus={{ boxShadow: "none" }}
        p={0}
        fontSize="md"
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enter sends without needing to grab the mouse.
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSend();
          }
        }}
      />

      {attachments.length > 0 && (
        <HStack spacing={2} mt={2} overflowX="auto">
          {attachments.map((a) => (
            <Box
              key={a.id}
              position="relative"
              flexShrink={0}
              borderRadius="md"
              overflow="hidden"
              borderWidth="1px"
              borderColor="gray.200"
            >
              <Image src={a.previewUrl} boxSize="64px" objectFit="cover" alt={a.file.name} />
              <IconButton
                aria-label="Remove"
                icon={<FiX />}
                size="xs"
                position="absolute"
                top="2px"
                right="2px"
                bg="blackAlpha.700"
                color="white"
                _hover={{ bg: "blackAlpha.800" }}
                onClick={() => removeAttachment(a.id)}
              />
            </Box>
          ))}
        </HStack>
      )}

      <Flex mt={2} align="center">
        <Tooltip label="Take photo">
          <IconButton
            aria-label="Take photo"
            icon={<FiCamera />}
            variant="ghost"
            size="sm"
            onClick={takePhoto}
          />
        </Tooltip>
        <Tooltip label="Attach from gallery">
          <IconButton
            aria-label="Attach from gallery"
            icon={<FiImage />}
            variant="ghost"
            size="sm"
            ml={2}
            onClick={pickFiles}
          />
        </Tooltip>
        <Tooltip label={isIssue ? "Clear issue flag" : "Flag as issue"}>
          <IconButton
            aria-label="Flag as issue"
            icon={<FiAlertTriangle />}
            variant={isIssue ? "solid" : "ghost"}
            colorScheme={isIssue ? "red" : "gray"}
            size="sm"
            ml={2}
            onClick={() => setIsIssue((v) => !v)}
          />
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={onFilesSelected}
        />
        {/* Separate input for the camera path. capture="environment"
            tells mobile browsers to open the rear camera directly
            rather than offer a library picker. Kept as its own input
            so the gallery button above never gets coerced into a
            camera-only chooser on devices that honor capture too
            aggressively. Ignored on desktop. */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ capture: "environment" } as any)}
          style={{ display: "none" }}
          onChange={onFilesSelected}
        />
        <Box flex={1} />
        <Button
          leftIcon={<Icon as={FiSend} />}
          colorScheme="blue"
          size="sm"
          onClick={handleSend}
          isDisabled={!canSend}
          isLoading={posting}
          loadingText="Posting"
        >
          Post
        </Button>
      </Flex>
    </Box>
  );
};

export default DailyReportComposer;
