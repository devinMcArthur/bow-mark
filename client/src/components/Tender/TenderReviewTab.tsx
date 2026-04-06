import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Badge,
  Button,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { FiChevronDown, FiEdit2, FiTrash2 } from "react-icons/fi";
import { gql, useQuery, useMutation } from "@apollo/client";

// Inline relative time — no external dependency, follows project pattern
const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// ─── GQL ─────────────────────────────────────────────────────────────────────

const TENDER_REVIEW_QUERY = gql`
  query TenderReview($tenderId: ID!) {
    tenderReview(tenderId: $tenderId) {
      _id
      status
      auditLog {
        _id
        rowId
        rowDescription
        action
        changedFields
        changedBy {
          _id
          name
        }
        changedAt
      }
      comments {
        _id
        content
        author {
          _id
          name
        }
        createdAt
        editedAt
      }
    }
  }
`;

const SET_STATUS = gql`
  mutation TenderReviewSetStatus($tenderId: ID!, $status: String!) {
    tenderReviewSetStatus(tenderId: $tenderId, status: $status) {
      _id
      status
    }
  }
`;

const ADD_COMMENT = gql`
  mutation TenderReviewAddComment($tenderId: ID!, $content: String!) {
    tenderReviewAddComment(tenderId: $tenderId, content: $content) {
      _id
      status
      auditLog {
        _id
        rowId
        rowDescription
        action
        changedFields
        changedBy { _id name }
        changedAt
      }
      comments {
        _id
        content
        author { _id name }
        createdAt
        editedAt
      }
    }
  }
`;

const EDIT_COMMENT = gql`
  mutation TenderReviewEditComment($tenderId: ID!, $commentId: ID!, $content: String!) {
    tenderReviewEditComment(tenderId: $tenderId, commentId: $commentId, content: $content) {
      _id
      comments {
        _id
        content
        author { _id name }
        createdAt
        editedAt
      }
    }
  }
`;

const DELETE_COMMENT = gql`
  mutation TenderReviewDeleteComment($tenderId: ID!, $commentId: ID!) {
    tenderReviewDeleteComment(tenderId: $tenderId, commentId: $commentId) {
      _id
      comments {
        _id
        content
        author { _id name }
        createdAt
        editedAt
      }
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewStatus = "draft" | "in_review" | "approved";

interface AuditEvent {
  __typename: "TenderAuditEventClass";
  _id: string;
  rowDescription: string;
  action: "row_added" | "row_deleted" | "row_updated";
  changedFields: string[];
  changedBy?: { _id: string; name: string } | null;
  changedAt: string;
}

interface ReviewComment {
  __typename: "TenderReviewCommentClass";
  _id: string;
  content: string;
  author?: { _id: string; name: string } | null;
  createdAt: string;
  editedAt?: string | null;
}

type TimelineItem =
  | { kind: "audit"; timestamp: Date; data: AuditEvent }
  | { kind: "comment"; timestamp: Date; data: ReviewComment };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ReviewStatus, string> = {
  draft: "gray",
  in_review: "blue",
  approved: "green",
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
};

const NEXT_STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: "Mark as In Review",
  in_review: "Mark as Approved",
  approved: "Back to Draft",
};

function buildActionLabel(event: AuditEvent): string {
  const actor = event.changedBy?.name ?? "Someone";
  if (event.action === "row_added") return `${actor} added row "${event.rowDescription}"`;
  if (event.action === "row_deleted") return `${actor} deleted row "${event.rowDescription}"`;
  const fields = event.changedFields.join(", ");
  return `${actor} updated "${event.rowDescription}" — ${fields}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const AuditEventItem: React.FC<{ event: AuditEvent }> = ({ event }) => (
  <Flex gap={2} align="flex-start" py={1}>
    <Box mt="5px" w="8px" h="8px" borderRadius="full" bg="gray.400" flexShrink={0} />
    <Box>
      <Text fontSize="sm" color="gray.700">{buildActionLabel(event)}</Text>
      <Text fontSize="xs" color="gray.400">
        {relativeTime(event.changedAt)}
      </Text>
    </Box>
  </Flex>
);

