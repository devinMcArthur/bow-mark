import React from "react";
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Textarea,
  Spinner,
  Text,
  VStack,
  Tooltip,
  useMediaQuery,
  Button,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { FiSend, FiPlus, FiArrowDown, FiMenu } from "react-icons/fi";
import Permission from "../Common/Permission";
import { SourcesDrawer } from "./SourcesDrawer";
import { UserRoles } from "../../generated/graphql";
import { localStorageTokenKey } from "../../contexts/Auth";
import { navbarHeight } from "../../constants/styles";
import { Role, ToolResult, ChatMessage, ConversationSummary } from "./types";
import MarkdownContent from "./MarkdownContent";
import ConversationItem from "./ConversationItem";

// ─── Pricing ──────────────────────────────────────────────────────────────────

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6":   { input: 5.00, output: 25.00 },
  "claude-sonnet-4-6": { input: 3.00, output: 15.00 },
  "claude-haiku-4-5":  { input: 1.00, output:  5.00 },
};

const ACTIVE_MODEL = "claude-opus-4-6";

function modelLabel(model: string): string {
  if (model.includes("opus")) return "Opus 4.6";
  if (model.includes("sonnet")) return "Sonnet 4.6";
  if (model.includes("haiku")) return "Haiku 4.5";
  return model;
}

function calcTotalCost(modelTokens: Record<string, { input: number; output: number }>): number {
  return Object.entries(modelTokens).reduce((sum, [model, tokens]) => {
    const rate = MODEL_RATES[model] ?? MODEL_RATES[ACTIVE_MODEL];
    return sum + (tokens.input / 1e6) * rate.input + (tokens.output / 1e6) * rate.output;
  }, 0);
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "How are we performing this year overall?",
  "Which jobsite has the highest net margin this year?",
  "What's our T/H compared to last year?",
  "Show me crew productivity rankings for 2025",
];

// ─── Chat Page ────────────────────────────────────────────────────────────────

interface ChatPageProps {
  initialConversationId?: string;
}

