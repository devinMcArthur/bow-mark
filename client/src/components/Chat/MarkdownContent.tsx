import React from "react";
import { Box, Code, Text } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// Convert single newlines to markdown hard breaks (two trailing spaces + newline)
// so user-typed Shift+Enter line breaks render correctly.
function preserveLineBreaks(text: string): string {
  return text.replace(/(?<! {2})\n/g, "  \n");
}
import { CopyableTable } from "./CopyableTable";
import { localStorageTokenKey } from "../../contexts/Auth";

interface MarkdownContentProps {
  content: string;
  onDocRefClick?: (enrichedFileId: string, page?: number) => void;
}

const MarkdownContent = ({ content, onDocRefClick }: MarkdownContentProps) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => (
        <Text fontSize="sm" lineHeight="1.7" mb={2}>{children}</Text>
      ),
      h1: ({ children }) => (
        <Text fontSize="lg" fontWeight="700" mb={2} mt={3}>{children}</Text>
      ),
      h2: ({ children }) => (
        <Text fontSize="md" fontWeight="700" mb={2} mt={3}>{children}</Text>
      ),
      h3: ({ children }) => (
        <Text fontSize="sm" fontWeight="700" mb={1} mt={2}>{children}</Text>
      ),
      ul: ({ children }) => (
        <Box as="ul" pl={5} mb={2} fontSize="sm" lineHeight="1.7">{children}</Box>
      ),
      ol: ({ children }) => (
        <Box as="ol" pl={5} mb={2} fontSize="sm" lineHeight="1.7">{children}</Box>
      ),
      li: ({ children }) => <Box as="li" mb={0.5}>{children}</Box>,
      code: ({ children, className, inline }: { children: React.ReactNode; className?: string; inline?: boolean }) =>
        !inline ? (
          <Code display="block" whiteSpace="pre" p={3} borderRadius="md" fontSize="xs" bg="gray.50" border="1px solid" borderColor="gray.200" overflowX="auto" mb={2} w="full">{children}</Code>
        ) : (
          <Code fontSize="xs" px={1} py={0.5} borderRadius="sm" bg="gray.100">{children}</Code>
        ),
      table: (props) => <CopyableTable {...props} />,
      thead: ({ children }) => <Box as="thead" bg="gray.50">{children}</Box>,
      th: ({ children }) => (
        <Box as="th" px={3} py={1.5} textAlign="left" fontWeight="600" borderBottom="2px solid" borderColor="gray.200" whiteSpace="nowrap">{children}</Box>
      ),
      td: ({ children }) => (
        <Box as="td" px={3} py={1.5} borderBottom="1px solid" borderColor="gray.100">{children}</Box>
      ),
      strong: ({ children }) => <Box as="strong" fontWeight="600">{children}</Box>,
      em: ({ children }) => <Box as="em" fontStyle="italic">{children}</Box>,
      hr: () => <Box borderTop="1px solid" borderColor="gray.200" my={3} />,
      blockquote: ({ children }) => (
        <Box borderLeft="3px solid" borderColor="blue.300" pl={3} py={0.5} my={2} color="gray.600">{children}</Box>
      ),
      a: ({ href, children }) => {
        // Document links — recognize both the canonical /api/documents/:id
        // path and the legacy /api/enriched-files/:id alias (historical chat
        // messages still contain the latter).
        const DOC_URL_RE = /\/api\/(?:documents|enriched-files)\/([a-f0-9]+)/;
        const isDocLink = !!href && DOC_URL_RE.test(href);

        if (isDocLink && onDocRefClick) {
          const match = href!.match(DOC_URL_RE);
          const pageMatch = href!.match(/#page=(\d+)/);
          if (match) {
            const fileId = match[1];
            const page = pageMatch ? parseInt(pageMatch[1], 10) : undefined;
            return (
              <Box
                as="span"
                color="blue.600"
                textDecoration="underline"
                cursor="pointer"
                _hover={{ color: "blue.800" }}
                onClick={(e: React.MouseEvent) => { e.preventDefault(); onDocRefClick(fileId, page); }}
              >
                {children}
              </Box>
            );
          }
        }
        // For document links without a handler, append the current JWT at render time
        // so links don't expire when the token baked into an old conversation ages out.
        let resolvedHref = href;
        if (isDocLink && typeof window !== "undefined") {
          const token = localStorage.getItem(localStorageTokenKey);
          if (token) {
            const url = new URL(href!, window.location.origin);
            url.searchParams.set("token", token);
            resolvedHref = url.toString();
          }
        }
        return (
          <Box
            as="a"
            href={resolvedHref}
            color="blue.600"
            textDecoration="underline"
            _hover={{ color: "blue.800" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </Box>
        );
      },
    }}
  >
    {preserveLineBreaks(content)}
  </ReactMarkdown>
);

export default MarkdownContent;
