import React from "react";
import {
  Box,
  CloseButton,
  Flex,
  Text,
  useMediaQuery,
  useToast,
} from "@chakra-ui/react";
import ChatPage from "./ChatPage";
import { UserRoles, useEnrichedFileLazyQuery } from "../../generated/graphql";
import { navbarHeight } from "../../constants/styles";
import DocumentViewerModal, {
  DocumentViewerFile,
} from "../Common/DocumentViewerModal";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  messageEndpoint: string;
  conversationsEndpoint: string;
  extraPayload?: Record<string, unknown>;
  suggestions?: string[];
  minRole?: UserRoles;
  onToolResult?: (toolName: string, result: string) => void;
  /**
   * Optional override for docref click handling. By default, ChatDrawer
   * fetches the file metadata via the EnrichedFile query and opens its
   * own DocumentViewerModal — so callers don't need to do anything to
   * get the file-preview behavior. Pass this only if you want to bypass
   * the built-in modal (e.g. to highlight a row in a parallel pricing
   * sheet view instead of opening a modal).
   */
  onDocRefClick?: (enrichedFileId: string, page?: number) => void;
  initialConversationId?: string;
}

const ChatDrawer = ({
  isOpen,
  onClose,
  title,
  messageEndpoint,
  conversationsEndpoint,
  extraPayload,
  suggestions,
  minRole = UserRoles.User,
  onToolResult,
  onDocRefClick,
  initialConversationId,
}: ChatDrawerProps) => {
  const [isDesktop] = useMediaQuery("(min-width: 768px)");
  const toast = useToast();

  // ── Built-in document viewer ───────────────────────────────────────────
  // Server-side resolution: when a docref is clicked, fetch the file
  // metadata from the API instead of relying on a parent-passed file list.
  // This keeps ChatDrawer self-contained and works for any file the user
  // has access to, including ones outside the parent's known context.
  const [docViewerFile, setDocViewerFile] =
    React.useState<DocumentViewerFile | null>(null);
  const [fetchEnrichedFile] = useEnrichedFileLazyQuery({
    fetchPolicy: "cache-first",
  });

  const handleDocRefClick = React.useCallback(
    async (enrichedFileId: string, page?: number) => {
      // Open the modal immediately with a placeholder so the user gets
      // instant feedback; metadata fills in once the query resolves.
      setDocViewerFile({ enrichedFileId, page });

      try {
        const result = await fetchEnrichedFile({ variables: { id: enrichedFileId } });
        const ef = result.data?.enrichedFile;
        if (!ef) {
          setDocViewerFile(null);
          toast({
            title: "File not found",
            description: "This document is no longer available.",
            status: "warning",
            duration: 5000,
            isClosable: true,
          });
          return;
        }
        setDocViewerFile({
          enrichedFileId,
          fileName: ef.file.description ?? undefined,
          mimetype: ef.file.mimetype,
          page,
        });
      } catch (err) {
        setDocViewerFile(null);
        toast({
          title: "Couldn't load file",
          description: err instanceof Error ? err.message : "Unknown error",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    },
    [fetchEnrichedFile, toast],
  );

  // Parent-supplied handler wins if present; otherwise use the built-in.
  const effectiveDocRefClick = onDocRefClick ?? handleDocRefClick;

  React.useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const scrollY = parseInt(document.body.style.top || "0", 10) * -1;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    }
    return () => {
      const scrollY = parseInt(document.body.style.top || "0", 10) * -1;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.600"
        zIndex={3}
        onClick={onClose}
        opacity={isOpen ? 1 : 0}
        pointerEvents={isOpen ? "auto" : "none"}
        transition="opacity 0.3s ease"
      />

      {/* Slide panel — always mounted so ChatPage state is preserved */}
      <Box
        position="fixed"
        right={0}
        top={navbarHeight}
        h={`calc(100vh - ${navbarHeight})`}
        w={isDesktop ? "50vw" : "100vw"}
        zIndex={5}
        bg="white"
        display="flex"
        flexDir="column"
        boxShadow="-4px 0 16px rgba(0,0,0,0.15)"
        transform={isOpen ? "translateX(0)" : "translateX(100%)"}
        visibility={isOpen ? "visible" : "hidden"}
        transition={
          isOpen
            ? "transform 0.3s ease, visibility 0s linear 0s"
            : "transform 0.3s ease, visibility 0s linear 0.3s"
        }
      >
        <Flex
          px={4}
          py={3}
          borderBottomWidth="1px"
          borderColor="gray.200"
          align="center"
          justify="space-between"
          flexShrink={0}
        >
          <Text fontWeight="semibold" fontSize="md" noOfLines={1}>
            {title}
          </Text>
          <CloseButton onClick={onClose} />
        </Flex>
        <Box flex={1} overflow="hidden">
          <ChatPage
            messageEndpoint={messageEndpoint}
            conversationsEndpoint={conversationsEndpoint}
            extraPayload={extraPayload}
            suggestions={suggestions}
            disableRouting
            height="100%"
            minRole={minRole}
            onToolResult={onToolResult}
            onDocRefClick={effectiveDocRefClick}
            initialConversationId={initialConversationId}
          />
        </Box>
      </Box>

      {/* Built-in document viewer modal — only rendered when a parent
          hasn't overridden onDocRefClick. */}
      {!onDocRefClick && (
        <DocumentViewerModal
          file={docViewerFile}
          onClose={() => setDocViewerFile(null)}
        />
      )}
    </>
  );
};

export default ChatDrawer;
