import React from "react";
import { gql, useMutation, useQuery, useSubscription } from "@apollo/client";
import DocumentViewerModal from "../Common/DocumentViewerModal";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Icon,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Portal,
  Progress,
  Spinner,
  Wrap,
  WrapItem,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  FiCheck,
  FiEdit2,
  FiEye,
  FiFile,
  FiFolder,
  FiFolderPlus,
  FiHome,
  FiInfo,
  FiLock,
  FiMoreVertical,
  FiPlus,
  FiRotateCcw,
  FiShield,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import { UserRoles } from "../../generated/graphql";

type EnrichmentStatus =
  | "pending"
  | "processing"
  | "ready"
  | "partial"
  | "failed"
  | "orphaned";

interface EnrichmentProgressGql {
  phase: string;
  current: number;
  total: number;
  updatedAt: string;
}

interface EnrichmentSummaryGql {
  overview: string;
  documentType: string;
  keyTopics: string[];
}

interface EnrichmentGql {
  status: EnrichmentStatus;
  attempts: number;
  processingVersion: number;
  queuedAt?: string | null;
  processingStartedAt?: string | null;
  summaryError?: string | null;
  summaryProgress?: EnrichmentProgressGql | null;
  pageCount?: number | null;
  summary?: EnrichmentSummaryGql | null;
  documentType?: string | null;
}

interface FileNodeRow {
  _id: string;
  type: "folder" | "file";
  name: string;
  parentId: string | null;
  documentId?: string | null;
  systemManaged: boolean;
  isReservedRoot: boolean;
  sortKey: string;
  minRole?: UserRoles | null;
  deletedAt?: string | null;
  version: number;
  mimetype?: string | null;
  enrichment?: EnrichmentGql | null;
  createdByName?: string | null;
  deletedByName?: string | null;
  uploadedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

const ENRICHMENT_COLORS: Record<EnrichmentStatus, string> = {
  pending: "gray",
  processing: "blue",
  ready: "green",
  partial: "yellow",
  failed: "red",
  orphaned: "blackAlpha",
};

// Color hex values used by the raw circle indicator (Chakra palettes mirrored
// at the 400 level, matching Badge colorScheme visuals).
const ENRICHMENT_HEX: Record<EnrichmentStatus, string> = {
  pending: "#A0AEC0",
  processing: "#4299E1",
  ready: "#48BB78",
  partial: "#ECC94B",
  failed: "#F56565",
  orphaned: "#2D3748",
};

const ROLE_LABELS: Record<UserRoles, string> = {
  [UserRoles.User]: "All users",
  [UserRoles.ProjectManager]: "PM & Admin",
  [UserRoles.Admin]: "Admin only",
  [UserRoles.Developer]: "Developer only",
};

// Order shown in the Access menu — most permissive first. Developer is
// intentionally excluded: it's a tooling role, not a content-visibility
// tier anyone sets from the UI. Existing rows with minRole=Developer
// still render their label in Properties via ROLE_LABELS below.
const ROLE_CHOICES: UserRoles[] = [
  UserRoles.User,
  UserRoles.ProjectManager,
  UserRoles.Admin,
];

// "Unset" sentinel for the OptionGroup — passed to setMinRole as null to
// clear the field. The server treats null as "visible to everyone".
const ACCESS_UNSET = "__unset__";

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "image/svg+xml": "SVG",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-excel": "XLS",
  "application/msword": "DOC",
  "text/plain": "TXT",
  "text/csv": "CSV",
  "text/markdown": "MD",
  "application/json": "JSON",
  "application/zip": "ZIP",
  "video/mp4": "MP4",
  "video/quicktime": "MOV",
  "audio/mpeg": "MP3",
};

const friendlyMime = (mime?: string | null): string =>
  mime ? MIME_LABELS[mime] ?? mime : "—";

const NODE_FIELDS = `
  _id
  type
  name
  parentId
  documentId
  systemManaged
  isReservedRoot
  sortKey
  minRole
  deletedAt
  version
  mimetype
  createdByName
  deletedByName
  uploadedByName
  enrichment {
    status
    attempts
    processingVersion
    queuedAt
    processingStartedAt
    summaryError
    summaryProgress { phase current total updatedAt }
    pageCount
    summary { overview documentType keyTopics }
    documentType
  }
  createdAt
  updatedAt
`;

const FILE_NODE_CHILDREN = gql`
  query FileNodeChildren($parentId: ID!, $includeTrashed: Boolean) {
    fileNodeChildren(parentId: $parentId, includeTrashed: $includeTrashed) { ${NODE_FIELDS} }
  }
`;

const FILE_NODE_BREADCRUMBS = gql`
  query FileNodeBreadcrumbs($id: ID!) {
    fileNodeBreadcrumbs(id: $id) {
      _id
      name
      isReservedRoot
    }
  }
`;

const CREATE_FOLDER = gql`
  mutation CreateFolder($parentId: ID!, $name: String!) {
    createFolder(parentId: $parentId, name: $name) { ${NODE_FIELDS} }
  }
`;

const RENAME_NODE = gql`
  mutation RenameNode($id: ID!, $expectedVersion: Int!, $name: String!) {
    renameNode(id: $id, expectedVersion: $expectedVersion, name: $name) { ${NODE_FIELDS} }
  }
`;

const TRASH_NODE = gql`
  mutation TrashNode($id: ID!, $expectedVersion: Int!) {
    trashNode(id: $id, expectedVersion: $expectedVersion) { ${NODE_FIELDS} }
  }
`;

const RESTORE_NODE = gql`
  mutation RestoreNode($id: ID!, $expectedVersion: Int!) {
    restoreNode(id: $id, expectedVersion: $expectedVersion) { ${NODE_FIELDS} }
  }
`;

const UPLOAD_DOCUMENT = gql`
  mutation UploadDocument($input: UploadDocumentInput!) {
    uploadDocument(input: $input) { ${NODE_FIELDS} }
  }
`;

const MOVE_NODE = gql`
  mutation MoveNode($id: ID!, $destinationParentId: ID!, $expectedVersion: Int!) {
    moveNode(
      id: $id
      destinationParentId: $destinationParentId
      expectedVersion: $expectedVersion
    ) { ${NODE_FIELDS} }
  }
`;

const ENSURE_FOLDER_PATH = gql`
  mutation EnsureFolderPath($rootId: ID!, $segments: [String!]!) {
    ensureFolderPath(rootId: $rootId, segments: $segments) { ${NODE_FIELDS} }
  }
`;

const SET_FILE_NODE_MIN_ROLE = gql`
  mutation SetFileNodeMinRole(
    $id: ID!
    $expectedVersion: Int!
    $minRole: UserRoles
  ) {
    setFileNodeMinRole(
      id: $id
      expectedVersion: $expectedVersion
      minRole: $minRole
    ) { ${NODE_FIELDS} }
  }
`;

const MAX_FILES_PER_UPLOAD = 100;
const MAX_FILE_BYTES = 250 * 1024 * 1024; // 250 MB
const UPLOAD_CONCURRENCY = 3;

// Subscribe to DomainEvents scoped to the currently-viewed folder.
// Any fileNode.* event on this folder (created / renamed / trashed / restored /
// moved-in / moved-out) means the children list may have changed — we refetch.
const FOLDER_EVENTS_SUB = gql`
  subscription FolderEvents($entityType: String!, $entityId: String!) {
    domainEvent(entityType: $entityType, entityId: $entityId) {
      _id
      type
      at
    }
  }
`;

const DRAG_MIME = "application/x-filenode";
interface DragPayload {
  id: string;
  version: number;
  name: string;
  sourceParentId: string | null;
}

interface EnrichmentIndicatorProps {
  enrichment: EnrichmentGql;
}

const EnrichmentIndicator: React.FC<EnrichmentIndicatorProps> = ({ enrichment }) => (
  <Box
    aria-label={`Enrichment: ${enrichment.status}`}
    title={`Enrichment: ${enrichment.status}`}
    w="10px"
    h="10px"
    borderRadius="full"
    bg={ENRICHMENT_HEX[enrichment.status]}
    border="1px solid"
    borderColor="whiteAlpha.800"
    boxShadow="sm"
  />
);

