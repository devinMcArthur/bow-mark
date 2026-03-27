import {
  Box,
  Button,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import React from "react";
import ReactMarkdown from "react-markdown";
import { TenderDetail, TenderJobSummary, timeAgo } from "./types";

const REGENERATE_SUMMARY = gql`
  mutation TenderRegenerateSummary($id: ID!) {
    tenderRegenerateSummary(id: $id) {
      _id
      jobSummary {
        content
        generatedAt
        generatedBy
        generatedFrom
      }
    }
  }
`;

interface Props {
  tender: TenderDetail;
  onUpdated: () => void;
}

function isStale(jobSummary: TenderJobSummary, tender: TenderDetail): boolean {
  const readyFileIds = tender.files
    .filter((f) => f.summaryStatus === "ready")
    .map((f) => f._id);
  const noteIds = tender.notes.map((n) => n._id);
  const currentIds = new Set([...readyFileIds, ...noteIds]);
  const generatedFromSet = new Set(jobSummary.generatedFrom);
  return (
    [...currentIds].some((id) => !generatedFromSet.has(id)) ||
    [...generatedFromSet].some((id) => !currentIds.has(id))
  );
}

const TenderSummaryTab: React.FC<Props> = ({ tender, onUpdated }) => {
  const [regenerate, { loading }] = Apollo.useMutation(REGENERATE_SUMMARY, {
    onCompleted: onUpdated,
  });

  const { jobSummary } = tender;
  const stale = jobSummary ? isStale(jobSummary, tender) : false;

  if (!jobSummary) {
    return (
      <VStack align="stretch" spacing={4} p={4}>
        <Text color="gray.500" fontSize="sm">
          No summary generated yet. Add documents and click Regenerate.
        </Text>
        <Button
          size="sm"
          colorScheme="blue"
          isLoading={loading}
          onClick={() => regenerate({ variables: { id: tender._id } })}
        >
          Generate Summary
        </Button>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={3} p={4}>
      <HStack justify="space-between" align="center">
        <Text fontSize="xs" color="gray.500">
          Generated {timeAgo(jobSummary.generatedAt)}
          {jobSummary.generatedBy === "manual" ? " (manual)" : ""}
        </Text>
        <Button
          size="xs"
          variant="outline"
          isLoading={loading}
          onClick={() => regenerate({ variables: { id: tender._id } })}
        >
          Regenerate
        </Button>
      </HStack>

      {stale && (
        <Box
          bg="yellow.50"
          border="1px solid"
          borderColor="yellow.300"
          borderRadius="md"
          px={3}
          py={2}
        >
          <Text fontSize="xs" color="yellow.800">
            New files or notes have been added since this summary was generated.
          </Text>
        </Box>
      )}

      {loading ? (
        <Box py={8} textAlign="center">
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.500" mt={2}>
            Generating summary...
          </Text>
        </Box>
      ) : (
        <Box
          fontSize="sm"
          sx={{
            "h2": { fontWeight: "semibold", fontSize: "sm", mt: 4, mb: 1 },
            "ul, ol": { pl: 4 },
            "li": { mb: 1 },
            "p": { mb: 2 },
          }}
        >
          <ReactMarkdown>{jobSummary.content}</ReactMarkdown>
        </Box>
      )}
    </VStack>
  );
};

export default TenderSummaryTab;
