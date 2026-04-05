import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  IconButton,
  Spinner,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { gql, useQuery, useMutation } from "@apollo/client";
import * as Apollo from "@apollo/client";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { FiChevronLeft, FiDownload, FiMaximize2, FiMessageSquare, FiMinimize2, FiX } from "react-icons/fi";
import Permission from "../../../components/Common/Permission";
import Breadcrumbs from "../../../components/Common/Breadcrumbs";
import ClientOnly from "../../../components/Common/ClientOnly";
import PricingSheet from "../../../components/TenderPricing/PricingSheet";
import PricingSummary from "../../../components/TenderPricing/PricingSummary";
import TenderOverview from "../../../components/Tender/TenderOverview";
import TenderSummaryTab from "../../../components/Tender/TenderSummaryTab";
import TenderNotesTab from "../../../components/Tender/TenderNotesTab";
import TenderDocuments from "../../../components/Tender/TenderDocuments";
import { TenderPricingSheet } from "../../../components/TenderPricing/types";
import { TenderDetail, TenderFileItem } from "../../../components/Tender/types";
import { UserRoles } from "../../../generated/graphql";
import { navbarHeight } from "../../../constants/styles";
import { localStorageTokenKey } from "../../../contexts/Auth";
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
        calculatorType
        calculatorInputsJson
        markupOverride
        rateBuildupSnapshot
        extraUnitPrice
        extraUnitPriceMemo
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
        calculatorType
        calculatorInputsJson
        markupOverride
        rateBuildupSnapshot
        extraUnitPrice
        extraUnitPriceMemo
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

type RightTab = "job" | "documents" | "notes" | "summary";
type PanelState = "open" | "hidden" | "fullscreen";

// ─── File URL helper ──────────────────────────────────────────────────────────

const apiBase = "";

function buildFileUrl(fileId: string, stream = false): string {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (stream) params.set("stream", "1");
  const qs = params.toString();
  return `${apiBase}/api/enriched-files/${fileId}${qs ? `?${qs}` : ""}`;
}

// ─── Inline file viewer (PDF or fallback) ─────────────────────────────────────

