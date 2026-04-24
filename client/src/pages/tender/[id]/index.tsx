import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  IconButton,
  Spinner,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { gql, useQuery, useMutation } from "@apollo/client";
import * as Apollo from "@apollo/client";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import {
  FiAlignLeft,
  FiBarChart2,
  FiBriefcase,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronsLeft,
  FiChevronsRight,
  FiDownload,
  FiEdit3,
  FiFolder,
  FiMaximize2,
  FiMessageSquare,
  FiMinimize2,
  FiX,
} from "react-icons/fi";
import Permission from "../../../components/Common/Permission";
import Breadcrumbs from "../../../components/Common/Breadcrumbs";
import ClientOnly from "../../../components/Common/ClientOnly";
import PricingSheet from "../../../components/TenderPricing/PricingSheet";
import PricingSummary from "../../../components/TenderPricing/PricingSummary";
import TenderDemandTab from "../../../components/TenderPricing/TenderDemandTab";
import TenderOverview from "../../../components/Tender/TenderOverview";
import TenderSummaryTab from "../../../components/Tender/TenderSummaryTab";
import TenderNotesTab from "../../../components/Tender/TenderNotesTab";
import EntityFileBrowser from "../../../components/FileBrowser/EntityFileBrowser";
import DocumentViewerModal, {
  DocumentViewerFile,
} from "../../../components/Common/DocumentViewerModal";
import TenderReviewTab from "../../../components/Tender/TenderReviewTab";
import { TenderPricingSheet } from "../../../components/TenderPricing/types";
import { TenderDetail } from "../../../components/Tender/types";
import { UserRoles } from "../../../generated/graphql";
import { navbarHeight } from "../../../constants/styles";
import { localStorageTokenKey, useAuth } from "../../../contexts/Auth";
import ChatDrawer from "../../../components/Chat/ChatDrawer";
import TenderMobileLayout from "../../../components/Tender/TenderMobileLayout";

// Lazy-load PdfViewer to avoid SSR issues with react-pdf
const PdfViewer = dynamic(
  () => import("../../../components/TenderPricing/PdfViewer"),
  { ssr: false, loading: () => <Flex h="100%" align="center" justify="center"><Spinner /></Flex> }
);

// ─── GQL ─────────────────────────────────────────────────────────────────────

const SHEET_QUERY = gql`
  query TenderPricingSheetQuery($tenderId: ID!) {
    tenderPricingSheet(tenderId: $tenderId) {
      _id
      defaultMarkupPct
      rows {
        _id
        type
        sortOrder
        itemNumber
        description
        indentLevel
        quantity
        unit
        unitPrice
        notes
        markupOverride
        rateBuildupSnapshots {
          snapshot
          memo
        }
        rateBuildupOutputs {
          kind
          materialId
          crewKindId
          unit
          perUnitValue
          totalValue
        }
        extraUnitPrice
        extraUnitPriceMemo
        status
        docRefs {
          _id
          enrichedFileId
          page
          description
        }
      }
    }
  }
`;

const TENDER_QUERY = gql`
  query TenderPricingWorkbench($id: ID!) {
    tender(id: $id) {
      _id
      name
      jobcode
      status
      description
      createdAt
      updatedAt
      files {
        _id
        documentType
        summaryStatus
        summaryError
        pageCount
        processingStartedAt
        summaryProgress {
          phase
          current
          total
          updatedAt
        }
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
      documents {
        _id
        documentId
        name
        mimetype
        enrichment {
          status
          summaryError
          pageCount
          processingStartedAt
          summaryProgress {
            phase
            current
            total
            updatedAt
          }
          summary {
            overview
            documentType
            keyTopics
          }
        }
      }
      fileCategories {
        _id
        name
        order
        fileIds
      }
      notes {
        _id
        content
        savedBy {
          name
        }
        savedAt
        conversationId
      }
      summaryGenerating
      jobSummary {
        content
        generatedAt
        generatedBy
        generatedFrom
      }
      jobsite {
        _id
        name
      }
    }
  }
`;