interface PropertiesDrawerProps {
  node: FileNodeRow | null;
  onClose: () => void;
}

const Kv: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box display="grid" gridTemplateColumns="8rem 1fr" columnGap={3} fontSize="sm" py={1}>
    <Text color="gray.500">{label}</Text>
    <Box color="gray.800" wordBreak="break-word">
      {children}
    </Box>
  </Box>
);

const PropertiesDrawer: React.FC<PropertiesDrawerProps> = ({ node, onClose }) => {
  const isOpen = !!node;
  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="sm">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Properties</DrawerHeader>
        <DrawerBody>
          {node && (
            <>
              <Kv label="Name">{node.name}</Kv>
              <Kv label="Type">{node.type}</Kv>
              {node.type === "file" && node.mimetype && (
                <Kv label="MIME">
                  <Text as="span" title={node.mimetype}>
                    {friendlyMime(node.mimetype)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {node.mimetype}
                  </Text>
                </Kv>
              )}
              <Kv label="Reserved root">{node.isReservedRoot ? "yes" : "no"}</Kv>
              <Kv label="System-managed">{node.systemManaged ? "yes" : "no"}</Kv>
              {node.minRole != null && (
                <Kv label="Access">
                  {ROLE_LABELS[node.minRole] ?? node.minRole}
                </Kv>
              )}
              <Kv label="Sort key">{node.sortKey}</Kv>
              <Kv label="Version">v{node.version}</Kv>
              {node.deletedAt && (
                <Kv label="Trashed at">{new Date(node.deletedAt).toLocaleString()}</Kv>
              )}
              {node.deletedByName && <Kv label="Trashed by">{node.deletedByName}</Kv>}
              <Kv label="Created">{new Date(node.createdAt).toLocaleString()}</Kv>
              {node.createdByName && <Kv label="Created by">{node.createdByName}</Kv>}
              <Kv label="Updated">{new Date(node.updatedAt).toLocaleString()}</Kv>
              {node.uploadedByName && <Kv label="Uploaded by">{node.uploadedByName}</Kv>}
              <Divider my={4} />
              <Kv label="Node ID">
                <Text fontFamily="mono" fontSize="xs">
                  {node._id}
                </Text>
              </Kv>
              {node.documentId && (
                <Kv label="Document ID">
                  <Text fontFamily="mono" fontSize="xs">
                    {node.documentId}
                  </Text>
                </Kv>
              )}

              {node.enrichment && (
                <>
                  <Divider my={4} />
                  <Text fontWeight="semibold" mb={2}>
                    Enrichment
                  </Text>
                  <Kv label="Status">
                    <Badge colorScheme={ENRICHMENT_COLORS[node.enrichment.status]}>
                      {node.enrichment.status}
                    </Badge>
                  </Kv>
                  <Kv label="Attempts">{node.enrichment.attempts}</Kv>
                  <Kv label="Processing ver.">v{node.enrichment.processingVersion}</Kv>
                  {node.enrichment.queuedAt && (
                    <Kv label="Queued">
                      {new Date(node.enrichment.queuedAt).toLocaleString()}
                    </Kv>
                  )}
                  {node.enrichment.processingStartedAt && (
                    <Kv label="Started">
                      {new Date(node.enrichment.processingStartedAt).toLocaleString()}
                    </Kv>
                  )}
                  {node.enrichment.pageCount != null && (
                    <Kv label="Pages">{node.enrichment.pageCount}</Kv>
                  )}

                  {node.enrichment.status === "processing" && node.enrichment.summaryProgress && (
                    <Box mt={3}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="xs" color="gray.600">
                          {node.enrichment.summaryProgress.phase === "page_index"
                            ? "Indexing pages"
                            : "Synthesizing"}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {node.enrichment.summaryProgress.current}/
                          {node.enrichment.summaryProgress.total}
                        </Text>
                      </HStack>
                      <Progress
                        size="xs"
                        value={
                          node.enrichment.summaryProgress.total > 0
                            ? (node.enrichment.summaryProgress.current /
                                node.enrichment.summaryProgress.total) *
                              100
                            : 0
                        }
                        isIndeterminate={node.enrichment.summaryProgress.total === 0}
                      />
                    </Box>
                  )}

                  {node.enrichment.summary && (
                    <Box mt={3}>
                      {node.enrichment.summary.documentType && (
                        <Text fontWeight="semibold" color="gray.700">
                          {node.enrichment.summary.documentType}
                        </Text>
                      )}
                      {node.enrichment.summary.overview && (
                        <Text mt={1} color="gray.700" fontSize="sm">
                          {node.enrichment.summary.overview}
                        </Text>
                      )}
                      {node.enrichment.summary.keyTopics &&
                        node.enrichment.summary.keyTopics.length > 0 && (
                          <Wrap mt={2} spacing={1}>
                            {node.enrichment.summary.keyTopics.map((t) => (
                              <WrapItem key={t}>
                                <Badge variant="subtle" fontSize="2xs" textTransform="none">
                                  {t}
                                </Badge>
                              </WrapItem>
                            ))}
                          </Wrap>
                        )}
                    </Box>
                  )}

                  {node.enrichment.summaryError && (
                    <Box mt={3} color="red.500">
                      <Text fontWeight="semibold" fontSize="xs">
                        Error
                      </Text>
                      <Text fontSize="xs">{node.enrichment.summaryError}</Text>
                    </Box>
                  )}
                </>
              )}
            </>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export interface FileBrowserProps {
  /**
   * The FileNode id that scopes this browser. May be null when the
   * host surface wants the full browser UI (breadcrumbs, toolbar, drop
   * zone) rendered for an entity whose per-entity root hasn't been
   * provisioned yet. When null, `ensureRoot` must be provided — any
   * action that needs a real parent id (upload, new folder, external
   * drop) will call it lazily before proceeding.
   */
  rootId: string | null;
  /**
   * Lazy-provision hook. Invoked just-in-time the first time a mutation
   * needs a real root id. Must return the newly created / existing root
   * FileNode id. After it resolves, the browser swaps its internal
   * currentId over so subsequent actions skip this call. Only needed
   * when `rootId` can be null.
   */
  ensureRoot?: () => Promise<string>;
  /**
   * When true, the user cannot navigate / drop above rootId. Also trims the
   * "home" icon from the breadcrumb. Default true (embedded surfaces);
   * the developer tab sets false to let itself roam the whole tree.
   */
  pinRoot?: boolean;
  /**
   * "scoped" trims breadcrumbs to start at rootId (hides /, /tenders, etc.).
   * "global" shows the full chain from the filesystem root. Default "scoped".
   */
  breadcrumbMode?: "scoped" | "global";
  /**
   * The current viewer's role — used to decide whether to show the
   * "Access" role-picker in the row menu. Server-side filtering on
   * chat/doc-list endpoints already happens per-request from the
   * JWT, so this prop only drives UI gating.
   */
  userRole?: UserRoles;
  /**
   * Slightly tighter chrome (rail padding, header height). Default true —
   * optimised for the embedded case. Dev tab keeps false for its larger
   * standalone card.
   */
  compact?: boolean;
  /**
   * Override the displayed name of the root crumb. Useful when rootId's
   * actual name is an ObjectId string (per-entity roots) — embed with
   * rootLabel="Documents" to show a friendly label.
   */
  rootLabel?: string;
  /**
   * Custom file-click handler. When provided, replaces the built-in
   * DocumentViewerModal open. Used by the tender Documents tab so
   * single-clicking a file renders the reference-creation FileViewer
   * in-place rather than popping a preview modal.
   */
  onFileClick?: (node: FileNodeRow) => void;
  /**
   * Hide every mutation affordance — Add menu, rename/trash/restore, drag
   * handles, drop zones, the Access role picker. Users can still navigate
   * the tree, preview files, and open the Properties drawer. Used by
   * surfaces that should display jobsite documents without permitting
   * edits from that context (e.g. the Daily Report page).
   */
  readOnly?: boolean;
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  rootId,
  ensureRoot,
  pinRoot = true,
  breadcrumbMode = "scoped",
  userRole,
  compact = true,
  rootLabel,
  onFileClick,
  readOnly = false,
}) => {
  // Show the Access role-picker only for users who could actually change
  // it (PM+). When userRole isn't provided (e.g. /developer tab), fall
  // through to true — the server-side @Authorized(["ADMIN", "PM"]) on
  // setFileNodeMinRole is the real gate. We just hide the control from
  // users who would never be allowed to use it.
  const canSetMinRole =
    userRole === undefined ||
    userRole === UserRoles.ProjectManager ||
    userRole === UserRoles.Admin ||
    userRole === UserRoles.Developer;

  const accessValueFor = React.useCallback((node: FileNodeRow): string => {
    if (!node.minRole || node.minRole === UserRoles.User) return ACCESS_UNSET;
    return node.minRole as string;
  }, []);
  const toast = useToast();
  const [currentId, setCurrentId] = React.useState<string | null>(rootId);
  // If the host remounts with a different rootId (e.g. route changed to
  // a different tender, or ensureRoot resolved the root from null),
  // snap back to that new root. Ignore the transition from a real id
  // back to null (rare — only if the host explicitly nulls rootId) so
  // we don't jump the user out of a folder they were viewing.
  React.useEffect(() => {
    if (rootId) setCurrentId(rootId);
  }, [rootId]);

  /**
   * Resolve an id usable as a mutation target's parent. If the browser
   * has a real currentId already, return it. Otherwise call `ensureRoot`
   * (the host's lazy-provision hook), set currentId to the freshly-
   * minted root, and return it. Returns null if neither path works —
   * caller bails silently. Memoized so the helper identity is stable
   * inside the callback tree.
   */
  const ensuringRef = React.useRef<Promise<string | null> | null>(null);
  const resolveCurrentId = React.useCallback(async (): Promise<
    string | null
  > => {
    if (currentId) return currentId;
    if (!ensureRoot) return null;
    // Coalesce concurrent callers (e.g. a file drop that triggers both
    // the drop handler and a subsequent upload) onto one in-flight
    // mutation.
    if (ensuringRef.current) return ensuringRef.current;
    const p = (async () => {
      try {
        const rid = await ensureRoot();
        setCurrentId(rid);
        return rid;
      } catch (err) {
        toast({
          title: "Couldn't create folder",
          description:
            err instanceof Error ? err.message : "Please try again.",
          status: "error",
          duration: 5000,
        });
        return null;
      } finally {
        ensuringRef.current = null;
      }
    })();
    ensuringRef.current = p;
    return p;
  }, [currentId, ensureRoot, toast]);
  const [includeTrashed, setIncludeTrashed] = React.useState(false);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [pendingTrash, setPendingTrash] = React.useState<FileNodeRow | null>(null);
  const [propertiesNode, setPropertiesNode] = React.useState<FileNodeRow | null>(null);
  const [viewerNode, setViewerNode] = React.useState<FileNodeRow | null>(null);
  // When user right-clicks the empty folder area, we render a virtual
  // anchor at this point and open the Add menu against it. Cleared on close.
  const [rightClickPos, setRightClickPos] = React.useState<
    { x: number; y: number } | null
  >(null);
  // Right-click on a specific row opens the row's action menu at the
  // cursor. Holds both the position and the captured row so the menu can
  // render the correct items (restore vs rename/trash, etc.).
  const [rowContext, setRowContext] = React.useState<
    { pos: { x: number; y: number }; node: FileNodeRow } | null
  >(null);
  // Folder-upload progress modal state. Lifecycle: null (hidden) → "running"
  // (uploads in progress, cancellable) → "done" (all finished or cancelled,
  // close button shown).
  const [folderUpload, setFolderUpload] = React.useState<{
    phase: "running" | "done";
    total: number;
    completed: number;
    skipped: number;
    failed: number;
    cancelled: boolean;
  } | null>(null);

  // Auto-dismiss the progress modal after a clean run finishes — brief
  // delay so the user sees the 100% state before it disappears. If
  // anything failed or the user cancelled, keep the modal open so they
  // can review and close manually.
  React.useEffect(() => {
    if (
      folderUpload?.phase === "done" &&
      folderUpload.failed === 0 &&
      !folderUpload.cancelled
    ) {
      const t = setTimeout(() => setFolderUpload(null), 1500);
      return () => clearTimeout(t);
    }
  }, [folderUpload?.phase, folderUpload?.failed, folderUpload?.cancelled]);
  const folderUploadCancelledRef = React.useRef(false);
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const trashDialog = useDisclosure();
  // Timer ref for single-click-vs-double-click disambiguation. Single click
  // fires deferred so a second click within DOUBLE_CLICK_MS cancels it and
  // triggers rename instead.
  const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const DOUBLE_CLICK_MS = 220;
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  const childrenQuery = useQuery<{ fileNodeChildren: FileNodeRow[] }>(
    FILE_NODE_CHILDREN,
    {
      variables: { parentId: currentId ?? "", includeTrashed },
      skip: !currentId,
      fetchPolicy: "cache-and-network",
    }
  );

  const breadcrumbsQuery = useQuery<{ fileNodeBreadcrumbs: FileNodeRow[] }>(
    FILE_NODE_BREADCRUMBS,
    {
      variables: { id: currentId ?? "" },
      skip: !currentId,
      // Same policy as the children query — a folder's parent chain can
      // change out from under us (remote move, we moved it ourselves in
      // another tab, etc.). Without this, Apollo serves stale cached
      // ancestors indefinitely when the user navigates into a moved node.
      fetchPolicy: "cache-and-network",
    }
  );

  // Debounced refetch. A single move fires 3 DomainEvents (source parent +
  // destination parent + self cascade), each arriving on the subscription
  // within milliseconds of each other; without coalescing we'd fire 3
  // simultaneous fileNodeChildren + 3 fileNodeBreadcrumbs requests in a
  // tight loop. 100ms window collapses the burst into one pair of calls.
  const refetchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const refetchAll = React.useCallback(() => {
    if (refetchTimer.current) return;
    refetchTimer.current = setTimeout(() => {
      refetchTimer.current = null;
      childrenQuery.refetch();
      breadcrumbsQuery.refetch();
    }, 100);
  }, [childrenQuery, breadcrumbsQuery]);

  // Realtime: tail DomainEvents for the current folder. Events are emitted
  // with entityId scoped to (a) the parent folder of a changed child, AND
  // (b) the changed node itself — so whether a sibling is added/removed,
  // or the current folder itself is renamed/moved/trashed, we see it.
  // On any fileNode.* event we refetch both children + breadcrumbs.
  useSubscription(FOLDER_EVENTS_SUB, {
    variables: { entityType: "FileNode", entityId: currentId ?? "" },
    skip: !currentId,
    onSubscriptionData: ({ subscriptionData }) => {
      const t = subscriptionData?.data?.domainEvent?.type as string | undefined;
      if (t && t.startsWith("fileNode.")) {
        refetchAll();
      }
    },
  });

  const [createFolder, createFolderResult] = useMutation(CREATE_FOLDER, {
    onCompleted: () => {
      toast({ title: "Folder created", status: "success", duration: 2000 });
      refetchAll();
    },
    onError: (err) =>
      toast({ title: "Create failed", description: err.message, status: "error" }),
  });

  const [renameNode, renameResult] = useMutation(RENAME_NODE, {
    onCompleted: () => {
      setRenamingId(null);
      toast({ title: "Renamed", status: "success", duration: 2000 });
      refetchAll();
    },
    onError: (err) =>
      toast({ title: "Rename failed", description: err.message, status: "error" }),
  });

  const [trashNode, trashResult] = useMutation(TRASH_NODE, {
    onCompleted: () => {
      toast({ title: "Moved to trash", status: "success", duration: 2000 });
      refetchAll();
    },
    onError: (err) =>
      toast({ title: "Trash failed", description: err.message, status: "error" }),
  });

  const [restoreNode, restoreResult] = useMutation(RESTORE_NODE, {
    onCompleted: () => {
      toast({ title: "Restored", status: "success", duration: 2000 });
      refetchAll();
    },
    onError: (err) =>
      toast({ title: "Restore failed", description: err.message, status: "error" }),
  });

  const [uploadDocument, uploadResult] = useMutation(UPLOAD_DOCUMENT, {
    onCompleted: () => {
      toast({ title: "File uploaded", status: "success", duration: 2000 });
      refetchAll();
    },
    onError: (err) =>
      toast({ title: "Upload failed", description: err.message, status: "error" }),
  });

  const [moveNode, moveResult] = useMutation(MOVE_NODE, {
    onCompleted: () => {
      toast({ title: "Moved", status: "success", duration: 2000 });
      refetchAll();
    },
    onError: (err) =>
      toast({ title: "Move failed", description: err.message, status: "error" }),
  });

  const [ensureFolderPath] = useMutation(ENSURE_FOLDER_PATH);
  const [uploadDocumentRaw] = useMutation(UPLOAD_DOCUMENT);

  const [setMinRoleMutation] = useMutation(SET_FILE_NODE_MIN_ROLE, {
    onCompleted: () => {
      toast({ title: "Access updated", status: "success", duration: 2000 });
      refetchAll();
    },
    onError: (err) =>
      toast({
        title: "Access update failed",
        description: err.message,
        status: "error",
      }),
  });

  const setMinRole = React.useCallback(
    (node: FileNodeRow, minRole: UserRoles | null) => {
      setMinRoleMutation({
        variables: { id: node._id, expectedVersion: node.version, minRole },
      });
    },
    [setMinRoleMutation]
  );

  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);

  const handleDragStart = (node: FileNodeRow) => (e: React.DragEvent) => {
    const payload: DragPayload = {
      id: node._id,
      version: node.version,
      name: node.name,
      sourceParentId: node.parentId,
    };
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";

    // Custom drag preview — a pill with a colored dot + name, centered
    // on the cursor. Must be attached to the document for the browser to
    // rasterize it, then removed on the next tick.
    const ghost = document.createElement("div");
    ghost.style.cssText = [
      "position:absolute",
      "top:-1000px",
      "left:-1000px",
      // Dimensions are scaled up to account for Chromium's high-DPI drag
      // image rasterization (which visually shrinks the preview on screen).
      "padding:16px 28px",
      "background:white",
      "border:2px solid #cbd5e0",
      "border-radius:15px",
      "font-size:24px",
      "font-weight:500",
      "color:#2d3748",
      "box-shadow:0 9px 24px rgba(0,0,0,0.18)",
      "display:inline-flex",
      "align-items:center",
      "gap:21px",
      "white-space:nowrap",
      "font-family:system-ui,sans-serif",
      "pointer-events:none",
    ].join(";");
    const dot = document.createElement("span");
    dot.style.cssText = [
      "width:27px",
      "height:27px",
      "border-radius:6px",
      `background:${node.type === "folder" ? "#3182ce" : "#718096"}`,
    ].join(";");
    const label = document.createElement("span");
    label.textContent = node.name;
    ghost.appendChild(dot);
    ghost.appendChild(label);
    document.body.appendChild(ghost);
    const rect = ghost.getBoundingClientRect();
    e.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2);
    // Clean up after the browser snapshots the element for the drag image.
    setTimeout(() => {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }, 0);
  };

  // Spring-loaded folders: while dragging, hovering over a folder row or
  // an ancestor breadcrumb for SPRING_LOAD_MS ms auto-navigates into it.
  // Lets users drop into deeply nested destinations without releasing the
  // drag, matching the standard desktop file-manager pattern.
  const SPRING_LOAD_MS = 800;
  const springLoadTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const springLoadTargetRef = React.useRef<string | null>(null);

  const cancelSpringLoad = React.useCallback(() => {
    if (springLoadTimerRef.current) {
      clearTimeout(springLoadTimerRef.current);
      springLoadTimerRef.current = null;
    }
    springLoadTargetRef.current = null;
  }, []);

  // Clear any pending spring-load on unmount so its setState doesn't fire
  // on a gone component.
  React.useEffect(() => {
    return () => {
      if (springLoadTimerRef.current) clearTimeout(springLoadTimerRef.current);
    };
  }, []);

  const scheduleSpringLoad = React.useCallback(
    (targetId: string) => {
      // Already at that folder — nothing to load into.
      if (targetId === currentId) return;
      // Same target still pending — let the existing timer run.
      if (springLoadTargetRef.current === targetId) return;
      if (springLoadTimerRef.current) {
        clearTimeout(springLoadTimerRef.current);
      }
      springLoadTargetRef.current = targetId;
      springLoadTimerRef.current = setTimeout(() => {
        setCurrentId(targetId);
        // After navigating, the old dropTargetId no longer belongs to a
        // visible row — clear it so the highlight doesn't stick around.
        setDropTargetId(null);
        springLoadTimerRef.current = null;
        springLoadTargetRef.current = null;
      }, SPRING_LOAD_MS);
    },
    [currentId]
  );

  const handleDragOver = (targetId: string) => (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetId !== targetId) setDropTargetId(targetId);
    scheduleSpringLoad(targetId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
    cancelSpringLoad();
  };

  const doMove = (
    payload: DragPayload,
    destinationParentId: string
  ) => {
    // Silently no-op on self-drop or same-parent drop.
    if (payload.id === destinationParentId) return;
    if (payload.sourceParentId === destinationParentId) return;
    // The drag payload was serialized at drag-start and can be stale by
    // drop time (subscription refetches / local mutations bump the row's
    // version mid-drag). Read the current version from state instead;
    // fall back to the payload only if the row is no longer visible.
    const currentVersion =
      children.find((c) => c._id === payload.id)?.version ?? payload.version;
    moveNode({
      variables: {
        id: payload.id,
        destinationParentId,
        expectedVersion: currentVersion,
      },
    });
  };

  const handleDrop = (destinationParentId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    // Stop bubbling so the outer content-area drop handler doesn't ALSO
    // try to move the node into the current folder after a row/breadcrumb
    // already claimed the drop.
    e.stopPropagation();
    setDropTargetId(null);
    // The content-area drag-over highlight is driven by a bubbling
    // handler — but stopPropagation above prevents the outer drop from
    // firing, so we must clear that state here too. Otherwise the
    // container outline sticks around after a successful row drop.
    setIsInternalDragOver(false);
    setIsExternalDragOver(false);
    cancelSpringLoad();
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DragPayload;
      doMove(payload, destinationParentId);
    } catch {
      // ignore malformed payload
    }
  };

  const handleNewFolder = async () => {
    const name = window.prompt("Folder name?");
    if (!name) return;
    const parentId = await resolveCurrentId();
    if (!parentId) return;
    createFolder({ variables: { parentId, name } });
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const parentId = await resolveCurrentId();
    if (!parentId) return;
    uploadDocument({
      variables: {
        input: { parentFileNodeId: parentId, fileUpload: file },
      },
    });
  };

  const handleUploadFolderClick = () => folderInputRef.current?.click();

  /**
   * Upload a batch of files with their relative paths. Used by the folder
   * upload input (paths come from webkitRelativePath), external drag-and-
   * drop of files or folders from the OS (paths come from the File System
   * Entry API), and any other future callers. Materializes the directory
   * tree first, then uploads files in parallel with concurrency capped.
   */
  const uploadEntries = React.useCallback(
    async (files: Array<{ file: File; relativePath: string }>) => {
      if (files.length === 0) return;
      const targetParentId = await resolveCurrentId();
      if (!targetParentId) return;

      // Enforce caps BEFORE kicking anything off.
      if (files.length > MAX_FILES_PER_UPLOAD) {
        toast({
          title: `Too many files`,
          description: `Drop contains ${files.length} files; max ${MAX_FILES_PER_UPLOAD} per upload.`,
          status: "error",
          duration: 6000,
        });
        return;
      }
      const oversized = files.find((e) => e.file.size > MAX_FILE_BYTES);
      if (oversized) {
        toast({
          title: "File too large",
          description: `"${oversized.file.name}" is ${(oversized.file.size / 1024 / 1024).toFixed(1)} MB; max ${MAX_FILE_BYTES / 1024 / 1024} MB per file.`,
          status: "error",
          duration: 6000,
        });
        return;
      }

      folderUploadCancelledRef.current = false;
      setFolderUpload({
        phase: "running",
        total: files.length,
        completed: 0,
        skipped: 0,
        failed: 0,
        cancelled: false,
      });

      // Group files by their directory chain. "Folder/Sub/file.pdf"
      // becomes chain ["Folder","Sub"]. Empty chain ⇒ file sits at the
      // current folder's root. relativePath is either a real path (folder
      // drop / folder picker) or just the filename (plain file drop).
      const dirMap = new Map<string, string[]>(); // "A/B" → ["A","B"]
      const fileEntries: Array<{ file: File; dirKey: string }> = [];
      for (const entry of files) {
        const parts = entry.relativePath.split("/");
        const chain = parts.slice(0, -1); // drop filename
        const key = chain.join("/");
        if (!dirMap.has(key)) dirMap.set(key, chain);
        fileEntries.push({ file: entry.file, dirKey: key });
      }

    // Phase 1: materialize the directory tree. Serial — each call is cheap,
    // and doing it serially sidesteps any races creating the same
    // subfolder twice under a shared parent.
    const dirIds = new Map<string, string>(); // "A/B" → FileNode._id
    for (const [key, chain] of dirMap.entries()) {
      if (folderUploadCancelledRef.current) break;
      try {
        if (chain.length === 0) {
          dirIds.set(key, targetParentId);
        } else {
          const result = await ensureFolderPath({
            variables: { rootId: targetParentId, segments: chain },
          });
          const leaf = (result.data as any)?.ensureFolderPath;
          if (leaf?._id) dirIds.set(key, leaf._id);
        }
      } catch (err) {
        // If we can't create a directory, none of its files can land —
        // mark them as failed and continue with other paths.
        const count = fileEntries.filter((e) => e.dirKey === key).length;
        setFolderUpload((s) =>
          s ? { ...s, failed: s.failed + count, completed: s.completed + count } : s
        );
        // eslint-disable-next-line no-console
        console.error("ensureFolderPath failed for", key, err);
      }
    }

    // Phase 2: upload files with a small concurrency pool. Promise-based
    // semaphore — workers pull from the shared queue until it's empty.
    const queue = fileEntries.slice();
    const worker = async () => {
      while (queue.length > 0) {
        if (folderUploadCancelledRef.current) return;
        const entry = queue.shift();
        if (!entry) return;
        const parentId = dirIds.get(entry.dirKey);
        if (!parentId) {
          // Directory failed earlier; already counted as failed.
          continue;
        }
        try {
          await uploadDocumentRaw({
            variables: {
              input: {
                parentFileNodeId: parentId,
                fileUpload: entry.file,
                displayName: entry.file.name,
              },
            },
          });
          setFolderUpload((s) => (s ? { ...s, completed: s.completed + 1 } : s));
        } catch (err) {
          // Duplicate filename in same folder → skip silently. Anything
          // else is a real failure.
          const msg = (err as Error).message ?? "";
          if (msg.includes("already exists")) {
            setFolderUpload((s) =>
              s
                ? { ...s, completed: s.completed + 1, skipped: s.skipped + 1 }
                : s
            );
          } else {
            setFolderUpload((s) =>
              s
                ? { ...s, completed: s.completed + 1, failed: s.failed + 1 }
                : s
            );
            // eslint-disable-next-line no-console
            console.error("uploadDocument failed for", entry.file.name, err);
          }
        }
      }
    };

    await Promise.all(
      Array.from({ length: UPLOAD_CONCURRENCY }, () => worker())
    );

    setFolderUpload((s) =>
      s ? { ...s, phase: "done", cancelled: folderUploadCancelledRef.current } : s
    );
    refetchAll();
  }, [resolveCurrentId, ensureFolderPath, refetchAll, toast, uploadDocumentRaw]);

  const handleFolderSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    e.target.value = "";
    if (!fileList || fileList.length === 0) return;
    // Input-picked files carry a webkitRelativePath like "Folder/Sub/file.pdf";
    // a plain file picker passes empty-string there so we fall back to the
    // filename (placing files at the scope root).
    const entries = Array.from(fileList).map((f) => ({
      file: f,
      relativePath: ((f as any).webkitRelativePath as string) || f.name,
    }));
    await uploadEntries(entries);
  };

  /**
   * Walk a DataTransferItemList (from an external OS drag) and collect
   * every file with its relative path reconstructed from the directory
   * structure. Uses the File System Entry API (webkitGetAsEntry) for
   * folder support; falls back to the flat FileList if entries aren't
   * available (some niche browsers / synthetic events).
   */
  const collectDroppedEntries = React.useCallback(
    async (
      dataTransfer: DataTransfer
    ): Promise<Array<{ file: File; relativePath: string }>> => {
      const out: Array<{ file: File; relativePath: string }> = [];

      async function walk(entry: FileSystemEntry, prefix: string): Promise<void> {
        if (entry.isFile) {
          const file = await new Promise<File>((resolve, reject) =>
            (entry as FileSystemFileEntry).file(resolve, reject)
          );
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
          out.push({ file, relativePath: rel });
        } else if (entry.isDirectory) {
          const reader = (entry as FileSystemDirectoryEntry).createReader();
          const sub = prefix ? `${prefix}/${entry.name}` : entry.name;
          // readEntries returns at most 100 entries per call — loop until exhausted.
          while (true) {
            const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
              reader.readEntries(resolve, reject)
            );
            if (batch.length === 0) break;
            for (const e of batch) await walk(e, sub);
          }
        }
      }

      if (dataTransfer.items && dataTransfer.items.length > 0) {
        const entries: FileSystemEntry[] = [];
        for (let i = 0; i < dataTransfer.items.length; i++) {
          const entry = dataTransfer.items[i].webkitGetAsEntry?.();
          if (entry) entries.push(entry);
        }
        for (const entry of entries) await walk(entry, "");
      } else if (dataTransfer.files) {
        for (let i = 0; i < dataTransfer.files.length; i++) {
          const f = dataTransfer.files[i];
          out.push({ file: f, relativePath: f.name });
        }
      }
      return out;
    },
    []
  );

  const [isExternalDragOver, setIsExternalDragOver] = React.useState(false);
  const [isInternalDragOver, setIsInternalDragOver] = React.useState(false);

  // Combined drag-over handler for the content area. Handles two cases:
  //   - Internal node drag (DRAG_MIME): user is moving an existing file/
  //     folder into the currently viewed folder (empty space drop).
  //   - External OS drag (Files): user is uploading from their desktop.
  // Individual row/breadcrumb handlers win when the cursor is over them
  // (they stopPropagation on drop to prevent the outer handler firing).
  const handleContentDragOver = (e: React.DragEvent) => {
    // Read-only mode ignores every drag — don't preventDefault so the
    // browser falls through to its default "can't drop here" cursor.
    if (readOnly) return;
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!isInternalDragOver) setIsInternalDragOver(true);
      return;
    }
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!isExternalDragOver) setIsExternalDragOver(true);
    }
  };

  const handleContentDragLeave = (e: React.DragEvent) => {
    // dragleave also fires when moving between child elements. Only clear
    // the highlight when truly leaving the drop zone (relatedTarget is
    // either null or outside currentTarget).
    const to = e.relatedTarget as Node | null;
    if (to && (e.currentTarget as Node).contains(to)) return;
    setIsExternalDragOver(false);
    setIsInternalDragOver(false);
  };

  const handleContentDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsExternalDragOver(false);
    setIsInternalDragOver(false);
    cancelSpringLoad();

    // Internal drag — move the dragged node into the current folder.
    // Internal moves are meaningless when there's no root yet (nothing
    // to drag), so skip without provisioning.
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (raw) {
      if (!currentId) return;
      try {
        const payload = JSON.parse(raw) as DragPayload;
        doMove(payload, currentId);
      } catch {
        // ignore malformed payload
      }
      return;
    }

    // External drag — upload files/folders from the OS.
    if (!e.dataTransfer.types.includes("Files")) return;
    if (!canMutateHere) {
      toast({
        title: "Can't upload here",
        description: "This folder is read-only.",
        status: "warning",
        duration: 4000,
      });
      return;
    }
    const entries = await collectDroppedEntries(e.dataTransfer);
    if (entries.length === 0) return;
    await uploadEntries(entries);
  };

  const startRename = (node: FileNodeRow) => {
    setRenamingId(node._id);
    setRenameValue(node.name);
  };

  const submitRename = (node: FileNodeRow) => {
    const next = renameValue.trim();
    if (!next || next === node.name) {
      setRenamingId(null);
      return;
    }
    renameNode({
      variables: { id: node._id, expectedVersion: node.version, name: next },
    });
  };

  const confirmTrash = (node: FileNodeRow) => {
    setPendingTrash(node);
    trashDialog.onOpen();
  };

  const doTrash = () => {
    if (!pendingTrash) return;
    trashNode({
      variables: { id: pendingTrash._id, expectedVersion: pendingTrash.version },
    });
    trashDialog.onClose();
    setPendingTrash(null);
  };

  const doRestore = (node: FileNodeRow) =>
    restoreNode({
      variables: { id: node._id, expectedVersion: node.version },
    });

  const openFile = (node: FileNodeRow) => {
    if (!node.documentId) return;
    // Don't open the viewer for trashed files — they're inert until restored.
    if (node.deletedAt) return;
    // Host override (e.g. tender Documents tab renders FileViewer in-place
    // so users can create doc-refs from the clicked file).
    if (onFileClick) {
      onFileClick(node);
      return;
    }
    setViewerNode(node);
  };

  const cancelPendingClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  };

  const handleRowClick = (node: FileNodeRow, isTrashed: boolean) => {
    if (renamingId === node._id) return;
    cancelPendingClick();
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (node.type === "folder" && !isTrashed) {
        setCurrentId(node._id);
      } else if (node.type === "file" && !isTrashed) {
        openFile(node);
      }
    }, DOUBLE_CLICK_MS);
  };

  const handleRowDoubleClick = (node: FileNodeRow) => {
    cancelPendingClick();
    if (readOnly) return;
    if (node.isReservedRoot) return;
    if (node.systemManaged) return;
    if (node.deletedAt) return;
    startRename(node);
  };

  const anyMutating =
    createFolderResult.loading ||
    renameResult.loading ||
    trashResult.loading ||
    restoreResult.loading ||
    uploadResult.loading ||
    moveResult.loading;

  // Breadcrumbs come back as the full chain from filesystem root → current.
  // Scoped mode trims everything above rootId; global mode keeps it all.
  const fullCrumbs = breadcrumbsQuery.data?.fileNodeBreadcrumbs ?? [];
  const rootIndexInChain = fullCrumbs.findIndex((c) => c._id === rootId);
  let crumbs: FileNodeRow[] =
    breadcrumbMode === "scoped" && rootIndexInChain >= 0
      ? fullCrumbs.slice(rootIndexInChain)
      : fullCrumbs;
  // Pre-provisioning: no rootId yet, no breadcrumb chain to slice. Synthesize
  // a placeholder root crumb from rootLabel so the breadcrumb bar still
  // shows something (matching the shape the scoped-root rendering expects).
  // The placeholder disappears naturally once the root is created and the
  // real breadcrumbs query fires.
  if (crumbs.length === 0 && !rootId && rootLabel) {
    crumbs = [
      {
        _id: "__pending_root__" as any,
        name: rootLabel,
        type: "folder",
      } as any as FileNodeRow,
    ];
  }
  const children = childrenQuery.data?.fileNodeChildren ?? [];
  // Mutation rules:
  // - Global / dev mode: block at the filesystem root (depth 0) and at the
  //   top-level namespace roots (/tenders, /jobsites, …) since those are
  //   reserved and only accept per-entity roots inserted transactionally.
  // - Embedded / pinned mode: we're already scoped to a writable root
  //   (e.g. per-entity root or a specs folder) — mutate anywhere below.
  // Read-only mode blanket-disables every mutation affordance. The
  // pinRoot / namespace-depth heuristic still applies when we're
  // otherwise allowed to mutate — read-only just forces it to false.
  const canMutateHere =
    !readOnly && (pinRoot ? true : fullCrumbs.length >= 3);

  return (
    <Box h={compact ? "100%" : undefined} display="flex" flexDir="column">
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        overflow="hidden"
        bg="white"
        display="flex"
        flexDir="column"
        flex={compact ? 1 : undefined}
        minH={0}
        {...(compact ? {} : { maxH: "calc(100vh - 220px)" })}
      >
      <HStack
        justify="space-between"
        wrap="wrap"
        bg="gray.50"
        borderBottom="1px solid"
        borderColor="gray.200"
        px={3}
        py={2}
        flexShrink={0}
        zIndex={2}
      >
        <HStack spacing={2} flex={1} minW={0}>
          <Breadcrumb fontSize="sm">
            {(() => {
              // For deep paths, collapse middle ancestors into a "…" dropdown.
              // Always preserve home (first) + the last N-2 crumbs so the
              // user sees root + immediate context + current location.
              const MAX_VISIBLE = 4;
              let visible = crumbs;
              let hidden: typeof crumbs = [];
              if (crumbs.length > MAX_VISIBLE) {
                visible = [crumbs[0], ...crumbs.slice(crumbs.length - (MAX_VISIBLE - 2))];
                hidden = crumbs.slice(1, crumbs.length - (MAX_VISIBLE - 2));
              }

              const renderCrumb = (c: FileNodeRow) => {
                const isActualLast = c._id === crumbs[crumbs.length - 1]._id;
                const isDropTarget = !isActualLast && dropTargetId === c._id;
                // Root-crumb rendering priorities:
                //   1. Scoped + rootLabel prop overrides the display name
                //      (per-entity roots whose real name is an ObjectId
                //      string want a friendlier label like "Documents")
                //   2. Global mode + filesystem root ("/") gets the home icon
                //   3. Otherwise just show c.name
                const isScopedRoot = c._id === rootId && breadcrumbMode === "scoped";
                const displayName =
                  isScopedRoot && rootLabel ? rootLabel : c.name;
                const showHome =
                  c.name === "/" && breadcrumbMode === "global";
                return (
                  <BreadcrumbItem key={c._id} isCurrentPage={isActualLast}>
                    <BreadcrumbLink
                      onClick={() => !isActualLast && setCurrentId(c._id)}
                      onDragOver={!readOnly && !isActualLast ? handleDragOver(c._id) : undefined}
                      onDragLeave={!readOnly && !isActualLast ? handleDragLeave : undefined}
                      onDrop={!readOnly && !isActualLast ? handleDrop(c._id) : undefined}
                      cursor={isActualLast ? "default" : "pointer"}
                      fontWeight={isActualLast ? "semibold" : "normal"}
                      bg={isDropTarget ? "blue.100" : undefined}
                      borderRadius={isDropTarget ? "md" : undefined}
                      px={isDropTarget ? 2 : 0}
                      title={showHome ? "Home" : displayName}
                    >
                      {showHome ? (
                        <Box
                          as="span"
                          display="inline-flex"
                          alignItems="center"
                          h="1em"
                          verticalAlign="middle"
                        >
                          <Icon as={FiHome} boxSize="14px" position="relative" top="-1px" />
                        </Box>
                      ) : (
                        <Box
                          as="span"
                          display="inline-block"
                          maxW="200px"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          verticalAlign="bottom"
                        >
                          {displayName}
                        </Box>
                      )}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                );
              };

              // Return an array (not a fragment) so Chakra's Breadcrumb walks
              // each item individually and injects separators between them —
              // a fragment counts as one child and breaks separator injection.
              if (hidden.length === 0) {
                return visible.map((c) => renderCrumb(c));
              }
              return [
                renderCrumb(visible[0]),
                <BreadcrumbItem key="__ellipsis">
                  <Menu isLazy placement="bottom-start" strategy="fixed">
                    <MenuButton
                      as={BreadcrumbLink}
                      cursor="pointer"
                      title={`Show ${hidden.length} hidden`}
                    >
                      …
                    </MenuButton>
                    <Portal>
                      <MenuList zIndex="popover" minW="14rem">
                        {hidden.map((h) => (
                          <MenuItem
                            key={h._id}
                            onClick={() => setCurrentId(h._id)}
                            onDragOver={!readOnly ? handleDragOver(h._id) : undefined}
                            onDragLeave={!readOnly ? handleDragLeave : undefined}
                            onDrop={!readOnly ? handleDrop(h._id) : undefined}
                          >
                            {h.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Portal>
                  </Menu>
                </BreadcrumbItem>,
                ...visible.slice(1).map((c) => renderCrumb(c)),
              ];
            })()}
          </Breadcrumb>
          {childrenQuery.loading && (
            <Spinner size="xs" color="gray.400" title="Refreshing…" />
          )}
        </HStack>
        <HStack spacing={1}>
          {/* View menu — currently just Show trashed, room for future sort/filter toggles. */}
          <Menu isLazy placement="bottom-end" strategy="fixed" closeOnSelect={false}>
            <MenuButton
              as={IconButton}
              icon={<FiEye />}
              variant="ghost"
              size="sm"
              aria-label="View options"
              title="View options"
            />
            <Portal>
              <MenuList zIndex="popover" minW="11rem">
                <MenuItem
                  icon={includeTrashed ? <FiCheck /> : <Box w={3} />}
                  onClick={() => setIncludeTrashed((v) => !v)}
                >
                  Show trashed
                </MenuItem>
              </MenuList>
            </Portal>
          </Menu>

          {/* Add menu — New folder / Upload file. Hidden entirely in
              read-only mode so the header stays tidy. */}
          {!readOnly && (
          <Menu isLazy placement="bottom-end" strategy="fixed">
            <MenuButton
              as={IconButton}
              icon={<FiPlus />}
              variant="solid"
              colorScheme="blue"
              size="sm"
              aria-label="Add"
              title="Add"
              isDisabled={!canMutateHere || anyMutating}
            />
            <Portal>
              <MenuList zIndex="popover" minW="11rem">
                <MenuItem icon={<FiFolderPlus />} onClick={handleNewFolder}>
                  New folder
                </MenuItem>
                <MenuItem icon={<FiUpload />} onClick={handleUploadClick}>
                  Upload file
                </MenuItem>
                <MenuItem icon={<FiFolder />} onClick={handleUploadFolderClick}>
                  Upload folder
                </MenuItem>
              </MenuList>
            </Portal>
          </Menu>
          )}

          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
          {/* Chromium + Firefox + Safari all honour the non-standard
              webkitdirectory attribute to pick a folder. Cast via any
              because React's HTMLInputElement types don't include it. */}
          <input
            ref={folderInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFolderSelected}
            {...({ webkitdirectory: "", directory: "" } as any)}
            multiple
          />
        </HStack>
      </HStack>

      <Box
        onContextMenu={(e) => {
          // Only intercept right-click on the folder area itself (empty
          // space, table body), not on interactive descendants that might
          // want their own context behaviour later. We also skip when the
          // user can't mutate here — falling through to the browser menu
          // is fine at read-only namespace roots.
          if (!canMutateHere) return;
          const target = e.target as HTMLElement;
          // Let <a>, <input>, <button> and <select> keep their native menus.
          if (target.closest("a, input, button, select, [data-row-actions]"))
            return;
          e.preventDefault();
          setRightClickPos({ x: e.clientX, y: e.clientY });
        }}
        onDragOver={handleContentDragOver}
        onDragLeave={handleContentDragLeave}
        onDrop={handleContentDrop}
        flex={1}
        minH={compact ? 0 : "200px"}
        overflowY="auto"
        p={2}
        position="relative"
        bg={
          isExternalDragOver
            ? "blue.50"
            : isInternalDragOver && !dropTargetId
              ? "blue.50"
              : undefined
        }
        outline={
          isExternalDragOver
            ? "2px dashed"
            : isInternalDragOver && !dropTargetId
              ? "2px dashed"
              : undefined
        }
        outlineColor={
          isExternalDragOver || (isInternalDragOver && !dropTargetId)
            ? "blue.400"
            : undefined
        }
        outlineOffset={
          isExternalDragOver || (isInternalDragOver && !dropTargetId)
            ? "-4px"
            : undefined
        }
        transition="background-color 0.15s, outline-color 0.15s"
      >
        {children.length === 0 && !childrenQuery.loading && (
          <Flex
            h="100%"
            minH="200px"
            direction="column"
            align="center"
            justify="center"
            gap={4}
            color="gray.400"
            p={6}
            textAlign="center"
          >
            <Icon as={FiFolder} boxSize={12} color="gray.300" />
            <Box>
              <Text color="gray.600" fontWeight="medium">
                This folder is empty
              </Text>
              <Text fontSize="sm" color="gray.500" mt={1}>
                {canMutateHere
                  ? "Add a folder or upload files to get started."
                  : "Nothing has been added here yet."}
              </Text>
            </Box>
            {canMutateHere && (
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FiFolderPlus />}
                  onClick={handleNewFolder}
                  isDisabled={anyMutating}
                >
                  New folder
                </Button>
                <Button
                  size="sm"
                  colorScheme="blue"
                  leftIcon={<FiUpload />}
                  onClick={handleUploadClick}
                  isDisabled={anyMutating}
                >
                  Upload file
                </Button>
              </HStack>
            )}
          </Flex>
        )}

        {children.length > 0 && (
          <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th width="1"></Th>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th width="1"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {children.map((c) => {
              const isTrashed = !!c.deletedAt;
              const canFolderDescend = c.type === "folder" && !isTrashed;
              const isDraggable =
                !readOnly &&
                !c.isReservedRoot &&
                !c.systemManaged &&
                !isTrashed &&
                renamingId !== c._id;
              const isDropTarget = !readOnly && c.type === "folder" && !isTrashed;
              const showDropHighlight = isDropTarget && dropTargetId === c._id;
              return (
                <Tr
                  key={c._id}
                  opacity={isTrashed ? 0.55 : 1}
                  bg={showDropHighlight ? "blue.50" : undefined}
                  _hover={!isTrashed && !showDropHighlight ? { bg: "gray.100" } : undefined}
                  draggable={isDraggable}
                  onDragStart={isDraggable ? handleDragStart(c) : undefined}
                  onDragOver={isDropTarget ? handleDragOver(c._id) : undefined}
                  onDragLeave={isDropTarget ? handleDragLeave : undefined}
                  onDrop={isDropTarget ? handleDrop(c._id) : undefined}
                  onContextMenu={(e) => {
                    // In read-only mode, skip our custom menu and let the
                    // browser's native menu (Copy link, etc.) fall through.
                    if (readOnly) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setRowContext({ pos: { x: e.clientX, y: e.clientY }, node: c });
                  }}
                >
                  <Td>
                    <Icon
                      as={c.type === "folder" ? FiFolder : FiFile}
                      color={c.type === "folder" ? "blue.500" : "gray.500"}
                    />
                  </Td>
                  <Td
                    fontWeight={c.type === "folder" ? "medium" : "normal"}
                    cursor={
                      renamingId === c._id
                        ? "text"
                        : canFolderDescend || (c.type === "file" && !isTrashed)
                          ? "pointer"
                          : "default"
                    }
                    onClick={() => handleRowClick(c, isTrashed)}
                    onDoubleClick={() => handleRowDoubleClick(c)}
                  >
                    <HStack spacing={2}>
                      {renamingId === c._id ? (
                        <Input
                          size="sm"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => submitRename(c)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRename(c);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <Text as="span">{c.name}</Text>
                      )}
                      {c.enrichment && (
                        <EnrichmentIndicator enrichment={c.enrichment} />
                      )}
                      {isTrashed && (
                        <Badge colorScheme="red" fontSize="2xs">
                          trashed
                        </Badge>
                      )}
                      {c.isReservedRoot && (
                        <Icon as={FiLock} color="purple.500" boxSize={3} title="Reserved" />
                      )}
                      {c.systemManaged && !c.isReservedRoot && (
                        <Icon
                          as={FiLock}
                          color="gray.400"
                          boxSize={3}
                          title="System-managed — rename/move/trash blocked"
                        />
                      )}
                      {c.minRole && c.minRole !== UserRoles.User && (
                        <Icon
                          as={FiShield}
                          color="orange.500"
                          boxSize={3}
                          title={`Restricted: ${ROLE_LABELS[c.minRole] ?? c.minRole}`}
                        />
                      )}
                    </HStack>
                  </Td>
                  <Td>
                    <Text fontSize="xs" color="gray.600" title={c.mimetype ?? undefined}>
                      {c.type === "folder" ? "folder" : friendlyMime(c.mimetype)}
                    </Text>
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <Menu isLazy placement="bottom-end" strategy="fixed">
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="xs"
                        aria-label="Row actions"
                      />
                      <Portal>
                        <MenuList zIndex="popover" minW="12rem">
                          <MenuItem
                            icon={<FiInfo />}
                            onClick={() => setPropertiesNode(c)}
                          >
                            Properties
                          </MenuItem>
                          {!readOnly && !c.isReservedRoot && !c.systemManaged && (
                            isTrashed ? (
                              <MenuItem
                                icon={<FiRotateCcw />}
                                onClick={() => doRestore(c)}
                              >
                                Restore
                              </MenuItem>
                            ) : (
                              <>
                                <MenuItem
                                  icon={<FiEdit2 />}
                                  onClick={() => startRename(c)}
                                >
                                  Rename
                                </MenuItem>
                                {canSetMinRole && (
                                  <>
                                    <MenuDivider />
                                    <MenuOptionGroup
                                      title="Access"
                                      type="radio"
                                      value={accessValueFor(c)}
                                      onChange={(v) =>
                                        setMinRole(
                                          c,
                                          v === ACCESS_UNSET
                                            ? null
                                            : (v as UserRoles)
                                        )
                                      }
                                    >
                                      <MenuItemOption value={ACCESS_UNSET}>
                                        All users
                                      </MenuItemOption>
                                      {ROLE_CHOICES.filter(
                                        (r) => r !== UserRoles.User
                                      ).map((role) => (
                                        <MenuItemOption
                                          key={role}
                                          value={role}
                                        >
                                          {ROLE_LABELS[role]}
                                        </MenuItemOption>
                                      ))}
                                    </MenuOptionGroup>
                                    <MenuDivider />
                                  </>
                                )}
                                <MenuItem
                                  icon={<FiTrash2 />}
                                  color="red.500"
                                  onClick={() => confirmTrash(c)}
                                >
                                  Trash
                                </MenuItem>
                              </>
                            )
                          )}
                          </MenuList>
                        </Portal>
                      </Menu>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
        )}

        {/* Row context menu — right-click on a row opens the same actions
            as the ⋮ button, anchored at the cursor. */}
        <Menu
          isOpen={!!rowContext}
          onClose={() => setRowContext(null)}
          placement="bottom-start"
          strategy="fixed"
        >
          <MenuButton
            as={Box}
            style={{
              position: "fixed",
              top: rowContext?.pos.y ?? 0,
              left: rowContext?.pos.x ?? 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
            }}
          />
          <Portal>
            <MenuList zIndex="popover" minW="12rem">
              {rowContext && (
                <>
                  <MenuItem
                    icon={<FiInfo />}
                    onClick={() => {
                      setPropertiesNode(rowContext.node);
                      setRowContext(null);
                    }}
                  >
                    Properties
                  </MenuItem>
                  {!rowContext.node.isReservedRoot &&
                  !rowContext.node.systemManaged && (
                    rowContext.node.deletedAt ? (
                      <MenuItem
                        icon={<FiRotateCcw />}
                        onClick={() => {
                          doRestore(rowContext.node);
                          setRowContext(null);
                        }}
                      >
                        Restore
                      </MenuItem>
                    ) : (
                      <>
                        <MenuItem
                          icon={<FiEdit2 />}
                          onClick={() => {
                            startRename(rowContext.node);
                            setRowContext(null);
                          }}
                        >
                          Rename
                        </MenuItem>
                        {canSetMinRole && (
                          <>
                            <MenuDivider />
                            <MenuOptionGroup
                              title="Access"
                              type="radio"
                              value={accessValueFor(rowContext.node)}
                              onChange={(v) => {
                                setMinRole(
                                  rowContext.node,
                                  v === ACCESS_UNSET
                                    ? null
                                    : (v as UserRoles)
                                );
                                setRowContext(null);
                              }}
                            >
                              <MenuItemOption value={ACCESS_UNSET}>
                                All users
                              </MenuItemOption>
                              {ROLE_CHOICES.filter(
                                (r) => r !== UserRoles.User
                              ).map((role) => (
                                <MenuItemOption key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </MenuItemOption>
                              ))}
                            </MenuOptionGroup>
                            <MenuDivider />
                          </>
                        )}
                        <MenuItem
                          icon={<FiTrash2 />}
                          color="red.500"
                          onClick={() => {
                            confirmTrash(rowContext.node);
                            setRowContext(null);
                          }}
                        >
                          Trash
                        </MenuItem>
                      </>
                    )
                  )}
                </>
              )}
            </MenuList>
          </Portal>
        </Menu>

        {/* Virtual-anchor context menu for right-click on empty folder area.
            The invisible Box at MenuButton acts as a Popper anchor positioned
            exactly at the click coordinates. */}
        <Menu
          isOpen={!!rightClickPos}
          onClose={() => setRightClickPos(null)}
          placement="bottom-start"
          strategy="fixed"
        >
          <MenuButton
            as={Box}
            style={{
              position: "fixed",
              top: rightClickPos?.y ?? 0,
              left: rightClickPos?.x ?? 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
            }}
          />
          <Portal>
            <MenuList zIndex="popover" minW="11rem">
              <MenuItem
                icon={<FiFolderPlus />}
                onClick={() => {
                  setRightClickPos(null);
                  handleNewFolder();
                }}
              >
                New folder
              </MenuItem>
              <MenuItem
                icon={<FiUpload />}
                onClick={() => {
                  setRightClickPos(null);
                  handleUploadClick();
                }}
              >
                Upload file
              </MenuItem>
            </MenuList>
          </Portal>
        </Menu>
      </Box>
      </Box>

      <AlertDialog
        isOpen={trashDialog.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={trashDialog.onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Trash &quot;{pendingTrash?.name}&quot;?
            </AlertDialogHeader>
            <AlertDialogBody>
              {pendingTrash?.type === "folder"
                ? "This folder and all its descendants will be soft-deleted. You can restore them from the Show trashed view."
                : "This file will be soft-deleted. You can restore it from the Show trashed view."}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={trashDialog.onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={doTrash} ml={3}>
                Trash
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <PropertiesDrawer
        node={propertiesNode}
        onClose={() => setPropertiesNode(null)}
      />

      <DocumentViewerModal
        file={
          viewerNode && viewerNode.documentId
            ? {
                enrichedFileId: viewerNode.documentId,
                fileName: viewerNode.name,
                mimetype: viewerNode.mimetype ?? undefined,
              }
            : null
        }
        onClose={() => setViewerNode(null)}
      />

      {/* Folder upload progress. Blocks the current user's interaction
          while in "running" (can cancel); closable once "done". Uploads
          that are mid-HTTP when cancel is pressed will still complete on
          the server — we just stop starting new ones. */}
      <Modal
        isOpen={!!folderUpload}
        onClose={() => {
          if (folderUpload?.phase === "done") setFolderUpload(null);
        }}
        closeOnOverlayClick={folderUpload?.phase === "done"}
        closeOnEsc={folderUpload?.phase === "done"}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {folderUpload?.phase === "running" ? "Uploading folder…" : "Upload complete"}
          </ModalHeader>
          {folderUpload?.phase === "done" && <ModalCloseButton />}
          <ModalBody>
            {folderUpload && (
              <Box>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  {folderUpload.completed} of {folderUpload.total} files processed
                  {folderUpload.skipped > 0 && ` · ${folderUpload.skipped} skipped (duplicate)`}
                  {folderUpload.failed > 0 && ` · ${folderUpload.failed} failed`}
                  {folderUpload.cancelled && " · cancelled"}
                </Text>
                <Progress
                  value={
                    folderUpload.total > 0
                      ? (folderUpload.completed / folderUpload.total) * 100
                      : 0
                  }
                  size="sm"
                  colorScheme={
                    folderUpload.phase === "done" && folderUpload.failed === 0
                      ? "green"
                      : "blue"
                  }
                />
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            {folderUpload?.phase === "running" ? (
              <Button
                variant="ghost"
                onClick={() => {
                  folderUploadCancelledRef.current = true;
                }}
              >
                Cancel
              </Button>
            ) : (
              <Button onClick={() => setFolderUpload(null)}>Close</Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default FileBrowser;
