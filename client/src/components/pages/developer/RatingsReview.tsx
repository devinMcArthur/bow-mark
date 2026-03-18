import React from "react";
import {
  Box,
  Flex,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Select,
  Text,
  Spinner,
  HStack,
  Input,
} from "@chakra-ui/react";
import { localStorageTokenKey } from "../../../contexts/Auth";

interface RatingItem {
  messageId: string;
  conversationId: string;
  context: string;
  contextType: "jobsite" | "tender" | null;
  userMessage: string;
  assistantMessage: string;
  rating: "up" | "down";
  reasons?: string[];
  comment?: string;
  ratedAt?: string;
  ratedByUserName: string;
}

const REASON_LABELS: Record<string, string> = {
  wrong_answer: "Wrong answer",
  hallucinated_citation: "Hallucinated citation",
  couldnt_find_it: "Couldn't find it",
  wrong_document: "Wrong document",
  too_vague: "Too vague",
  misunderstood_question: "Misunderstood question",
};

const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace("/graphql", "");

const RatingsReview: React.FC = () => {
  const [items, setItems] = React.useState<RatingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [ratingFilter, setRatingFilter] = React.useState<"" | "up" | "down">("");
  const [reasonFilter, setReasonFilter] = React.useState("");
  const [fromFilter, setFromFilter] = React.useState("");
  const [toFilter, setToFilter] = React.useState("");

  // Expanded row tracking
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchRatings = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (ratingFilter) params.set("rating", ratingFilter);
        if (reasonFilter) params.set("reason", reasonFilter);
        if (fromFilter) params.set("from", fromFilter);
        if (toFilter) params.set("to", toFilter);

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem(localStorageTokenKey)
            : null;

        const res = await fetch(
          `${serverBase}/api/developer/ratings?${params.toString()}`,
          { headers: { Authorization: token ?? "" } }
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        setItems(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRatings();
  }, [ratingFilter, reasonFilter, fromFilter, toFilter]);

  const upvotes = items.filter((i) => i.rating === "up").length;
  const downvotes = items.filter((i) => i.rating === "down").length;

  const reasonCounts = items
    .flatMap((i) => i.reasons ?? [])
    .reduce<Record<string, number>>((acc, r) => {
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {});

  return (
    <Box>
      <Heading size="md" mb={4}>
        Chat Ratings
      </Heading>

      {/* Summary bar */}
      <SimpleGrid columns={[2, 4]} spacing={4} mb={6}>
        <Stat>
          <StatLabel>Total</StatLabel>
          <StatNumber>{items.length}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Upvotes</StatLabel>
          <StatNumber color="green.500">{upvotes}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Downvotes</StatLabel>
          <StatNumber color="red.500">{downvotes}</StatNumber>
        </Stat>
        {Object.entries(reasonCounts).map(([reason, count]) => (
          <Stat key={reason}>
            <StatLabel fontSize="xs">{REASON_LABELS[reason] ?? reason}</StatLabel>
            <StatNumber>{count}</StatNumber>
          </Stat>
        ))}
      </SimpleGrid>

      {/* Filters */}
      <HStack mb={4} flexWrap="wrap" spacing={3}>
        <Select
          size="sm"
          w="160px"
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value as any)}
          placeholder="All ratings"
        >
          <option value="up">Upvotes</option>
          <option value="down">Downvotes</option>
        </Select>
        <Select
          size="sm"
          w="200px"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          placeholder="All reasons"
        >
          {Object.entries(REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          size="sm"
          type="date"
          w="160px"
          value={fromFilter}
          onChange={(e) => setFromFilter(e.target.value)}
          placeholder="From"
        />
        <Input
          size="sm"
          type="date"
          w="160px"
          value={toFilter}
          onChange={(e) => setToFilter(e.target.value)}
          placeholder="To"
        />
      </HStack>

      {loading && <Spinner />}
      {error && <Text color="red.500">{error}</Text>}

      {!loading && !error && (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Context</Th>
              <Th>Rating</Th>
              <Th>Reasons</Th>
              <Th>User</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((item) => {
              const rowKey = item.messageId;
              const isExpanded = expandedId === rowKey;
              return (
                <React.Fragment key={rowKey}>
                  <Tr
                    cursor="pointer"
                    _hover={{ bg: "gray.50" }}
                    onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                  >
                    <Td whiteSpace="nowrap" fontSize="xs" color="gray.500">
                      {item.ratedAt
                        ? new Date(item.ratedAt).toLocaleDateString()
                        : "—"}
                    </Td>
                    <Td>
                      <Text fontSize="sm">{item.context}</Text>
                      {item.contextType && (
                        <Badge fontSize="xs" colorScheme="gray">
                          {item.contextType}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <Badge colorScheme={item.rating === "up" ? "green" : "red"}>
                        {item.rating === "up" ? "👍" : "👎"}
                      </Badge>
                    </Td>
                    <Td>
                      <Flex flexWrap="wrap" gap={1}>
                        {(item.reasons ?? []).map((r) => (
                          <Badge key={r} fontSize="xs" colorScheme="orange">
                            {REASON_LABELS[r] ?? r}
                          </Badge>
                        ))}
                      </Flex>
                    </Td>
                    <Td fontSize="sm">{item.ratedByUserName}</Td>
                  </Tr>
                  {isExpanded && (
                    <Tr>
                      <Td colSpan={5} bg="gray.50" px={6} py={4}>
                        <Box mb={2}>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                            USER
                          </Text>
                          <Text fontSize="sm">{item.userMessage || "—"}</Text>
                        </Box>
                        <Box mb={item.comment ? 2 : 0}>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                            ASSISTANT
                          </Text>
                          <Text fontSize="sm" whiteSpace="pre-wrap">
                            {item.assistantMessage}
                          </Text>
                        </Box>
                        {item.comment && (
                          <Box>
                            <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                              COMMENT
                            </Text>
                            <Text fontSize="sm" fontStyle="italic">
                              {item.comment}
                            </Text>
                          </Box>
                        )}
                      </Td>
                    </Tr>
                  )}
                </React.Fragment>
              );
            })}
            {items.length === 0 && (
              <Tr>
                <Td colSpan={5} textAlign="center" color="gray.400" py={8}>
                  No ratings found
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      )}
    </Box>
  );
};

export default RatingsReview;
