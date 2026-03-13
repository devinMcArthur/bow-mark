import {
  Box,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  IconButton,
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
  useMediaQuery,
} from "@chakra-ui/react";
import { navbarHeight } from "../../../constants/styles";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import { useRouter } from "next/router";
import React from "react";
import { FiFileText } from "react-icons/fi";
import Breadcrumbs from "../../../components/Common/Breadcrumbs";
import Container from "../../../components/Common/Container";
import Permission from "../../../components/Common/Permission";
import ChatPage from "../../../components/Chat/ChatPage";
import JobsiteEnrichedFiles, {
  EnrichedFileItem,
} from "../../../components/Jobsite/JobsiteEnrichedFiles";
import { UserRoles } from "../../../generated/graphql";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const JOBSITE_CHAT_QUERY = gql`
  query JobsiteChat($id: String!) {
    jobsite(id: $id) {
      _id
      name
      jobcode
      enrichedFiles {
        _id
        minRole
        enrichedFile {
          _id
          documentType
          summaryStatus
          summaryError
          pageCount
          summary {
            overview
            documentType
            keyTopics
          }
          file {
            _id
            mimetype
            description
          }
        }
      }
    }
  }
`;

interface JobsiteChatQueryResult {
  jobsite: {
    _id: string;
    name: string;
    jobcode?: string | null;
    enrichedFiles: EnrichedFileItem[];
  } | null;
}

interface JobsiteChatQueryVars {
  id: string;
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const JOBSITE_SUGGESTIONS = [
  "Summarize the key scope of work from the documents",
  "What are the main specification requirements for this jobsite?",
  "Are there any environmental or safety requirements I should know about?",
  "What materials or equipment are referenced in the documents?",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const JobsiteChatPage = () => {
  const router = useRouter();
  const { id, conversationId: conversationIdParam } = router.query;
  const jobsiteId = typeof id === "string" ? id : "";
  const initialConversationId = typeof conversationIdParam === "string" ? conversationIdParam : undefined;
  const [isDesktop] = useMediaQuery("(min-width: 768px)");
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { data, loading, refetch, startPolling, stopPolling } = Apollo.useQuery<
    JobsiteChatQueryResult,
    JobsiteChatQueryVars
  >(JOBSITE_CHAT_QUERY, {
    variables: { id: jobsiteId },
    skip: !jobsiteId,
  });

  const jobsite = data?.jobsite;

  React.useEffect(() => {
    const hasProcessing = jobsite?.enrichedFiles.some(
      (f) => f.enrichedFile?.summaryStatus === "pending" || f.enrichedFile?.summaryStatus === "processing"
    );
    if (hasProcessing) {
      startPolling(3000);
    } else {
      stopPolling();
    }
  }, [jobsite?.enrichedFiles, startPolling, stopPolling]);

  if (loading || !jobsiteId) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container><Spinner /></Container>
      </Permission>
    );
  }

  if (!jobsite) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container><Text color="gray.500">Jobsite not found.</Text></Container>
      </Permission>
    );
  }

  // Shared left-panel content used in both desktop sidebar and mobile drawer
  const panelContent = jobsite && (
    <>
      <Breadcrumbs
        crumbs={[
          { title: "Jobsites", link: "/jobsites" },
          {
            title: jobsite.jobcode || jobsite.name,
            link: `/jobsite/${jobsite._id}`,
          },
          { title: "Chat", isCurrentPage: true },
        ]}
      />
      <Heading size="md" mb={1} mt={2}>{jobsite.name}</Heading>
      {jobsite.jobcode && (
        <Text fontSize="sm" color="gray.500" mb={4}>{jobsite.jobcode}</Text>
      )}
      <Divider my={4} />
      <Heading size="sm" mb={3} color="gray.700">Documents</Heading>
      <JobsiteEnrichedFiles
        jobsiteId={jobsite._id}
        enrichedFiles={jobsite.enrichedFiles}
        onUpdated={() => refetch()}
      />
    </>
  );

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Flex h={`calc(100vh - ${navbarHeight})`} w="100%" overflow="hidden">
        {isDesktop ? (
          /* ── Desktop: fixed left panel ─────────────────────────────────── */
          <Box
            w="380px"
            flexShrink={0}
            borderRight="1px solid"
            borderColor="gray.200"
            overflowY="auto"
            p={5}
          >
            {panelContent}
          </Box>
        ) : (
          /* ── Mobile: drawer ─────────────────────────────────────────────── */
          <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="full">
            <DrawerOverlay />
            <DrawerContent>
              <DrawerCloseButton />
              <DrawerHeader borderBottomWidth="1px">Documents</DrawerHeader>
              <DrawerBody overflowY="auto">{panelContent}</DrawerBody>
            </DrawerContent>
          </Drawer>
        )}

        {/* ── Chat ──────────────────────────────────────────────────────────── */}
        <Box flex={1} overflow="hidden" position="relative">
          {/* Mobile: documents toggle button overlaid on chat */}
          {!isDesktop && (
            <Box position="absolute" top={3} right={3} zIndex={5}>
              <Tooltip label="View documents" placement="left">
                <IconButton
                  aria-label="Open documents"
                  icon={<FiFileText />}
                  size="sm"
                  onClick={onOpen}
                  colorScheme="blue"
                  variant="outline"
                />
              </Tooltip>
            </Box>
          )}
          <ChatPage
            messageEndpoint="/api/jobsite-chat/message"
            conversationsEndpoint={jobsiteId ? `/conversations?jobsiteId=${jobsiteId}` : "/conversations"}
            extraPayload={{ jobsiteId }}
            suggestions={JOBSITE_SUGGESTIONS}
            disableRouting
            initialConversationId={initialConversationId}
          />
        </Box>
      </Flex>
    </Permission>
  );
};

export default JobsiteChatPage;