interface CommentItemProps {
  comment: ReviewComment;
  currentUserId?: string;
  tenderId: string;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, currentUserId, tenderId }) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const isOwn = currentUserId && comment.author?._id === currentUserId;

  const [editComment] = useMutation(EDIT_COMMENT);
  const [deleteComment] = useMutation(DELETE_COMMENT);

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await editComment({ variables: { tenderId, commentId: comment._id, content: editText.trim() } });
    setEditing(false);
  };

  return (
    <Box
      bg="gray.50"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      px={3}
      py={2}
      my={1}
    >
      <Flex justify="space-between" align="flex-start">
        <Text fontSize="xs" fontWeight="semibold" color="gray.600">
          {comment.author?.name ?? "Unknown"}
        </Text>
        {isOwn && !editing && (
          <HStack spacing={1}>
            <IconButton
              aria-label="Edit comment"
              icon={<FiEdit2 size={12} />}
              size="xs"
              variant="ghost"
              onClick={() => setEditing(true)}
            />
            <IconButton
              aria-label="Delete comment"
              icon={<FiTrash2 size={12} />}
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={() =>
                deleteComment({ variables: { tenderId, commentId: comment._id } })
              }
            />
          </HStack>
        )}
      </Flex>
      {editing ? (
        <VStack align="stretch" mt={1} spacing={1}>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            size="sm"
            rows={2}
          />
          <HStack>
            <Button size="xs" colorScheme="blue" onClick={handleSaveEdit}>Save</Button>
            <Button size="xs" variant="ghost" onClick={() => { setEditing(false); setEditText(comment.content); }}>Cancel</Button>
          </HStack>
        </VStack>
      ) : (
        <Text fontSize="sm" mt={1} whiteSpace="pre-wrap">{comment.content}</Text>
      )}
      <Text fontSize="xs" color="gray.400" mt={1}>
        {relativeTime(comment.createdAt)}
        {comment.editedAt && " (edited)"}
      </Text>
    </Box>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface TenderReviewTabProps {
  tenderId: string;
  currentUserId?: string;
}

const TenderReviewTab: React.FC<TenderReviewTabProps> = ({ tenderId, currentUserId }) => {
  const [commentText, setCommentText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, loading } = useQuery(TENDER_REVIEW_QUERY, { variables: { tenderId } });
  const [setStatus] = useMutation(SET_STATUS, {
    refetchQueries: [{ query: TENDER_REVIEW_QUERY, variables: { tenderId } }],
  });
  const [addComment, { loading: addingComment }] = useMutation(ADD_COMMENT, {
    refetchQueries: [{ query: TENDER_REVIEW_QUERY, variables: { tenderId } }],
  });

  const review = data?.tenderReview;
  const status: ReviewStatus = review?.status ?? "draft";

  // Build sorted timeline
  const timeline: TimelineItem[] = React.useMemo(() => {
    if (!review) return [];
    const items: TimelineItem[] = [
      ...(review.auditLog as AuditEvent[]).map((e: AuditEvent) => ({
        kind: "audit" as const,
        timestamp: new Date(e.changedAt),
        data: e,
      })),
      ...(review.comments as ReviewComment[]).map((c: ReviewComment) => ({
        kind: "comment" as const,
        timestamp: new Date(c.createdAt),
        data: c,
      })),
    ];
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [review]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline.length]);

  const handlePostComment = async () => {
    const content = commentText.trim();
    if (!content) return;
    setCommentText("");
    await addComment({ variables: { tenderId, content } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePostComment();
  };

  if (loading) {
    return (
      <Flex h="200px" align="center" justify="center">
        <Spinner />
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="100%" overflow="hidden">
      {/* Status bar */}
      <Flex
        px={4}
        py={2}
        borderBottom="1px solid"
        borderColor="gray.200"
        align="center"
        gap={3}
        flexShrink={0}
      >
        <Badge colorScheme={STATUS_COLORS[status]} fontSize="xs" px={2} py={1}>
          {STATUS_LABELS[status]}
        </Badge>
        <Menu>
          <MenuButton as={Button} size="xs" variant="outline" rightIcon={<FiChevronDown />}>
            {NEXT_STATUS_LABEL[status]}
          </MenuButton>
          <MenuList fontSize="sm">
            {(["draft", "in_review", "approved"] as ReviewStatus[]).map((s) => (
              <MenuItem
                key={s}
                onClick={() => setStatus({ variables: { tenderId, status: s } })}
                fontWeight={s === status ? "bold" : "normal"}
              >
                {STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </Flex>

      {/* Timeline */}
      <Box flex={1} overflowY="auto" px={4} py={3}>
        {timeline.length === 0 ? (
          <Text fontSize="sm" color="gray.400" textAlign="center" mt={8}>
            No activity yet — changes to this sheet will appear here.
          </Text>
        ) : (
          timeline.map((item) =>
            item.kind === "audit" ? (
              <AuditEventItem key={item.data._id} event={item.data} />
            ) : (
              <CommentItem
                key={item.data._id}
                comment={item.data}
                currentUserId={currentUserId}
                tenderId={tenderId}
              />
            )
          )
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Comment input */}
      <Box px={4} py={3} borderTop="1px solid" borderColor="gray.200" flexShrink={0}>
        <Flex gap={2} align="flex-end">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... (Cmd+Enter to post)"
            size="sm"
            rows={2}
            resize="none"
            flex={1}
          />
          <Button
            size="sm"
            colorScheme="blue"
            onClick={handlePostComment}
            isLoading={addingComment}
            isDisabled={!commentText.trim()}
          >
            Post
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
};

export default TenderReviewTab;
