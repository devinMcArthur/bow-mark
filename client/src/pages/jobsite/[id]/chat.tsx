import {
  Box,
  Divider,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { navbarHeight } from "../../../constants/styles";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import { useRouter } from "next/router";
import React from "react";
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
  query JobsiteChat($id: ID!) {
    jobsite(id: $id) {
      _id
      name
      jobcode
      enrichedFiles {
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
  const { id } = router.query;
  const jobsiteId = typeof id === "string" ? id : "";

  const { data, loading, refetch, startPolling, stopPolling } = Apollo.useQuery<
    JobsiteChatQueryResult,
    JobsiteChatQueryVars
  >(JOBSITE_CHAT_QUERY, {
    variables: { id: jobsiteId },
    skip: !jobsiteId,
  });

  const jobsite = data?.jobsite;

  // Poll every 3s while any files are pending/processing
  React.useEffect(() => {
    const hasProcessing = jobsite?.enrichedFiles.some(
      (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
    );
    if (hasProcessing) {
      startPolling(3000);
    } else {
      stopPolling();
    }
  }, [jobsite?.enrichedFiles, startPolling, stopPolling]);

  if (loading) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container>
          <Spinner />
        </Container>
      </Permission>
    );
  }

  if (!jobsite && !loading) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container>
          <Text color="gray.500">Jobsite not found.</Text>
        </Container>
      </Permission>
    );
  }

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Flex h={`calc(100vh - ${navbarHeight})`} w="100%" overflow="hidden">
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <Box
          w="420px"
          flexShrink={0}
          borderRight="1px solid"
          borderColor="gray.200"
          overflowY="auto"
          p={5}
        >
          <Breadcrumbs
            crumbs={[
              { title: "Jobsites", link: "/jobsites" },
              {
                title: jobsite
                  ? jobsite.jobcode
                    ? `${jobsite.jobcode} — ${jobsite.name}`
                    : jobsite.name
                  : "...",
                link: jobsite ? `/jobsite/${jobsite._id}` : undefined,
              },
              { title: "Chat", isCurrentPage: true },
            ]}
          />

          {jobsite && (
            <>
              <Heading size="md" mb={1}>
                {jobsite.name}
              </Heading>
              {jobsite.jobcode && (
                <Text fontSize="sm" color="gray.500" mb={4}>
                  {jobsite.jobcode}
                </Text>
              )}

              <Divider my={4} />

              <Heading size="sm" mb={3} color="gray.700">
                Documents
              </Heading>
              <JobsiteEnrichedFiles
                jobsiteId={jobsite._id}
                enrichedFiles={jobsite.enrichedFiles}
                onUpdated={() => refetch()}
              />
            </>
          )}
        </Box>

        {/* ── Right panel: Chat ───────────────────────────────────────────── */}
        <Box flex={1} overflow="hidden">
          <ChatPage
            messageEndpoint="/api/jobsite-chat/message"
            conversationsEndpoint="/conversations"
            extraPayload={{ jobsiteId }}
            suggestions={JOBSITE_SUGGESTIONS}
            disableRouting
          />
        </Box>
      </Flex>
    </Permission>
  );
};

export default JobsiteChatPage;
