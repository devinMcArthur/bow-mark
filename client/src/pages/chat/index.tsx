import React from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import NextLink from "next/link";
import {
  Badge,
  Box,
  Flex,
  Heading,
  IconButton,
  Spinner,
  Text,
  Tooltip,
  useMediaQuery,
  VStack,
} from "@chakra-ui/react";
import { FiMessageSquare } from "react-icons/fi";
import { navbarHeight } from "../../constants/styles";
import ChatPage from "../../components/Chat/ChatPage";
import Permission from "../../components/Common/Permission";
import { UserRoles } from "../../generated/graphql";
import { localStorageTokenKey } from "../../contexts/Auth";

interface ConversationContext {
  type: "jobsite" | "tender";
  id: string;
  name: string;
}

interface ConversationEntry {
  id: string;
  title: string;
  updatedAt: string;
  context?: ConversationContext;
}

function contextBadge(context?: ConversationContext) {
  if (!context) return null;
  const colorScheme = context.type === "jobsite" ? "blue" : "purple";
  const label = context.type === "jobsite" ? "Jobsite" : "Tender";
  return (
    <Badge colorScheme={colorScheme} fontSize="2xs" flexShrink={0}>
      {label}
    </Badge>
  );
}

function conversationHref(entry: ConversationEntry): string {
  if (entry.context?.type === "jobsite") {
    return `/jobsite/${entry.context.id}/chat?conversationId=${entry.id}`;
  }
  if (entry.context?.type === "tender") {
    return `/tender/${entry.context.id}/chat?conversationId=${entry.id}`;
  }
  return `/chat/${entry.id}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace(
  "/graphql",
  ""
);

const ChatHubPage: NextPage = () => {
  const router = useRouter();
  const [isDesktop] = useMediaQuery("(min-width: 768px)");
  const [conversations, setConversations] = React.useState<ConversationEntry[]>(
    []
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(localStorageTokenKey)
        : null;
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${serverBase}/conversations?scope=all`, {
      headers: { Authorization: token },
    })
      .then((r) => r.json())
      .then((data: ConversationEntry[]) => {
        setConversations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sidebar = (
    <Flex
      direction="column"
      w={isDesktop ? "280px" : "100%"}
      h={`calc(100vh - ${navbarHeight})`}
      borderRight={isDesktop ? "1px solid" : "none"}
      borderColor="gray.200"
      flexShrink={0}
    >
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Heading size="sm">Conversations</Heading>
        <Tooltip label="New chat">
          <IconButton
            aria-label="New chat"
            icon={<FiMessageSquare />}
            size="sm"
            variant="ghost"
            onClick={() => router.push("/chat/new")}
          />
        </Tooltip>
      </Flex>

      {/* List */}
      <Box overflowY="auto" flex={1}>
        {loading ? (
          <Flex justify="center" align="center" h="100px">
            <Spinner size="sm" />
          </Flex>
        ) : conversations.length === 0 ? (
          <Text fontSize="sm" color="gray.500" p={4} textAlign="center">
            No conversations yet
          </Text>
        ) : (
          <VStack spacing={0} align="stretch">
            {conversations.map((entry) => {
              const href = conversationHref(entry);
              return (
                <NextLink key={entry.id} href={href} passHref>
                  <Box
                    as="a"
                    px={4}
                    py={3}
                    _hover={{ bg: "gray.50" }}
                    cursor="pointer"
                    borderBottom="1px solid"
                    borderColor="gray.100"
                  >
                    <Flex align="center" gap={2} mb={1}>
                      {contextBadge(entry.context)}
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        noOfLines={1}
                        flex={1}
                      >
                        {entry.title || "Untitled"}
                      </Text>
                    </Flex>
                    <Flex justify="space-between" align="center">
                      {entry.context?.name ? (
                        <Text fontSize="xs" color="gray.500" noOfLines={1}>
                          {entry.context.name}
                        </Text>
                      ) : (
                        <Box />
                      )}
                      <Text fontSize="xs" color="gray.400" flexShrink={0}>
                        {formatDate(entry.updatedAt)}
                      </Text>
                    </Flex>
                  </Box>
                </NextLink>
              );
            })}
          </VStack>
        )}
      </Box>
    </Flex>
  );

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      {isDesktop ? (
        <Flex h={`calc(100vh - ${navbarHeight})`}>
          {sidebar}
          <Box flex={1} overflow="hidden">
            <ChatPage />
          </Box>
        </Flex>
      ) : (
        sidebar
      )}
    </Permission>
  );
};

export default ChatHubPage;
