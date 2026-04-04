# Chat Navigation & Access Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chat accessible from the jobsite and daily report pages, fix the jobsite chat page for mobile, and unify the `/chat` page into a hub showing all conversations across all contexts.

**Architecture:** Four independent pieces of work: (1) add a chat icon to the jobsite page header linking to `/jobsite/[id]/chat`; (2) make the jobsite chat page responsive by collapsing the left panel into a toggle on mobile; (3) add a full-screen chat drawer to the daily report page scoped to the jobsite's conversations; (4) add a server endpoint for all-contexts conversations and redesign `/chat` as a unified hub.

**Tech Stack:** Next.js 12, React 17, Chakra UI, Apollo Client, TypeScript, Express REST API, MongoDB/Mongoose

---

## Codebase Context

### Key patterns
- **`ChatPage` component** (`client/src/components/Chat/ChatPage.tsx`) — fully self-contained chat UI. Props: `messageEndpoint`, `conversationsEndpoint`, `extraPayload`, `suggestions`, `disableRouting`, `initialConversationId`. Already handles mobile via `useMediaQuery` for its own sidebar.
- **`Permission` component** — gates content by `minRole`. `UserRoles.User = 1`, `UserRoles.ProjectManager = 2`, `UserRoles.Admin = 3`.
- **`navbarHeight`** — imported from `client/src/constants/styles`.
- **Conversations API** (`server/src/router/conversations.ts`) — `GET /conversations?jobsiteId=X` returns jobsite-scoped conversations; no param returns general only.
- **Jobsite chat router** (`server/src/router/jobsite-chat.ts`) — `POST /api/jobsite-chat/message`.

### Files to create
- `client/src/components/DailyReport/DailyReportChatDrawer.tsx` — chat drawer for the daily report page

### Files to modify
- `client/src/components/pages/jobsite/id/ClientContent.tsx` — add chat icon button
- `client/src/pages/jobsite/[id]/chat.tsx` — fix mobile layout
- `client/src/components/pages/daily-reports/id/ClientContent.tsx` — wire in drawer
- `server/src/router/conversations.ts` — add `?scope=all` support with context population
- `client/src/pages/chat/index.tsx` — replace thin wrapper with full hub page
- `client/src/pages/chat/[conversationId].tsx` — update to handle jobsite/tender routing

---

## Chunk 1: Jobsite entry point + mobile fix

### Task 1: Add chat button to jobsite page header

**Files:**
- Modify: `client/src/components/pages/jobsite/id/ClientContent.tsx`

The jobsite page header already has a row of `IconButton` components (Report, Location, Edit, Archive, Remove). Add a chat icon that navigates to `/jobsite/[id]/chat`. Gate it to PM+ since that page is already gated.

- [ ] **Step 1: Add the import for `FiMessageSquare`**

In `ClientContent.tsx`, add to the react-icons import:
```tsx
import { FiArchive, FiBarChart2, FiEdit, FiMap, FiMessageSquare, FiTrash, FiUnlock } from "react-icons/fi";
```

- [ ] **Step 2: Add the chat button to the header**

In the `<Flex flexDir="row" spacing={2}>` that holds the header icons, add the chat button after the report button and before the location button:

```tsx
<Permission minRole={UserRoles.ProjectManager}>
  <Tooltip label="Chat">
    <NextLink href={`/jobsite/${jobsite._id}/chat`} passHref>
      <IconButton
        as="a"
        aria-label="chat"
        icon={<FiMessageSquare />}
        backgroundColor="transparent"
      />
    </NextLink>
  </Tooltip>
</Permission>
```

- [ ] **Step 3: Verify it renders**

Navigate to a jobsite page as a PM/Admin user. Confirm the chat icon appears. Click it and confirm navigation to `/jobsite/[id]/chat`.

- [ ] **Step 4: Commit**
```bash
git add client/src/components/pages/jobsite/id/ClientContent.tsx
git commit -m "feat(jobsite): add chat button to jobsite page header"
```

---

### Task 2: Fix jobsite chat page for mobile

**Files:**
- Modify: `client/src/pages/jobsite/[id]/chat.tsx`

