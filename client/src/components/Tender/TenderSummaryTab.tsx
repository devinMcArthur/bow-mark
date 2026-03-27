import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  HStack,
  IconButton,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import React from "react";
import { FiRefreshCw } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import { TenderDetail, TenderJobSummary, timeAgo } from "./types";

// Split markdown into an opening paragraph and named sections (## headings).
function parseSections(content: string): { intro: string; sections: { title: string; body: string }[] } {
  const parts = content.split(/^## /m);
  const intro = parts[0].trim();
  const sections = parts.slice(1).map((part) => {
    const newline = part.indexOf("\n");
    const title = newline === -1 ? part.trim() : part.slice(0, newline).trim();
    const body = newline === -1 ? "" : part.slice(newline + 1).trim();
    return { title, body };
  });
  return { intro, sections };
}

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
    Array.from(currentIds).some((id) => !generatedFromSet.has(id)) ||
    Array.from(generatedFromSet).some((id) => !currentIds.has(id))
  );
}

const TenderSummaryTab: React.FC<Props> = ({ tender, onUpdated }) => {
  const [regenerate, { loading: mutationLoading }] = Apollo.useMutation(REGENERATE_SUMMARY, {
    onCompleted: onUpdated,
  });

  const { jobSummary, summaryGenerating } = tender;
  const loading = mutationLoading || summaryGenerating;
  const stale = jobSummary ? isStale(jobSummary, tender) : false;

  if (!jobSummary && !summaryGenerating) {
    return (
      <VStack align="stretch" spacing={4} p={4}>
        <Text color="gray.500" fontSize="sm">
          No summary generated yet. Add documents and click Generate.
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
          {summaryGenerating
            ? "Generating summary…"
            : jobSummary
            ? `Generated ${timeAgo(jobSummary.generatedAt)}${jobSummary.generatedBy === "manual" ? " (manual)" : ""}`
            : ""}
        </Text>
        <IconButton
          aria-label="Regenerate summary"
          icon={<FiRefreshCw />}
          size="xs"
          variant="outline"
          isLoading={loading}
          isDisabled={loading}
          onClick={() => regenerate({ variables: { id: tender._id } })}
        />
      </HStack>

      {stale && !summaryGenerating && (
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

      {loading && !jobSummary ? (
        <Box py={8} textAlign="center">
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.500" mt={2}>
            Generating summary…
          </Text>
        </Box>
      ) : (() => {
        const { intro, sections } = parseSections(jobSummary.content);
        return (
          <VStack align="stretch" spacing={2}>
            {intro && (
              <Box
                fontSize="sm"
                sx={{ "p": { mb: 2 }, "ul, ol": { pl: 4 }, "li": { mb: 1 } }}
              >
                <ReactMarkdown>{intro}</ReactMarkdown>
              </Box>
            )}
            {sections.length > 0 && (
              <Accordion allowMultiple defaultIndex={[]}>
                {sections.map((section) => (
                  <AccordionItem key={section.title} border="none">
                    <AccordionButton px={0} py={1} _hover={{ bg: "transparent" }}>
                      <Box flex={1} textAlign="left" fontWeight="semibold" fontSize="sm">
                        {section.title}
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel px={0} pb={2}>
                      <Box
                        fontSize="sm"
                        sx={{ "p": { mb: 2 }, "ul, ol": { pl: 4 }, "li": { mb: 1 } }}
                      >
                        <ReactMarkdown>{section.body}</ReactMarkdown>
                      </Box>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </VStack>
        );
      })()}
    </VStack>
  );
};

export default TenderSummaryTab;
