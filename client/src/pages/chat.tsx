import React from "react";
import {
  Box,
  Code,
  Flex,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  VStack,
  Tooltip,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverFooter,
  Button,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NextPage } from "next";
import { FiSend, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import Permission from "../components/Common/Permission";
import { UserRoles } from "../generated/graphql";
import { localStorageTokenKey } from "../contexts/Auth";
import { navbarHeight } from "../constants/styles";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: string[];
  isStreaming?: boolean;
}

interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  updatedAt: string;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6":   { input: 5.00, output: 25.00 },
  "claude-sonnet-4-6": { input: 3.00, output: 15.00 },
  "claude-haiku-4-5":  { input: 1.00, output:  5.00 },
};

const ACTIVE_MODEL = "claude-opus-4-6";

function calcCost(inputTokens: number, outputTokens: number, model: string): number {
  const rate = MODEL_RATES[model] ?? MODEL_RATES["claude-opus-4-6"];
  return (inputTokens / 1e6) * rate.input + (outputTokens / 1e6) * rate.output;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

const MarkdownContent = ({ content }: { content: string }) => (
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
      table: ({ children }) => (
        <Box overflowX="auto" mb={2}>
          <Box as="table" w="full" fontSize="sm" sx={{ borderCollapse: "collapse" }}>{children}</Box>
        </Box>
      ),
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
      a: ({ href, children }) => (
        <Box
          as="a"
          href={href}
          color="blue.600"
          textDecoration="underline"
          _hover={{ color: "blue.800" }}
          target={href?.startsWith("/") ? "_self" : "_blank"}
          rel={href?.startsWith("/") ? undefined : "noopener noreferrer"}
        >
          {children}
        </Box>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "How are we performing this year overall?",
  "Which jobsite has the highest net margin this year?",
  "What's our T/H compared to last year?",
  "Show me crew productivity rankings for 2025",
];

// ─── Sidebar conversation item ────────────────────────────────────────────────

const ConversationItem = ({
  convo,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  convo: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) => {
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(convo.title);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { isOpen: deleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure();

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(convo.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== convo.title) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <Box
      px={3}
      py={2}
      borderRadius="md"
      bg={isActive ? "blue.50" : "transparent"}
      border="1px solid"
      borderColor={isActive ? "blue.200" : "transparent"}
      cursor="pointer"
      _hover={{ bg: isActive ? "blue.50" : "gray.100" }}
      onClick={onSelect}
      role="group"
      position="relative"
    >
      {editing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          size="xs"
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <>
          <Text fontSize="xs" fontWeight="500" color="gray.700" noOfLines={1}>
            {convo.title}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={0.5}>
            {relativeTime(convo.updatedAt)}
          </Text>
          <HStack
            spacing={1}
            position="absolute"
            right={2}
            top="50%"
            transform="translateY(-50%)"
            opacity={0}
            _groupHover={{ opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip label="Rename" placement="top" hasArrow>
              <IconButton
                aria-label="Rename"
                icon={<FiEdit2 />}
                size="xs"
                variant="ghost"
                onClick={startEdit}
              />
            </Tooltip>
            <Popover isOpen={deleteOpen} onClose={closeDelete} placement="right">
              <PopoverTrigger>
                <IconButton
                  aria-label="Delete"
                  icon={<FiTrash2 />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={openDelete}
                />
              </PopoverTrigger>
              <PopoverContent w="200px">
                <PopoverBody>
                  <Text fontSize="xs">Delete this conversation?</Text>
                </PopoverBody>
                <PopoverFooter>
                  <HStack spacing={2}>
                    <Button size="xs" variant="ghost" onClick={closeDelete}>Cancel</Button>
                    <Button
                      size="xs"
                      colorScheme="red"
                      onClick={() => { closeDelete(); onDelete(); }}
                    >
                      Delete
                    </Button>
                  </HStack>
                </PopoverFooter>
              </PopoverContent>
            </Popover>
          </HStack>
        </>
      )}
    </Box>
  );
};

// ─── Chat Page ────────────────────────────────────────────────────────────────

const ChatPage: NextPage = () => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [conversationModel, setConversationModel] = React.useState(ACTIVE_MODEL);
  const [inputTokens, setInputTokens] = React.useState(0);
  const [outputTokens, setOutputTokens] = React.useState(0);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

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

  // Scroll to bottom whenever messages update
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setConversationModel(ACTIVE_MODEL);
    setInputTokens(0);
    setOutputTokens(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`${serverBase}/conversations/${id}`, {
        headers: { Authorization: getToken() ?? "" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversationId(data.id);
      setConversationModel(data.model ?? ACTIVE_MODEL);
      setInputTokens(data.totalInputTokens);
      setOutputTokens(data.totalOutputTokens);
      setMessages(
        data.messages.map((m: { role: Role; content: string }) => ({
          id: genId(),
          role: m.role,
          content: m.content,
        }))
      );
    } catch {}
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

        const response = await fetch(`${serverBase}/chat`, {
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
                message?: string;
                id?: string;
                inputTokens?: number;
                outputTokens?: number;
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
              } else if (event.type === "conversation_id" && event.id) {
                currentConvoId = event.id;
                setConversationId(event.id);
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
                setInputTokens((prev) => prev + (event.inputTokens ?? 0));
                setOutputTokens((prev) => prev + (event.outputTokens ?? 0));
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
  const cost = calcCost(inputTokens, outputTokens, conversationModel);

  return (
    <Permission minRole={UserRoles.Admin} type={null} showError>
      <Flex h={`calc(100vh - ${navbarHeight})`} overflow="hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <Flex
          direction="column"
          w="240px"
          flexShrink={0}
          bg="white"
          borderRight="1px solid"
          borderColor="gray.200"
          overflow="hidden"
        >
          <Box px={3} py={3} borderBottom="1px solid" borderColor="gray.100">
            <Button
              leftIcon={<FiPlus />}
              size="sm"
              w="full"
              variant="outline"
              colorScheme="blue"
              onClick={startNewChat}
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
                  onSelect={() => loadConversation(c.id)}
                  onRename={(title) => renameConversation(c.id, title)}
                  onDelete={() => deleteConversation(c.id)}
                />
              ))}
            </VStack>
          </Box>
        </Flex>

        {/* ── Chat area ───────────────────────────────────────────────────── */}
        <Flex direction="column" flex={1} bg="gray.50" overflow="hidden">
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
                <Box w={2} h={2} borderRadius="full" bg="green.400" />
                <Text fontSize="sm" fontWeight="600" color="gray.700" letterSpacing="wide">
                  Analytics Assistant
                </Text>
                <Text fontSize="xs" color="gray.400">
                  Powered by Claude
                </Text>
              </HStack>
              {(inputTokens > 0 || outputTokens > 0) && (
                <Tooltip
                  label={`${inputTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output tokens`}
                  placement="bottom"
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

          {/* Messages area */}
          <Box flex={1} overflowY="auto" px={4} py={6}>
            <Box maxW="800px" mx="auto">
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
      </Flex>
    </Permission>
  );
};

export default ChatPage;
