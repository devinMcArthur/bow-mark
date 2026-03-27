import {
  Box,
  Divider,
  Flex,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
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
import TenderOverview from "../../../components/Tender/TenderOverview";
import TenderDocuments from "../../../components/Tender/TenderDocuments";
import TenderSummaryTab from "../../../components/Tender/TenderSummaryTab";
import TenderNotesTab from "../../../components/Tender/TenderNotesTab";
import ChatPage from "../../../components/Chat/ChatPage";
import { TenderDetail } from "../../../components/Tender/types";
import { UserRoles } from "../../../generated/graphql";

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
      notes {
        _id
        content
        savedBy {
          name
        }
        savedAt
        conversationId
      }
      summaryGenerating
      jobSummary {
        content
        generatedAt
        generatedBy
        generatedFrom
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
  const initialConversationId =
    typeof conversationIdParam === "string" ? conversationIdParam : undefined;

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
    if (hasProcessing || tender?.summaryGenerating) {
      startPolling(3000);
    } else {
      stopPolling();
    }
  }, [tender?.files, tender?.summaryGenerating, startPolling, stopPolling]);

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
        {/* ── Left panel with tabs ─────────────────────────────────────────── */}
        <Box
          w="420px"
          flexShrink={0}
          borderRight="1px solid"
          borderColor="gray.200"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          <Box px={5} pt={5} pb={3} flexShrink={0}>
            <Breadcrumbs
              crumbs={[
                { title: "Tenders", link: "/tenders" },
                {
                  title: tender ? tender.jobcode : "...",
                  isCurrentPage: true,
                },
              ]}
            />
          </Box>

          {tender && (
            <Tabs
              display="flex"
              flexDirection="column"
              flex={1}
              overflow="hidden"
              size="sm"
              variant="line"
            >
              <TabList px={5} flexShrink={0}>
                <Tab>Job</Tab>
                <Tab>Documents</Tab>
                <Tab>Notes {tender.notes.length > 0 ? `(${tender.notes.length})` : ""}</Tab>
              </TabList>

              <TabPanels flex={1} overflow="hidden">
                {/* ── Job tab ──────────────────────────────────────────────── */}
                <TabPanel h="100%" overflowY="auto" px={5} py={3}>
                  <TenderOverview
                    key={tender._id}
                    tender={tender}
                    onUpdated={() => refetch()}
                  />
                  <Divider my={4} />
                  <TenderSummaryTab
                    tender={tender}
                    onUpdated={() => refetch()}
                  />
                </TabPanel>

                {/* ── Documents tab ────────────────────────────────────────── */}
                <TabPanel h="100%" overflowY="auto" px={5} py={3}>
                  <TenderDocuments
                    tender={tender}
                    onUpdated={() => refetch()}
                  />
                </TabPanel>

                {/* ── Notes tab ────────────────────────────────────────────── */}
                <TabPanel h="100%" overflowY="auto" p={0}>
                  <TenderNotesTab
                    tender={tender}
                    onUpdated={() => refetch()}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </Box>

        {/* ── Right panel: Chat (always visible) ──────────────────────────── */}
        <Box flex={1} overflow="hidden">
          <ChatPage
            messageEndpoint="/api/tender-chat/message"
            conversationsEndpoint={`/api/tender-conversations/${tenderId}`}
            extraPayload={{ tenderId }}
            suggestions={TENDER_SUGGESTIONS}
            disableRouting
            initialConversationId={initialConversationId}
            onToolResult={(toolName) => {
              if (toolName === "save_tender_note" || toolName === "delete_tender_note") {
                refetch();
              }
            }}
          />
        </Box>
      </Flex>
    </Permission>
  );
};

export default TenderDetailPage;