const ChatPage = ({ initialConversationId }: ChatPageProps) => {
  const router = useRouter();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(
    initialConversationId ?? null
  );
  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [modelTokens, setModelTokens] = React.useState<Record<string, { input: number; output: number }>>({});
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [sourcesMessage, setSourcesMessage] = React.useState<ChatMessage | null>(null);
  const [isDesktop] = useMediaQuery("(min-width: 640px)");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isAtBottomRef = React.useRef(true);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows
  React.useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [input]);

  const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace("/graphql", "");
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;

  // Load conversation list on mount
  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${serverBase}/conversations`, {
          headers: { Authorization: getToken() ?? "" },
        });
        if (res.ok) setConversations(await res.json());
      } catch {}
    };
    load();
  }, []);

  const loadConversation = React.useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`${serverBase}/conversations/${id}`, {
          headers: { Authorization: getToken() ?? "" },
        });
        if (!res.ok) return;
        const data = await res.json();
        setConversationId(data.id);
        // Build per-model token totals from persisted per-message counts
        const perModel: Record<string, { input: number; output: number }> = {};
        for (const m of data.messages) {
          if (m.model && m.inputTokens != null) {
            perModel[m.model] = {
              input: (perModel[m.model]?.input ?? 0) + m.inputTokens,
              output: (perModel[m.model]?.output ?? 0) + (m.outputTokens ?? 0),
            };
          }
        }
        // Fall back to conversation-level totals attributed to stored model
        if (Object.keys(perModel).length === 0) {
          const storedModel = data.model ?? ACTIVE_MODEL;
          perModel[storedModel] = { input: data.totalInputTokens, output: data.totalOutputTokens };
        }
        setModelTokens(perModel);
        isAtBottomRef.current = true;
        setMessages(
          data.messages.map((m: { role: Role; content: string; model?: string; toolResults?: ToolResult[] }) => ({
            id: genId(),
            role: m.role,
            content: m.content,
            model: m.model,
            toolResults: m.toolResults,
          }))
        );
      } catch {}
    },
    [serverBase]
  );

  // Load conversation when URL param changes
  React.useEffect(() => {
    if (initialConversationId) {
      isAtBottomRef.current = true;
      setMessages([]);
      setModelTokens({});
      loadConversation(initialConversationId);
    }
  }, [initialConversationId, loadConversation]);

  // With flex-direction:column-reverse, scrollTop=0 is the visual bottom.
  // Keep it pinned to 0 during streaming when the user hasn't scrolled up.
  React.useLayoutEffect(() => {
    if (isAtBottomRef.current) {
      const el = scrollContainerRef.current;
      // Some browsers use negative scrollTop for reversed containers; reset to 0 either way.
      if (el && Math.abs(el.scrollTop) > 1) el.scrollTop = 0;
    }
  }, [messages]);

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setModelTokens({});
    if (router.pathname !== "/chat") {
      router.push("/chat");
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const renameConversation = async (id: string, title: string) => {
    try {
      const res = await fetch(`${serverBase}/conversations/${id}/title`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: getToken() ?? "",
        },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c))
        );
      }
    } catch {}
  };

  const deleteConversation = async (id: string) => {
    try {
      const res = await fetch(`${serverBase}/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: getToken() ?? "" },
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (conversationId === id) startNewChat();
      }
    } catch {}
  };

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

      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const assistantId = genId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", toolCalls: [], isStreaming: true },
      ]);

      try {
        const token = getToken();
        const body: Record<string, unknown> = { messages: history };
        if (conversationId) body.conversationId = conversationId;

        const response = await fetch(`${serverBase}/api/chat/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ?? "",
          },
          body: JSON.stringify(body),
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
        // Track the new conversation id received mid-stream for title event matching
        let currentConvoId = conversationId;

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
                result?: string;
                message?: string;
                id?: string;
                inputTokens?: number;
                outputTokens?: number;
                model?: string;
                title?: string;
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
              } else if (event.type === "tool_result" && event.toolName) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolResults: [
                            ...(m.toolResults ?? []),
                            { toolName: event.toolName!, result: event.result ?? "" },
                          ],
                        }
                      : m
                  )
                );
              } else if (event.type === "conversation_id" && event.id) {
                currentConvoId = event.id;
                setConversationId(event.id);
                // Update URL without triggering a navigation/re-render mid-stream
                window.history.replaceState({}, "", `/chat/${event.id}`);
                setConversations((prev) => [
                  {
                    id: event.id!,
                    title: "New conversation",
                    model: ACTIVE_MODEL,
                    totalInputTokens: 0,
                    totalOutputTokens: 0,
                    updatedAt: new Date().toISOString(),
                  },
                  ...prev,
                ]);
              } else if (event.type === "usage") {
                const usageModel = event.model ?? ACTIVE_MODEL;
                // Tag the assistant message with the model that generated it
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, model: usageModel } : m
                  )
                );
                // Accumulate per-model token counts for accurate cost
                setModelTokens((prev) => ({
                  ...prev,
                  [usageModel]: {
                    input: (prev[usageModel]?.input ?? 0) + (event.inputTokens ?? 0),
                    output: (prev[usageModel]?.output ?? 0) + (event.outputTokens ?? 0),
                  },
                }));
                if (currentConvoId) {
                  setConversations((prev) => {
                    const updated = prev.map((c) =>
                      c.id === currentConvoId
                        ? {
                            ...c,
                            totalInputTokens: c.totalInputTokens + (event.inputTokens ?? 0),
                            totalOutputTokens: c.totalOutputTokens + (event.outputTokens ?? 0),
                            updatedAt: new Date().toISOString(),
                          }
                        : c
                    );
                    return updated.sort(
                      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    );
                  });
                }
              } else if (event.type === "title" && event.title && currentConvoId) {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === currentConvoId ? { ...c, title: event.title! } : c
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
    [messages, loading, conversationId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isEmpty = messages.length === 0;
  const cost = calcTotalCost(modelTokens);
  const totalInputTokens = Object.values(modelTokens).reduce((s, t) => s + t.input, 0);
  const totalOutputTokens = Object.values(modelTokens).reduce((s, t) => s + t.output, 0);

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Flex h={`calc(100vh - ${navbarHeight})`} overflow="hidden" w="100%">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        {/* Mobile backdrop */}
        {!isDesktop && sidebarOpen && (
          <Box
            position="absolute"
            inset={0}
            bg="blackAlpha.400"
            zIndex={10}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Flex
          direction="column"
          w="240px"
          flexShrink={0}
          bg="white"
          borderRight="1px solid"
          borderColor="gray.200"
          position={isDesktop ? "relative" : "absolute"}
          top={0}
          left={0}
          h="100%"
          zIndex={isDesktop ? undefined : 11}
          transform={isDesktop || sidebarOpen ? "translateX(0)" : "translateX(-100%)"}
          transition="transform 0.2s ease"
        >
          <Box px={3} py={3} borderBottom="1px solid" borderColor="gray.100">
            <Button
              leftIcon={<FiPlus />}
              size="sm"
              w="full"
              variant="outline"
              colorScheme="blue"
              onClick={() => { startNewChat(); setSidebarOpen(false); }}
            >
              New Chat
            </Button>
          </Box>
          <Box flex={1} overflowY="auto" px={2} py={2}>
            <VStack spacing={1} align="stretch">
              {conversations.map((c) => (
                <ConversationItem
                  key={c.id}
                  convo={c}
                  isActive={c.id === conversationId}
                  onSelect={() => {
                    router.push(`/chat/${c.id}`);
                    setSidebarOpen(false);
                  }}
                  onRename={(title) => renameConversation(c.id, title)}
                  onDelete={() => deleteConversation(c.id)}
                />
              ))}
            </VStack>
          </Box>
        </Flex>

        {/* ── Chat area ───────────────────────────────────────────────────── */}
        <Flex direction="column" flex={1} bg="gray.50" overflow="hidden" position="relative">
          {/* Header */}
          <Box
            px={6}
            py={3}
            bg="white"
            borderBottom="1px solid"
            borderColor="gray.200"
            flexShrink={0}
          >
            <HStack spacing={3} justify="space-between">
              <HStack spacing={3}>
                {!isDesktop && (
                  <IconButton
                    aria-label="Open conversations"
                    icon={<FiMenu />}
                    size="sm"
                    variant="ghost"
                    onClick={() => setSidebarOpen(true)}
                  />
                )}
                <Box w={2} h={2} borderRadius="full" bg="green.400" />
                <Text fontSize="sm" fontWeight="600" color="gray.700" letterSpacing="wide" noOfLines={1}>
                  {conversationId
                    ? (conversations.find((c) => c.id === conversationId)?.title ?? "Analytics Assistant")
                    : "Analytics Assistant"}
                </Text>
                {isDesktop && (
                  <Text fontSize="xs" color="gray.400">
                    Powered by Claude
                  </Text>
                )}
              </HStack>
              {(totalInputTokens > 0 || totalOutputTokens > 0) && (
                <Tooltip
                  label={[
                    `${totalInputTokens.toLocaleString()} in + ${totalOutputTokens.toLocaleString()} out tokens`,
                    ...Object.entries(modelTokens).map(
                      ([m, t]) =>
                        `${modelLabel(m)}: ${t.input.toLocaleString()} in / ${t.output.toLocaleString()} out`
                    ),
                  ].join("\n")}
                  placement="bottom"
                  whiteSpace="pre"
                >
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    bg="gray.100"
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    fontFamily="mono"
                    cursor="default"
                  >
                    ~${cost.toFixed(4)}
                  </Text>
                </Tooltip>
              )}
            </HStack>
          </Box>

          {/* Empty state — rendered outside the scroll container so it isn't affected
              by flex-direction:column-reverse and appears naturally at the top */}
          {isEmpty && (
            <Box flex={1} overflowY="auto" px={6} py={6}>
              <VStack spacing={6} mt={16} align="center">
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="700" color="gray.700">
                    Ask about jobsite performance
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Query revenue, productivity, crew benchmarks, and more
                  </Text>
                </VStack>
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
            </Box>
          )}

          {/* Messages scroll area — flex-direction:column-reverse anchors content to the
              bottom so scrollTop=0 always shows the latest messages. No JS scroll needed
              on conversation load; overflow-anchor:none prevents browser interference
              during streaming. */}
          {!isEmpty && (
            <Box
              ref={scrollContainerRef}
              flex={1}
              overflowY="auto"
              display="flex"
              flexDirection="column-reverse"
              sx={{ overflowAnchor: "none" }}
              onScroll={() => {
                const el = scrollContainerRef.current;
                if (!el) return;
                // scrollTop=0 is visual bottom. Some browsers use negative scrollTop
                // for reversed containers, so use Math.abs.
                const atBottom = Math.abs(el.scrollTop) < 100;
                isAtBottomRef.current = atBottom;
                setShowScrollButton(!atBottom);
              }}
            >
              <Box px={6} py={6}>
                <VStack spacing={4} align="stretch">
                  {messages.map((msg) => (
                    <Box key={msg.id} alignSelf={msg.role === "user" ? "flex-end" : "flex-start"} maxW="85%">
                      {msg.role === "user" ? (
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
                        <Box>
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <HStack spacing={1} mb={2} flexWrap="wrap">
                              {Array.from(new Set(msg.toolCalls)).map((tool) => (
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
                                <MarkdownContent content={msg.content} />
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
                                {msg.model && !msg.isStreaming && (
                                  <Text
                                    fontSize="10px"
                                    color="gray.400"
                                    textAlign="right"
                                    mt={1}
                                    fontFamily="mono"
                                  >
                                    {modelLabel(msg.model)}
                                  </Text>
                                )}
                              </>
                            )}
                          </Box>
                          {msg.toolResults && msg.toolResults.length > 0 && (
                            <Button
                              variant="ghost"
                              size="xs"
                              mt={1}
                              color="gray.500"
                              fontWeight="normal"
                              onClick={() => setSourcesMessage(msg)}
                            >
                              Sources ({msg.toolResults.length})
                            </Button>
                          )}
                        </Box>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Box>
            </Box>
          )}

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <Box position="absolute" bottom="80px" left="50%" transform="translateX(-50%)">
              <IconButton
                aria-label="Scroll to bottom"
                icon={<FiArrowDown />}
                size="sm"
                borderRadius="full"
                colorScheme="blue"
                shadow="md"
                onClick={() => {
                  const el = scrollContainerRef.current;
                  if (el) el.scrollTo({ top: 0, behavior: "smooth" });
                  isAtBottomRef.current = true;
                  setShowScrollButton(false);
                }}
              />
            </Box>
          )}

          {/* Input area */}
          <Box
            bg="white"
            borderTop="1px solid"
            borderColor="gray.200"
            px={6}
            py={4}
            flexShrink={0}
          >
            <form onSubmit={handleSubmit}>
                <HStack spacing={2}>
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(input);
                      }
                    }}
                    placeholder="Ask about jobsite performance, revenue, productivity..."
                    size="md"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.300"
                    _focus={{ borderColor: "blue.400", bg: "white", boxShadow: "none" }}
                    _placeholder={{ color: "gray.400", fontSize: "sm" }}
                    disabled={loading}
                    autoFocus
                    rows={1}
                    resize="none"
                    overflow="hidden"
                    minH="unset"
                    lineHeight="short"
                    py="9px"
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
        </Flex>
      </Flex>
      <Drawer
        isOpen={sourcesMessage !== null}
        placement="right"
        onClose={() => setSourcesMessage(null)}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Sources</DrawerHeader>
          <DrawerBody>
            <SourcesDrawer message={sourcesMessage} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Permission>
  );
};

export default ChatPage;
