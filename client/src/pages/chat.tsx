import React from "react";
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { NextPage } from "next";
import { FiSend } from "react-icons/fi";
import Permission from "../components/Common/Permission";
import { UserRoles } from "../generated/graphql";
import { localStorageTokenKey } from "../contexts/Auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: string[]; // tool names that were called
  isStreaming?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Render assistant text preserving newlines and simple indentation */
const renderText = (text: string) =>
  text.split("\n").map((line, i) => (
    <Text
      key={i}
      fontFamily={line.startsWith("  ") || line.startsWith("\t") ? "mono" : "inherit"}
      fontSize="sm"
      whiteSpace="pre-wrap"
      lineHeight="1.7"
      mb={line === "" ? 2 : 0}
    >
      {line || "\u00A0"}
    </Text>
  ));

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "How are we performing this year overall?",
  "Which jobsite has the highest net margin this year?",
  "What's our T/H compared to last year?",
  "Show me crew productivity rankings for 2025",
];

// ─── Chat Page ────────────────────────────────────────────────────────────────

const ChatPage: NextPage = () => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages update
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = React.useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMessage: ChatMessage = {
        id: genId(),
        role: "user",
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      // Build history for API (exclude streaming state)
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Create placeholder assistant message
      const assistantId = genId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", toolCalls: [], isStreaming: true },
      ]);

      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ?? "",
          },
          body: JSON.stringify({ messages: history }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Request failed" }));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${err.error || "Request failed"}`, isStreaming: false }
                : m
            )
          );
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw) as {
                type: string;
                delta?: string;
                toolName?: string;
                message?: string;
              };

              if (event.type === "text_delta" && event.delta) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.delta }
                      : m
                  )
                );
              } else if (event.type === "tool_call" && event.toolName) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...(m.toolCalls ?? []), event.toolName!] }
                      : m
                  )
                );
              } else if (event.type === "done" || event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          isStreaming: false,
                          content:
                            event.type === "error"
                              ? `Error: ${event.message || "Unknown error"}`
                              : m.content,
                        }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed events
            }
          }
        }

        // Ensure streaming flag cleared
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [messages, loading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isEmpty = messages.length === 0;

  return (
    <Permission minRole={UserRoles.Admin} type={null} showError>
      <Flex direction="column" h="100vh" bg="gray.50">
        {/* Header */}
        <Box
          px={6}
          py={3}
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.200"
          flexShrink={0}
        >
          <HStack spacing={3}>
            <Box w={2} h={2} borderRadius="full" bg="green.400" />
            <Text fontSize="sm" fontWeight="600" color="gray.700" letterSpacing="wide">
              Analytics Assistant
            </Text>
            <Text fontSize="xs" color="gray.400">
              Powered by Claude
            </Text>
          </HStack>
        </Box>

        {/* Messages area */}
        <Box flex={1} overflowY="auto" px={4} py={6}>
          <Box maxW="800px" mx="auto">
            {/* Empty state */}
            {isEmpty && (
              <VStack spacing={6} mt={16} align="center">
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="700" color="gray.700">
                    Ask about jobsite performance
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Query revenue, productivity, crew benchmarks, and more
                  </Text>
                </VStack>

                {/* Suggestion chips */}
                <VStack spacing={2} align="stretch" w="full" maxW="520px">
                  {SUGGESTIONS.map((s) => (
                    <Box
                      key={s}
                      as="button"
                      onClick={() => sendMessage(s)}
                      px={4}
                      py={3}
                      bg="white"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      textAlign="left"
                      fontSize="sm"
                      color="gray.700"
                      _hover={{ borderColor: "blue.400", bg: "blue.50", color: "blue.700" }}
                      transition="all 0.15s"
                      cursor="pointer"
                    >
                      {s}
                    </Box>
                  ))}
                </VStack>
              </VStack>
            )}

            {/* Message list */}
            <VStack spacing={4} align="stretch">
              {messages.map((msg) => (
                <Box key={msg.id} alignSelf={msg.role === "user" ? "flex-end" : "flex-start"} maxW="85%">
                  {msg.role === "user" ? (
                    /* User bubble */
                    <Box
                      bg="blue.600"
                      color="white"
                      px={4}
                      py={3}
                      borderRadius="lg"
                      borderBottomRightRadius="sm"
                    >
                      <Text fontSize="sm" lineHeight="1.6">
                        {msg.content}
                      </Text>
                    </Box>
                  ) : (
                    /* Assistant message */
                    <Box>
                      {/* Tool call badges */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <HStack spacing={1} mb={2} flexWrap="wrap">
                          {[...new Set(msg.toolCalls)].map((tool) => (
                            <Box
                              key={tool}
                              px={2}
                              py={0.5}
                              bg="gray.100"
                              borderRadius="sm"
                              fontSize="xs"
                              color="gray.500"
                              fontFamily="mono"
                            >
                              {tool}
                            </Box>
                          ))}
                        </HStack>
                      )}

                      <Box
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        px={4}
                        py={3}
                        borderRadius="lg"
                        borderBottomLeftRadius="sm"
                        shadow="sm"
                      >
                        {msg.isStreaming && msg.content === "" ? (
                          /* Initial loading state */
                          <HStack spacing={2}>
                            <Spinner size="xs" color="blue.400" />
                            <Text fontSize="sm" color="gray.400">
                              {msg.toolCalls && msg.toolCalls.length > 0
                                ? "Querying database..."
                                : "Thinking..."}
                            </Text>
                          </HStack>
                        ) : (
                          <>
                            {renderText(msg.content)}
                            {msg.isStreaming && (
                              <Box
                                display="inline-block"
                                w="2px"
                                h="14px"
                                bg="blue.500"
                                ml={0.5}
                                verticalAlign="middle"
                                animation="blink 1s step-end infinite"
                                sx={{
                                  "@keyframes blink": {
                                    "0%, 100%": { opacity: 1 },
                                    "50%": { opacity: 0 },
                                  },
                                }}
                              />
                            )}
                          </>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </VStack>

            <Box ref={bottomRef} />
          </Box>
        </Box>

        {/* Input area */}
        <Box
          bg="white"
          borderTop="1px solid"
          borderColor="gray.200"
          px={4}
          py={4}
          flexShrink={0}
        >
          <Box maxW="800px" mx="auto">
            <form onSubmit={handleSubmit}>
              <HStack spacing={2}>
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about jobsite performance, revenue, productivity..."
                  size="md"
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.300"
                  _focus={{ borderColor: "blue.400", bg: "white", boxShadow: "none" }}
                  _placeholder={{ color: "gray.400", fontSize: "sm" }}
                  disabled={loading}
                  autoFocus
                />
                <IconButton
                  type="submit"
                  aria-label="Send"
                  icon={<FiSend />}
                  colorScheme="blue"
                  isLoading={loading}
                  isDisabled={!input.trim()}
                  size="md"
                />
              </HStack>
            </form>
          </Box>
        </Box>
      </Flex>
    </Permission>
  );
};

export default ChatPage;