interface FileViewerProps {
  file: TenderFileItem;
  onBack: () => void;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ file, onBack, initialPage, onPageChange }) => {
  const isPdf =
    file.file.mimetype === "application/pdf" ||
    file.file.description?.toLowerCase().endsWith(".pdf");

  const fileUrl = buildFileUrl(file._id);
  const pdfStreamUrl = buildFileUrl(file._id, true);

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
          {file.file.description || "File"}
        </Text>
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
              fileName={file.file.description ?? undefined}
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

  const [sheet, setSheet] = useState<TenderPricingSheet | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("documents");
  const [panelState, setPanelState] = useState<PanelState>("open");
  const [chatOpen, setChatOpen] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<string | undefined>(undefined);
  const [panelWidthPx, setPanelWidthPx] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<TenderFileItem | null>(null);
  const [selectedFilePage, setSelectedFilePage] = useState<number>(1);
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
      const newWidth = window.innerWidth - e.clientX;
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

  // Poll while files are processing or summary is generating
  useEffect(() => {
    const hasProcessing = tender?.files.some(
      (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
    );
    if (hasProcessing || tender?.summaryGenerating) {
      startPolling(3000);
    } else {
      stopPolling();
    }
  }, [tender?.files, tender?.summaryGenerating, startPolling, stopPolling]);

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

  const hidePanel = useCallback(() => setPanelState("hidden"), []);
  const showPanel = useCallback(() => setPanelState("open"), []);

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

  const handleOpenFile = useCallback((file: TenderFileItem, page = 1) => {
    setSelectedFile(file);
    setSelectedFilePage(page);
    setRightTab("documents");
    setDocUrlParams(file._id, page);
  }, [setDocUrlParams]);

  const handleCloseFile = useCallback(() => {
    setSelectedFile(null);
    setSelectedFilePage(1);
    setDocUrlParams(null, null);
  }, [setDocUrlParams]);

  const handlePageChange = useCallback((page: number) => {
    setSelectedFilePage(page);
    setDocUrlParams(selectedFile?._id ?? null, page);
  }, [selectedFile, setDocUrlParams]);

  const handleDocRefClick = useCallback((enrichedFileId: string, page: number) => {
    const file = tender?.files.find((f) => f._id === enrichedFileId);
    if (!file) return;
    handleOpenFile(file, page);
  }, [tender?.files, handleOpenFile]);

  const panelWidth =
    panelState === "fullscreen"
      ? "100%"
      : panelWidthPx != null
      ? `${panelWidthPx}px`
      : "33vw";
  const showLeft = panelState !== "fullscreen";
  const showRight = panelState !== "hidden";

  const TABS: { key: RightTab; label: string }[] = [
    { key: "job", label: "Job" },
    {
      key: "documents",
      label: `Documents${tender && tender.files.length > 0 ? ` (${tender.files.length})` : ""}`,
    },
    {
      key: "notes",
      label: `Notes${tender && tender.notes.length > 0 ? ` (${tender.notes.length})` : ""}`,
    },
    { key: "summary", label: "Summary" },
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
          {panelState === "hidden" && (
            <Button size="xs" variant="outline" onClick={showPanel}>
              Show Panel
            </Button>
          )}
        </Flex>

        {/* ── Main split ────────────────────────────────────────────────────── */}
        <Flex flex={1} overflow="hidden">
          {/* Left: Pricing sheet */}
          {showLeft && (
            <Box
              flex={1}
              minW={0}
              overflowY="auto"
              p={4}
              borderRight={panelState === "open" ? "1px solid" : undefined}
              borderColor="gray.200"
            >
              {!initialized ? (
                <Spinner />
              ) : sheet ? (
                <PricingSheet
                  sheet={sheet}
                  tenderId={tenderId}
                  onUpdate={setSheet}
                  tenderFiles={tender?.files ?? []}
                  activeDocFile={selectedFile?._id}
                  activeDocPage={selectedFilePage}
                  onDocRefClick={handleDocRefClick}
                />
              ) : (
                <Text color="gray.500">Unable to load pricing sheet.</Text>
              )}
            </Box>
          )}

          {/* Right: Panel */}
          {showRight && (
            <Flex
              direction="column"
              w={panelWidth}
              flexShrink={0}
              overflow="hidden"
              position="relative"
            >
              {/* Drag handle */}
              <Box
                position="absolute"
                left={0}
                top={0}
                bottom={0}
                w="5px"
                cursor="col-resize"
                zIndex={10}
                _hover={{ bg: "blue.200" }}
                transition="background 0.15s"
                onMouseDown={(e) => {
                  e.preventDefault();
                  isDraggingPanel.current = true;
                }}
              />

              {/* Tab bar */}
              <Flex
                h="44px"
                align="center"
                borderBottom="1px solid"
                borderColor="gray.200"
                bg="gray.50"
                px={2}
                gap={1}
                flexShrink={0}
              >
                {TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    size="sm"
                    variant={rightTab === tab.key ? "solid" : "ghost"}
                    colorScheme={rightTab === tab.key ? "blue" : "gray"}
                    onClick={() => handleTabChange(tab.key)}
                    px={3}
                  >
                    {tab.label}
                  </Button>
                ))}
                <Box flex={1} />
                <Tooltip
                  label={panelState === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
                  placement="bottom"
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
                <Tooltip label="Hide panel" placement="bottom">
                  <IconButton
                    aria-label="Hide panel"
                    icon={<FiX size={14} />}
                    size="sm"
                    variant="ghost"
                    onClick={hidePanel}
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
                  <>
                    {selectedFile ? (
                      <FileViewer
                        file={selectedFile}
                        onBack={handleCloseFile}
                        initialPage={selectedFilePage}
                        onPageChange={handlePageChange}
                      />
                    ) : tender ? (
                      <TenderDocuments
                        tender={tender}
                        onUpdated={() => refetchTender()}
                        onFileSelect={(file) => handleOpenFile(file, 1)}
                      />
                    ) : (
                      <Flex h="100%" align="center" justify="center">
                        <Spinner />
                      </Flex>
                    )}
                  </>
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
              </Box>
            </Flex>
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