const CREATE_SHEET = gql`
  mutation TenderPricingSheetCreate($tenderId: ID!) {
    tenderPricingSheetCreate(tenderId: $tenderId) {
      _id
      defaultMarkupPct
      rows {
        _id
        type
        sortOrder
        itemNumber
        description
        indentLevel
        quantity
        unit
        unitPrice
        notes
        markupOverride
        rateBuildupSnapshots {
          snapshot
          memo
        }
        rateBuildupOutputs {
          kind
          materialId
          crewKindId
          unit
          perUnitValue
          totalValue
        }
        extraUnitPrice
        extraUnitPriceMemo
        status
      }
    }
  }
`;

// ─── Chat suggestions ─────────────────────────────────────────────────────────

const TENDER_SUGGESTIONS = [
  "Summarize the key scope of work from the documents",
  "What are the main risks identified in the tender documents?",
  "List any environmental or geotechnical requirements",
  "What are the bonding and insurance requirements?",
];

// ─── Panel tab types ──────────────────────────────────────────────────────────

type RightTab = "job" | "documents" | "notes" | "summary" | "demand" | "review";
// Panel states:
// - "open"       : rail + content + resize handle (default working state)
// - "collapsed"  : rail only (tab icons visible; content + handle hidden).
//                  Clicking a tab icon expands back to "open" on that tab.
// - "fullscreen" : panel fills the viewport, pricing hidden.
type PanelState = "open" | "collapsed" | "fullscreen";

// ─── File URL helper ──────────────────────────────────────────────────────────

const apiBase = "";

function buildFileUrl(fileId: string, stream = false): string {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (stream) params.set("stream", "1");
  const qs = params.toString();
  return `${apiBase}/api/documents/${fileId}${qs ? `?${qs}` : ""}`;
}

// ─── Inline file viewer (PDF or fallback) ─────────────────────────────────────

// FileViewer operates directly on Document id + display metadata rather
// than the legacy EnrichedFile-shaped TenderFileItem. This lets it open
// files uploaded via the new FileBrowser (which generate fresh
// Document._ids) without needing a lookup into Tender.files.
export interface OpenFileView {
  documentId: string;
  fileName?: string;
  mimetype?: string;
}