The current layout has a fixed `w="420px"` left panel (documents + breadcrumbs) that completely breaks on small screens. The fix: on mobile, collapse the left panel behind a toggle button that opens it as a Chakra `Drawer`. On desktop the current two-column layout stays.

- [ ] **Step 1: Add mobile-aware imports**

Replace the current imports in `client/src/pages/jobsite/[id]/chat.tsx`:

```tsx
import {
  Box,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  IconButton,
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
  useMediaQuery,
} from "@chakra-ui/react";
import { navbarHeight } from "../../../constants/styles";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import { useRouter } from "next/router";
import React from "react";
import { FiFileText } from "react-icons/fi";
import Breadcrumbs from "../../../components/Common/Breadcrumbs";
import Container from "../../../components/Common/Container";
import Permission from "../../../components/Common/Permission";
import ChatPage from "../../../components/Chat/ChatPage";
import JobsiteEnrichedFiles, {
  EnrichedFileItem,
} from "../../../components/Jobsite/JobsiteEnrichedFiles";
import { UserRoles } from "../../../generated/graphql";
```

- [ ] **Step 2: Update the GQL query**

Update `enrichedFiles` selection to use the new nested structure:

```tsx
const JOBSITE_CHAT_QUERY = gql`
  query JobsiteChat($id: ID!) {
    jobsite(id: $id) {
      _id
      name
      jobcode
      enrichedFiles {
        _id
        minRole
        enrichedFile {
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
      }
    }
  }
`;
```

Also update the `JobsiteChatQueryResult` type:
```tsx
interface JobsiteChatQueryResult {
  jobsite: {
    _id: string;
    name: string;
    jobcode?: string | null;
    enrichedFiles: EnrichedFileItem[];
  } | null;
}
```

- [ ] **Step 3: Rewrite the page component**

Replace the full `JobsiteChatPage` component body:

```tsx
const JobsiteChatPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const jobsiteId = typeof id === "string" ? id : "";
  const [isDesktop] = useMediaQuery("(min-width: 768px)");
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { data, loading, refetch, startPolling, stopPolling } = Apollo.useQuery<
    JobsiteChatQueryResult,
    JobsiteChatQueryVars
  >(JOBSITE_CHAT_QUERY, {
    variables: { id: jobsiteId },
    skip: !jobsiteId,
  });

  const jobsite = data?.jobsite;

  React.useEffect(() => {
    const hasProcessing = jobsite?.enrichedFiles.some(
      (f) => f.enrichedFile?.summaryStatus === "pending" || f.enrichedFile?.summaryStatus === "processing"
    );
    if (hasProcessing) {
      startPolling(3000);
    } else {
      stopPolling();
    }
  }, [jobsite?.enrichedFiles, startPolling, stopPolling]);

  if (loading) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container><Spinner /></Container>
      </Permission>
    );
  }

  if (!jobsite && !loading) {
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Container><Text color="gray.500">Jobsite not found.</Text></Container>
      </Permission>
    );
  }

  // Shared left-panel content used in both desktop sidebar and mobile drawer
  const panelContent = jobsite && (
    <>
      <Breadcrumbs
        crumbs={[
          { title: "Jobsites", link: "/jobsites" },
          {
            title: jobsite.jobcode
              ? `${jobsite.jobcode} — ${jobsite.name}`
              : jobsite.name,
            link: `/jobsite/${jobsite._id}`,
          },
          { title: "Chat", isCurrentPage: true },
        ]}
      />
      <Heading size="md" mb={1} mt={2}>{jobsite.name}</Heading>
      {jobsite.jobcode && (
        <Text fontSize="sm" color="gray.500" mb={4}>{jobsite.jobcode}</Text>
      )}
      <Divider my={4} />
      <Heading size="sm" mb={3} color="gray.700">Documents</Heading>
      <JobsiteEnrichedFiles
        jobsiteId={jobsite._id}
        enrichedFiles={jobsite.enrichedFiles}
        onUpdated={() => refetch()}
      />
    </>
  );

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Flex h={`calc(100vh - ${navbarHeight})`} w="100%" overflow="hidden">
        {isDesktop ? (
          /* ── Desktop: fixed left panel ─────────────────────────────────── */
          <Box
            w="380px"
            flexShrink={0}
            borderRight="1px solid"
            borderColor="gray.200"
            overflowY="auto"
            p={5}
          >
            {panelContent}
          </Box>
        ) : (
          /* ── Mobile: drawer ─────────────────────────────────────────────── */
          <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="full">
            <DrawerOverlay />
            <DrawerContent>
              <DrawerCloseButton />
              <DrawerHeader borderBottomWidth="1px">Documents</DrawerHeader>
              <DrawerBody overflowY="auto">{panelContent}</DrawerBody>
            </DrawerContent>
          </Drawer>
        )}

        {/* ── Chat ──────────────────────────────────────────────────────────── */}
        <Box flex={1} overflow="hidden" position="relative">
          {/* Mobile: documents toggle button overlaid on chat */}
          {!isDesktop && (
            <Box position="absolute" top={3} right={3} zIndex={5}>
              <Tooltip label="View documents" placement="left">
                <IconButton
                  aria-label="Open documents"
                  icon={<FiFileText />}
                  size="sm"
                  onClick={onOpen}
                  colorScheme="blue"
                  variant="outline"
                />
              </Tooltip>
            </Box>
          )}
          <ChatPage
            messageEndpoint="/api/jobsite-chat/message"
            conversationsEndpoint={jobsiteId ? `/conversations?jobsiteId=${jobsiteId}` : "/conversations"}
            extraPayload={{ jobsiteId }}
            suggestions={JOBSITE_SUGGESTIONS}
            disableRouting
          />
        </Box>
      </Flex>
    </Permission>
  );
};
```

- [ ] **Step 4: Verify on desktop and mobile**

- Desktop: two-column layout with left panel and chat. Breadcrumbs, documents, and chat all visible.
- Mobile (resize browser to < 768px): only the chat is visible. A documents button appears top-right. Tapping it opens a full-screen drawer with documents. Chat icon in jobsite page header still works.

- [ ] **Step 5: Commit**
```bash
git add client/src/pages/jobsite/[id]/chat.tsx
git commit -m "feat(jobsite-chat): responsive mobile layout with documents drawer"
```

---

## Chunk 2: Daily report chat drawer

### Task 3: Create `DailyReportChatDrawer` component

**Files:**
- Create: `client/src/components/DailyReport/DailyReportChatDrawer.tsx`
- Modify: `client/src/components/pages/daily-reports/id/ClientContent.tsx`

The drawer opens from a chat icon in the daily report header. On mobile it goes full-screen; on desktop it slides in from the right at ~420px wide. Conversations are scoped to the jobsite (not the individual daily report), so the same conversations show regardless of which daily report you're on for the same jobsite. The foreman cannot upload files — the chat simply uses the documents already on the jobsite.

- [ ] **Step 1: Create `DailyReportChatDrawer.tsx`**

```tsx
// client/src/components/DailyReport/DailyReportChatDrawer.tsx
import React from "react";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  useMediaQuery,
} from "@chakra-ui/react";
import ChatPage from "../Chat/ChatPage";

const DAILY_REPORT_SUGGESTIONS = [
  "What are the key requirements I should be aware of today?",
  "Are there any safety requirements in the jobsite documents?",
  "Summarize the specification for the work we're doing",
  "What materials or equipment are referenced in the documents?",
];

interface DailyReportChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobsiteId: string;
  jobsiteName: string;
}

const DailyReportChatDrawer = ({
  isOpen,
  onClose,
  jobsiteId,
  jobsiteName,
}: DailyReportChatDrawerProps) => {
  const [isDesktop] = useMediaQuery("(min-width: 768px)");

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      size={isDesktop ? "md" : "full"}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" fontSize="md">
          {jobsiteName}
        </DrawerHeader>
        <DrawerBody p={0} overflow="hidden">
          <ChatPage
            messageEndpoint="/api/jobsite-chat/message"
            conversationsEndpoint={`/conversations?jobsiteId=${jobsiteId}`}
            extraPayload={{ jobsiteId }}
            suggestions={DAILY_REPORT_SUGGESTIONS}
            disableRouting
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default DailyReportChatDrawer;
```

- [ ] **Step 2: Wire the drawer into `DailyReportClientContent`**

In `client/src/components/pages/daily-reports/id/ClientContent.tsx`:

Add import:
```tsx
import { FiMessageSquare } from "react-icons/fi";
import DailyReportChatDrawer from "../../../DailyReport/DailyReportChatDrawer";
```

Add `useDisclosure` for the chat drawer (alongside the existing edit modal disclosure):
```tsx
const {
  isOpen: chatOpen,
  onOpen: onChatOpen,
  onClose: onChatClose,
} = useDisclosure();
```

Add the chat icon button to the header actions (in the `<Flex flexDir="column">` that holds the download, edit, and archive icons):
```tsx
<Tooltip label="Chat with documents">
  <IconButton
    backgroundColor="transparent"
    icon={<FiMessageSquare />}
    aria-label="chat"
    onClick={onChatOpen}
  />
</Tooltip>
```

Place this **outside** the `<Permission minRole={UserRoles.ProjectManager}>` wrapper so all roles (including foremen) can access it.

Add the drawer just before the closing `</Box>` of the content return, after the edit modal:
```tsx
<DailyReportChatDrawer
  isOpen={chatOpen}
  onClose={onChatClose}
  jobsiteId={data.dailyReport.jobsite._id}
  jobsiteName={data.dailyReport.jobsite.name}
/>
```

Add `chatOpen`, `onChatOpen`, `onChatClose` to the `useMemo` deps array.

- [ ] **Step 3: Verify**

- Open a daily report page. The chat icon appears in the top-right action area.
- Click it — drawer opens from the right.
- On mobile (< 768px) — drawer is full-screen.
- Sending a message works; a conversation is created scoped to the jobsite.
- The conversation appears in the jobsite chat page's conversation list for that jobsite.

- [ ] **Step 4: Commit**
```bash
git add client/src/components/DailyReport/DailyReportChatDrawer.tsx
git add client/src/components/pages/daily-reports/id/ClientContent.tsx
git commit -m "feat(daily-report): add jobsite chat drawer"
```

---

## Chunk 3: Unified /chat hub

### Task 4: Server — add all-contexts conversations endpoint

**Files:**
- Modify: `server/src/router/conversations.ts`

Add `?scope=all` support to `GET /conversations`. When `scope=all`, return all of the user's conversations regardless of context, with jobsite/tender names populated via `Jobsite.findById` and `Tender.findById`. This powers the unified hub on the client.

The response shape adds optional `context` to each conversation:
```ts
{
  id: string;
  title: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  updatedAt: Date;
  createdAt: Date;
  context?: {
    type: "jobsite" | "tender";
    id: string;
    name: string;
  };
}
```

- [ ] **Step 1: Add the `Jobsite` and `Tender` model imports**

At the top of `server/src/router/conversations.ts`, update the models import:
```ts
import { Conversation, Jobsite, Tender } from "@models";
```

- [ ] **Step 2: Add the `scope=all` branch to `GET /`**

In the existing `router.get("/", ...)` handler, add handling before the current `jobsiteId` branch:

```ts
router.get("/", auth, async (req: any, res) => {
  try {
    const { jobsiteId, scope } = req.query as { jobsiteId?: string; scope?: string };

    if (scope === "all") {
      // Return all conversations for this user across all contexts
      const convos = await Conversation.find(
        { user: req.userId },
        "title aiModel totalInputTokens totalOutputTokens updatedAt createdAt jobsiteId tenderId"
      )
        .sort({ updatedAt: -1 })
        .lean();

      // Collect unique jobsite/tender IDs for name lookup
      const jobsiteIds = [...new Set(convos.filter((c) => c.jobsiteId).map((c) => c.jobsiteId!.toString()))];
      const tenderIds = [...new Set(convos.filter((c) => c.tenderId).map((c) => c.tenderId!.toString()))];

      const [jobsites, tenders] = await Promise.all([
        jobsiteIds.length > 0
          ? Jobsite.find({ _id: { $in: jobsiteIds } }, "name jobcode").lean()
          : [],
        tenderIds.length > 0
          ? Tender.find({ _id: { $in: tenderIds } }, "name").lean()
          : [],
      ]);

      const jobsiteMap = new Map(jobsites.map((j: any) => [j._id.toString(), j]));
      const tenderMap = new Map(tenders.map((t: any) => [t._id.toString(), t]));

      return res.json(
        convos.map((c) => {
          let context: { type: string; id: string; name: string } | undefined;
          if (c.jobsiteId) {
            const j = jobsiteMap.get(c.jobsiteId.toString()) as any;
            context = {
              type: "jobsite",
              id: c.jobsiteId.toString(),
              name: j ? (j.jobcode ? `${j.jobcode} — ${j.name}` : j.name) : "Unknown jobsite",
            };
          } else if (c.tenderId) {
            const t = tenderMap.get(c.tenderId.toString()) as any;
            context = {
              type: "tender",
              id: c.tenderId.toString(),
              name: t?.name ?? "Unknown tender",
            };
          }
          return {
            id: c._id.toString(),
            title: c.title,
            model: c.aiModel,
            totalInputTokens: c.totalInputTokens,
            totalOutputTokens: c.totalOutputTokens,
            updatedAt: c.updatedAt,
            createdAt: c.createdAt,
            ...(context ? { context } : {}),
          };
        })
      );
    }

    // Existing logic below (unchanged) ...
    const query: Record<string, unknown> = { user: req.userId };
    if (jobsiteId && mongoose.isValidObjectId(jobsiteId)) {
      query.jobsiteId = new mongoose.Types.ObjectId(jobsiteId);
    } else {
      query.tenderId = { $exists: false };
      query.jobsiteId = { $exists: false };
    }
    // ... rest of existing handler
```

- [ ] **Step 3: Verify the endpoint**

```bash
# Get a JWT token from localStorage in the browser devtools, then:
curl -H "Authorization: <token>" http://localhost:3001/conversations?scope=all
# Should return all conversations with optional context fields
```

- [ ] **Step 4: Commit**
```bash
git add server/src/router/conversations.ts
git commit -m "feat(conversations): add scope=all endpoint with context population"
```

---

### Task 5: Unified /chat hub page

**Files:**
- Modify: `client/src/pages/chat/index.tsx`
- Modify: `client/src/pages/chat/[conversationId].tsx`

The `/chat` page becomes a hub: a two-column layout (sidebar + content area) on desktop, or a list-only view on mobile. The sidebar shows all conversations grouped by context. Clicking a general conversation loads it in the right panel. Clicking a jobsite or tender conversation navigates to the appropriate chat page.

On mobile, the page is a full-screen list of all conversations. Tapping one navigates appropriately.

The general analytics chat (current behaviour) is the default "new chat" on this page.

The `NavbarChat` button opens this page — no change needed there since it already goes to `/chat`.

- [ ] **Step 1: Create a `ConversationHub` component inline in `index.tsx`**

Replace `client/src/pages/chat/index.tsx` entirely:

```tsx
import React from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import NextLink from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
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
import { localStorageTokenKey } from "../../contexts/Auth";
import ChatPage from "../../components/Chat/ChatPage";
import Permission from "../../components/Common/Permission";
import { UserRoles } from "../../generated/graphql";

dayjs.extend(relativeTime);

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

const ChatHubPage: NextPage = () => {
  const router = useRouter();
  const [isDesktop] = useMediaQuery("(min-width: 768px)");
  const [conversations, setConversations] = React.useState<ConversationEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace("/graphql", "");

  React.useEffect(() => {
    const token = localStorage.getItem(localStorageTokenKey);
    if (!token) return;
    fetch(`${serverBase}/conversations?scope=all`, {
      headers: { Authorization: token },
    })
      .then((r) => r.json())
      .then((data) => {
        setConversations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [serverBase]);

  const conversationList = (
    <Box>
      <Flex px={4} py={3} align="center" justify="space-between" borderBottom="1px solid" borderColor="gray.100">
        <Heading size="sm" color="gray.700">All Conversations</Heading>
        <Tooltip label="New general chat">
          <NextLink href="/chat/new" passHref>
            <IconButton
              as="a"
              aria-label="New chat"
              icon={<FiMessageSquare />}
              size="xs"
              variant="ghost"
            />
          </NextLink>
        </Tooltip>
      </Flex>

      {loading ? (
        <Flex justify="center" pt={8}><Spinner size="sm" /></Flex>
      ) : conversations.length === 0 ? (
        <Text fontSize="sm" color="gray.500" px={4} pt={6} textAlign="center">
          No conversations yet.
        </Text>
      ) : (
        <VStack spacing={0} align="stretch">
          {conversations.map((c) => (
            <Box
              key={c.id}
              as="a"
              href={conversationHref(c)}
              display="block"
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor="gray.100"
              _hover={{ bg: "gray.50" }}
              cursor="pointer"
              onClick={(e) => {
                e.preventDefault();
                router.push(conversationHref(c));
              }}
            >
              <Flex align="center" gap={2} mb={1}>
                {contextBadge(c.context)}
                <Text fontSize="sm" fontWeight="medium" noOfLines={1} flex={1}>
                  {c.title}
                </Text>
              </Flex>
              {c.context && (
                <Text fontSize="xs" color="gray.500" noOfLines={1} mb={1}>
                  {c.context.name}
                </Text>
              )}
              <Text fontSize="xs" color="gray.400">
                {dayjs(c.updatedAt).fromNow()}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );

  if (!isDesktop) {
    // Mobile: just show the conversation list, tapping navigates
    return (
      <Permission minRole={UserRoles.ProjectManager} type={null} showError>
        <Box>{conversationList}</Box>
      </Permission>
    );
  }

  // Desktop: sidebar + general chat
  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Flex h={`calc(100vh - ${navbarHeight})`} w="100%" overflow="hidden">
        <Box
          w="280px"
          flexShrink={0}
          borderRight="1px solid"
          borderColor="gray.200"
          overflowY="auto"
        >
          {conversationList}
        </Box>
        <Box flex={1} overflow="hidden">
          <ChatPage disableRouting={false} />
        </Box>
      </Flex>
    </Permission>
  );
};

export default ChatHubPage;
```

- [ ] **Step 2: Add a `/chat/new` route for starting a new general chat**

Create `client/src/pages/chat/new.tsx`:
```tsx
import { NextPage } from "next";
import ChatPage from "../../components/Chat/ChatPage";

const NewChatPage: NextPage = () => <ChatPage />;

export default NewChatPage;
```

This gives the "New general chat" button a destination that doesn't conflict with the `[conversationId]` dynamic route.

- [ ] **Step 3: Update `[conversationId].tsx` to handle `conversationId` query param from jobsite/tender redirects**

The jobsite chat page uses `disableRouting` so it doesn't navigate to `/chat/[id]`. The hub links to `/jobsite/[id]/chat?conversationId=X` for jobsite conversations. No change needed to `[conversationId].tsx` — it handles general chat IDs only.

- [ ] **Step 4: Verify**

- Log in as PM/Admin and navigate to `/chat`.
- Desktop: see conversation list on the left, general analytics chat on the right. Conversations with context show coloured badges and subtext.
- Click a jobsite conversation → navigates to `/jobsite/[id]/chat?conversationId=X` and loads that conversation.
- Click a general conversation → loads it in the right panel.
- Mobile: see full-screen list. Tapping navigates appropriately.
- Navbar chat icon still goes to `/chat`.

- [ ] **Step 5: Commit**
```bash
git add client/src/pages/chat/index.tsx
git add client/src/pages/chat/new.tsx
git commit -m "feat(chat): unified hub page with all-contexts conversation list"
```

---

## Post-implementation checklist

- [ ] Jobsite page: chat icon visible to PM/Admin, not to regular users
- [ ] Jobsite chat page: works on both desktop and mobile, documents toggleable
- [ ] Daily report: chat icon visible to all users, drawer opens correctly on mobile and desktop
- [ ] Daily report chat conversations appear in jobsite chat page conversation list
- [ ] `/chat` hub lists all conversation types with correct badges and navigation
- [ ] New general chat button in hub works
- [ ] Server logs clean (no errors on conversations?scope=all calls)
