import {
  Box,
  Divider,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { navbarHeight } from "../../constants/styles";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import { useRouter } from "next/router";
import React from "react";
import Breadcrumbs from "../../components/Common/Breadcrumbs";
import Container from "../../components/Common/Container";
import Permission from "../../components/Common/Permission";
import TenderOverview from "../../components/Tender/TenderOverview";
import TenderDocuments from "../../components/Tender/TenderDocuments";
import ChatPage from "../../components/Chat/ChatPage";
import { TenderDetail } from "../../components/Tender/types";
import { UserRoles } from "../../generated/graphql";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const TENDER_QUERY = gql`
  query TenderDetail($id: ID!) {
    tender(id: $id) {
      _id
      name
      jobcode
      status
      description
      createdAt
      updatedAt
      files {
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
      jobsite {
        _id
        name
      }
    }
  }
`;

interface TenderQueryResult {
  tender: TenderDetail | null;
}

interface TenderQueryVars {
  id: string;
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const TENDER_SUGGESTIONS = [
  "Summarize the key scope of work from the documents",
  "What are the main risks identified in the tender documents?",
  "List any environmental or geotechnical requirements",
  "What are the bonding and insurance requirements?",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const TenderDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const tenderId = typeof id === "string" ? id : "";
  const conversationIdParam = router.query.conversationId;
  const initialConversationId = typeof conversationIdParam === "string" ? conversationIdParam : undefined;

  const { data, loading, refetch, startPolling, stopPolling } = Apollo.useQuery<
    TenderQueryResult,
    TenderQueryVars
  >(TENDER_QUERY, {
    variables: { id: tenderId },
    skip: !tenderId,
  });

  const tender = data?.tender;

  // Poll every 3s while any files are pending/processing, stop when all settle
  React.useEffect(() => {
    const hasProcessing = tender?.files.some(
      (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
    );
    if (hasProcessing) {
      startPolling(3000);
    } else {
      stopPolling();
    }
  }, [tender?.files, startPolling, stopPolling]);

  if (loading) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container>
          <Spinner />
        </Container>
      </Permission>
    );
  }

  if (!tender && !loading) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container>
          <Text color="gray.500">Tender not found.</Text>
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
              { title: "Tenders", link: "/tenders" },
              {
                title: tender ? `${tender.jobcode} — ${tender.name}` : "...",
                isCurrentPage: true,
              },
            ]}
          />

          {tender && (
            <>
              <TenderOverview
                key={tender._id}
                tender={tender}
                onUpdated={() => refetch()}
              />

              <Divider my={4} />

              <Heading size="sm" mb={3} color="gray.700">
                Documents
              </Heading>
              <TenderDocuments
                tender={tender}
                onUpdated={() => refetch()}
              />
            </>
          )}
        </Box>

        {/* ── Right panel: Chat ───────────────────────────────────────────── */}
        <Box flex={1} overflow="hidden">
          <ChatPage
            messageEndpoint="/api/tender-chat/message"
            conversationsEndpoint={`/api/tender-conversations/${tenderId}`}
            extraPayload={{ tenderId }}
            suggestions={TENDER_SUGGESTIONS}
            disableRouting
            initialConversationId={initialConversationId}
          />
        </Box>
      </Flex>
    </Permission>
  );
};

export default TenderDetailPage;