interface FileViewerProps {
  file: OpenFileView;
  onBack: () => void;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onExpand?: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({
  file,
  onBack,
  initialPage,
  onPageChange,
  onExpand,
}) => {
  const isPdf =
    file.mimetype === "application/pdf" ||
    file.fileName?.toLowerCase().endsWith(".pdf");

  const fileUrl = buildFileUrl(file.documentId);
  const pdfStreamUrl = buildFileUrl(file.documentId, true);

  return (
    <Flex direction="column" h="100%" overflow="hidden">
      {/* Back strip */}
      <Flex
        h="36px"
        align="center"
        gap={2}
        px={2}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="gray.50"
        flexShrink={0}
      >
        <IconButton
          aria-label="Back to file list"
          icon={<FiChevronLeft size={14} />}
          size="xs"
          variant="ghost"
          onClick={onBack}
        />
        <Text fontSize="xs" color="gray.600" isTruncated flex={1}>
          {file.fileName || "File"}
        </Text>
        {onExpand && (
          <Tooltip label="Open in full-size viewer">
            <IconButton
              aria-label="Open in modal"
              icon={<FiMaximize2 size={13} />}
              size="xs"
              variant="ghost"
              onClick={onExpand}
            />
          </Tooltip>
        )}
        <Tooltip label="Open in new tab">
          <IconButton
            aria-label="Open in new tab"
            icon={<FiDownload size={13} />}
            size="xs"
            variant="ghost"
            onClick={() => window.open(fileUrl, "_blank")}
          />
        </Tooltip>
      </Flex>

      <Box flex={1} overflow="hidden">
        {isPdf ? (
          <ClientOnly>
            <PdfViewer
              url={pdfStreamUrl}
              fileName={file.fileName}
              initialPage={initialPage}
              onPageChange={onPageChange}
            />
          </ClientOnly>
        ) : (
          <Flex h="100%" align="center" justify="center" direction="column" gap={3} p={4}>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Preview not available for this file type.
            </Text>
            <Button size="sm" leftIcon={<FiDownload />} onClick={() => window.open(fileUrl, "_blank")}>
              Open File
            </Button>
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface TenderQueryResult {
  tender: TenderDetail | null;
}

interface TenderQueryVars {
  id: string;
}

const TenderDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const tenderId = typeof id === "string" ? id : "";
  const { state: authState } = useAuth();
  const currentUserId = authState.user?._id;

  const [sheet, setSheet] = useState<TenderPricingSheet | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [pricingViewMode, setPricingViewMode] = useState<"list" | "board">("list");
  const [rightTab, setRightTab] = useState<RightTab>("documents");
  const [panelState, setPanelState] = useState<PanelState>("open");
  const [chatOpen, setChatOpen] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<string | undefined>(undefined);
  const [panelWidthPx, setPanelWidthPx] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<OpenFileView | null>(null);
  const [selectedFilePage, setSelectedFilePage] = useState<number>(1);
  // Doc-ref citations from the pricing sheet open the shared
  // DocumentViewerModal directly — independent of the FileBrowser.
  const [viewerFile, setViewerFile] = useState<DocumentViewerFile | null>(null);
  const isDraggingPanel = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── URL param helpers for docFile / docPage ────────────────────────────��─────
  const setDocUrlParams = useCallback((fileId: string | null, page: number | null) => {
    const url = new URL(window.location.href);
    if (fileId) {
      url.searchParams.set("docFile", fileId);
      url.searchParams.set("docPage", String(page ?? 1));
    } else {
      url.searchParams.delete("docFile");
      url.searchParams.delete("docPage");
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  // Global mouse handlers for panel resize drag
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingPanel.current) return;
      // Panel lives on the LEFT side now, so width grows as the cursor
      // moves right. (Used to be window.innerWidth - e.clientX when the
      // panel was on the right.)
      const newWidth = e.clientX;
      const min = window.innerWidth * 0.25;
      const max = window.innerWidth * 0.5;
      setPanelWidthPx(Math.round(Math.max(min, Math.min(max, newWidth))));
      document.body.style.userSelect = "none";
    };
    const onMouseUp = () => {
      if (isDraggingPanel.current) {
        isDraggingPanel.current = false;
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Open chat drawer and restore conversation if ?conversationId= is in URL
  useEffect(() => {
    if (!router.isReady) return;
    const cid = router.query.conversationId;
    if (typeof cid === "string" && cid) {
      setInitialConversationId(cid);
      setChatOpen(true);
    }
  }, [router.isReady, router.query.conversationId]);

  const { data: tenderData, refetch: refetchTender, startPolling, stopPolling } =
    Apollo.useQuery<TenderQueryResult, TenderQueryVars>(TENDER_QUERY, {
      variables: { id: tenderId },
      skip: !tenderId,
    });

  const tender = tenderData?.tender;

  // Poll while files are non-terminal (pending/processing/partial) or a
  // tender summary is actively regenerating. `partial` counts as non-terminal
  // because the watchdog will retry to complete page indexing — polling
  // keeps the UI live so the user sees recovery happen.
  useEffect(() => {
    const hasNonTerminal = tender?.documents.some((f) => {
      const s = f.enrichment?.status;
      return s === "pending" || s === "processing" || s === "partial";
    });
    if (hasNonTerminal || tender?.summaryGenerating) {
      startPolling(3000);
    } else {
      stopPolling();
    }
  }, [tender?.documents, tender?.summaryGenerating, startPolling, stopPolling]);

  const [createSheet] = useMutation(CREATE_SHEET);

  useQuery(SHEET_QUERY, {
    variables: { tenderId },
    skip: !tenderId || initialized,
    onCompleted: async (data) => {
      if (data.tenderPricingSheet) {
        setSheet(data.tenderPricingSheet);
        setInitialized(true);
      } else {
        const res = await createSheet({ variables: { tenderId } });
        setSheet(res.data.tenderPricingSheetCreate);
        setInitialized(true);
      }
    },
  });

  const tenderLabel = tender ? `${tender.jobcode} — ${tender.name}` : "...";

  const toggleFullscreen = useCallback(() => {
    setPanelState((s) => (s === "fullscreen" ? "open" : "fullscreen"));
  }, []);

  const collapsePanel = useCallback(() => setPanelState("collapsed"), []);
  const expandPanel = useCallback(() => setPanelState("open"), []);

  const handleChatClose = useCallback(() => {
    setChatOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("conversationId");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  // When switching away from documents tab, clear selected file + URL params
  const handleTabChange = useCallback((tab: RightTab) => {
    setRightTab(tab);
    if (tab !== "documents") {
      setSelectedFile(null);
      setDocUrlParams(null, null);
    }
  }, [setDocUrlParams]);

  const handleOpenFile = useCallback(
    (file: OpenFileView, page = 1) => {
      setSelectedFile(file);
      setSelectedFilePage(page);
      setRightTab("documents");
      setDocUrlParams(file.documentId, page);
    },
    [setDocUrlParams]
  );

  const handleCloseFile = useCallback(() => {
    setSelectedFile(null);
    setSelectedFilePage(1);
    setDocUrlParams(null, null);
  }, [setDocUrlParams]);

  const handlePageChange = useCallback((page: number) => {
    setSelectedFilePage(page);
    setDocUrlParams(selectedFile?.documentId ?? null, page);
  }, [selectedFile, setDocUrlParams]);

  const handleDocRefClick = useCallback(
    (enrichedFileId: string, page: number) => {
      // Citations open the shared modal directly. Name/mimetype are
      // optional — the modal falls back to "Document" / PDF default
      // for display. A small enhancement (not done yet): have the modal
      // fetch the missing metadata by documentId from the server.
      setViewerFile({ enrichedFileId, page });
    },
    []
  );

  const panelWidth =
    panelState === "fullscreen"
      ? "100%"
      : panelWidthPx != null
      ? `${panelWidthPx}px`
      : "33vw";
  const showLeft = panelState !== "fullscreen";
  // Rail is always rendered (even when "collapsed") — only the content
  // area and resize handle hide on collapse.
  const showRight = true;
  const contentOpen = panelState === "open" || panelState === "fullscreen";

  const TABS: {
    key: RightTab;
    label: string;
    icon: React.ComponentType;
    badge?: number;
  }[] = [
    { key: "job", label: "Job", icon: FiBriefcase },
    {
      key: "documents",
      label: "Documents",
      icon: FiFolder,
      badge: tender?.documents.length ?? 0,
    },
    {
      key: "notes",
      label: "Notes",
      icon: FiEdit3,
      badge: tender?.notes.length ?? 0,
    },
    { key: "summary", label: "Summary", icon: FiAlignLeft },
    { key: "demand", label: "Demand", icon: FiBarChart2 },
    { key: "review", label: "Review", icon: FiCheckSquare },
  ];

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      {isMobile ? (
        !tender ? (
          <Flex h={`calc(100vh - ${navbarHeight})`} align="center" justify="center">
            <Spinner />
          </Flex>
        ) : (
          <TenderMobileLayout
            tender={tender}
            sheet={sheet}
            onSheetUpdate={setSheet}
            tenderId={tenderId}
            onRefetch={() => refetchTender()}
          />
        )
      ) : (
      <Flex
        direction="column"
        h={`calc(100vh - ${navbarHeight})`}
        w="100%"
        overflow="hidden"
      >
        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <Flex
          h="40px"
          flexShrink={0}
          align="center"
          pl={10}
          pr={4}
          gap={3}
          borderBottom="1px solid"
          borderColor="gray.200"
          bg="white"
        >
          <Breadcrumbs
            crumbs={[
              { title: "Tenders", link: "/tenders" },
              { title: tenderLabel, isCurrentPage: true },
            ]}
          />
          <Box flex={1} />
        </Flex>

        {/* ── Main split ────────────────────────────────────────────────────── */}
        <Flex flex={1} overflow="hidden">
          {/* Left: Panel (with activity-bar rail on its own left edge — i.e.
              the screen edge). Moved from right to left so the rail anchors
              against the viewport rather than floating mid-screen. */}
          {showRight && (
            <Flex
              direction="column"
              w={contentOpen ? panelWidth : "40px"}
              flexShrink={0}
              overflow="hidden"
              position="relative"
              transition="width 0.15s ease"
            >
              {/* Drag handle — on the panel's RIGHT edge, between panel
                  content and pricing. Hidden while collapsed since there's
                  no content to size. */}
              {contentOpen && (
                <Box
                position="absolute"
                right={0}
                top={0}
                bottom={0}
                w="5px"
                cursor="col-resize"
                zIndex={2}
                _hover={{ bg: "blue.200" }}
                transition="background 0.15s"
                onMouseDown={(e) => {
                  e.preventDefault();
                  isDraggingPanel.current = true;
                }}
                />
              )}

              {/* Body: vertical tab rail + tab content. Rail holds both
                  navigation (top) and panel chrome (bottom) — VS Code
                  activity-bar pattern, no separate top strip needed. */}
              <Flex flex={1} overflow="hidden">
                {/* Vertical tab rail */}
                <Flex
                  direction="column"
                  w="40px"
                  flexShrink={0}
                  bg="gray.50"
                  borderRight="1px solid"
                  borderColor="gray.200"
                  py={2}
                  gap={2}
                  align="center"
                >
                  {TABS.map((tab) => {
                    const active = rightTab === tab.key;
                    return (
                      <Tooltip key={tab.key} label={tab.label} placement="right">
                        <Box position="relative">
                          <IconButton
                            aria-label={tab.label}
                            icon={<Icon as={tab.icon} boxSize={4} />}
                            variant={active && contentOpen ? "solid" : "ghost"}
                            colorScheme={active && contentOpen ? "blue" : "gray"}
                            size="sm"
                            onClick={() => {
                              handleTabChange(tab.key);
                              // Auto-expand when the panel is collapsed so
                              // clicking any tab icon re-opens the content.
                              if (panelState === "collapsed") expandPanel();
                            }}
                          />
                          {tab.badge != null && tab.badge > 0 && (
                            <Box
                              position="absolute"
                              top="-2px"
                              right="-2px"
                              minW="14px"
                              h="14px"
                              px="3px"
                              borderRadius="full"
                              bg="blue.500"
                              color="white"
                              fontSize="9px"
                              fontWeight="bold"
                              lineHeight="14px"
                              textAlign="center"
                              pointerEvents="none"
                              border="1.5px solid"
                              borderColor="gray.50"
                            >
                              {tab.badge}
                            </Box>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                  <Box flex={1} />
                  {/* Panel chrome — fullscreen + hide live at the bottom of
                      the rail, separated from the nav icons by the flex
                      spacer. Matches VS Code activity-bar convention. */}
                  <Tooltip
                    label={panelState === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
                    placement="right"
                  >
                    <IconButton
                      aria-label="Toggle fullscreen"
                      icon={
                        panelState === "fullscreen" ? (
                          <FiMinimize2 size={14} />
                        ) : (
                          <FiMaximize2 size={14} />
                        )
                      }
                      size="sm"
                      variant="ghost"
                      onClick={toggleFullscreen}
                    />
                  </Tooltip>
                  <Tooltip
                    label={contentOpen ? "Collapse panel" : "Expand panel"}
                    placement="right"
                  >
                    <IconButton
                      aria-label={contentOpen ? "Collapse panel" : "Expand panel"}
                      icon={
                        contentOpen ? (
                          <FiChevronsLeft size={14} />
                        ) : (
                          <FiChevronsRight size={14} />
                        )
                      }
                      size="sm"
                      variant="ghost"
                      onClick={contentOpen ? collapsePanel : expandPanel}
                    />
                  </Tooltip>
                </Flex>

                {/* Tab content */}
                <Box flex={1} overflow="hidden">
                {/* ── Job tab ──────────────────────────────────────────────── */}
                {rightTab === "job" && tender && (
                  <Box h="100%" overflowY="auto" px={5} py={3}>
                    <TenderOverview
                      key={tender._id}
                      tender={tender}
                      onUpdated={() => refetchTender()}
                    />
                    <Divider my={2} />
                    <TenderSummaryTab
                      tender={tender}
                      onUpdated={() => refetchTender()}
                    />
                  </Box>
                )}
                {rightTab === "job" && !tender && (
                  <Flex h="100%" align="center" justify="center">
                    <Spinner />
                  </Flex>
                )}

                {/* ── Documents tab ────────────────────────────────────────── */}
                {rightTab === "documents" && (
                  <Box h="100%" overflow="hidden">
                    {selectedFile ? (
                      // File is opened in-place (via FileBrowser click OR
                      // via an older code path) — render the rich FileViewer
                      // since that's where doc-ref creation against pricing
                      // rows happens.
                      <FileViewer
                        file={selectedFile}
                        onBack={handleCloseFile}
                        initialPage={selectedFilePage}
                        onPageChange={handlePageChange}
                        onExpand={() =>
                          setViewerFile({
                            enrichedFileId: selectedFile.documentId,
                            fileName: selectedFile.fileName,
                            mimetype: selectedFile.mimetype,
                            page: selectedFilePage,
                          })
                        }
                      />
                    ) : (
                      <EntityFileBrowser
                        namespace="tenders"
                        entityId={tenderId}
                        rootLabel="Documents"
                        onFileClick={(node) => {
                          // FileViewer now speaks Document shape directly,
                          // so both migrated and net-new uploads open the
                          // same in-place viewer + ref-creation workflow.
                          if (!node.documentId) return;
                          handleOpenFile({
                            documentId: node.documentId,
                            fileName: node.name,
                            mimetype: node.mimetype ?? undefined,
                          });
                        }}
                      />
                    )}
                  </Box>
                )}

                {/* ── Notes tab ────────────────────────────────────────────── */}
                {rightTab === "notes" && tender && (
                  <Box h="100%" overflowY="auto" p={0}>
                    <TenderNotesTab
                      tender={tender}
                      onUpdated={() => refetchTender()}
                    />
                  </Box>
                )}
                {rightTab === "notes" && !tender && (
                  <Flex h="100%" align="center" justify="center">
                    <Spinner />
                  </Flex>
                )}

                {/* ── Summary tab ──────────────────────────────────────────── */}
                {rightTab === "summary" && sheet && (
                  <PricingSummary sheet={sheet} />
                )}
                {rightTab === "summary" && !sheet && (
                  <Flex h="100%" align="center" justify="center">
                    <Spinner />
                  </Flex>
                )}

                {/* ── Demand tab ───────────────────────────────────────────── */}
                {rightTab === "demand" && sheet && (
                  <TenderDemandTab sheet={sheet} />
                )}
                {rightTab === "demand" && !sheet && (
                  <Flex h="100%" align="center" justify="center">
                    <Spinner />
                  </Flex>
                )}

                {rightTab === "review" && (
                  <TenderReviewTab
                    tenderId={tenderId}
                    currentUserId={currentUserId}
                    sheet={sheet}
                  />
                )}
                </Box>
              </Flex>
            </Flex>
          )}

          {/* Right: Pricing sheet (now the primary content — main work
              lives to the right of the reference panel). */}
          {showLeft && (
            <Box
              flex={1}
              minW={0}
              overflow="hidden"
              p={4}
              borderLeft={panelState === "open" ? "1px solid" : undefined}
              borderColor="gray.200"
              display="flex"
              flexDir="column"
            >
              {!initialized ? (
                <Spinner />
              ) : sheet ? (
                <PricingSheet
                  sheet={sheet}
                  tenderId={tenderId}
                  onUpdate={setSheet}
                  tenderDocuments={tender?.documents ?? []}
                  activeDocFile={selectedFile?.documentId}
                  activeDocPage={selectedFilePage}
                  onDocRefClick={handleDocRefClick}
                  viewMode={pricingViewMode}
                  onViewModeChange={setPricingViewMode}
                />
              ) : (
                <Text color="gray.500">Unable to load pricing sheet.</Text>
              )}
            </Box>
          )}
        </Flex>

        {/* ── Floating chat button ───────────────────────────────────────── */}
        {!chatOpen && (
          <IconButton
            aria-label="Open chat"
            icon={<FiMessageSquare size={20} />}
            colorScheme="blue"
            size="lg"
            borderRadius="full"
            position="fixed"
            bottom={8}
            right={8}
            zIndex={4}
            boxShadow="lg"
            onClick={() => setChatOpen(true)}
          />
        )}

        {/* ── Doc viewer modal — opened by pricing-sheet citation clicks. */}
        <DocumentViewerModal
          file={viewerFile}
          onClose={() => setViewerFile(null)}
        />

        {/* ── Chat drawer ────────────────────────────────────────────────── */}
        <ChatDrawer
          isOpen={chatOpen}
          onClose={handleChatClose}
          title={tenderLabel}
          messageEndpoint="/api/tender-chat/message"
          conversationsEndpoint={`/api/tender-conversations/${tenderId}`}
          extraPayload={{ tenderId }}
          suggestions={TENDER_SUGGESTIONS}
          minRole={UserRoles.ProjectManager}
          initialConversationId={initialConversationId}
          onToolResult={(toolName, _result) => {
            if (toolName === "save_tender_note" || toolName === "delete_tender_note") {
              refetchTender();
            }
          }}
        />
      </Flex>
      )}
    </Permission>
  );
};

export default TenderDetailPage;
