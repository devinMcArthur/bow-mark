# Tender Mobile Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive mobile layout to the tender detail page that surfaces pricing, documents, notes, and summary in a phone-friendly bottom-tab design without touching the desktop experience.

**Architecture:** A `useBreakpointValue` branch in `pages/tender/[id]/index.tsx` renders either the existing desktop layout or a new `TenderMobileLayout` component. All data fetching stays in the page; mobile components receive data as props. Three new files handle the mobile shell, pricing tab, and documents tab respectively.

**Tech Stack:** Next.js 12, React 17, Chakra UI, Apollo Client, react-pdf (via existing PdfViewer), dnd-kit (NOT used on mobile)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `client/src/components/Tender/TenderMobilePricingTab.tsx` | Summary strip + row list + line item drawer (owns UPDATE_ROW mutation) |
| Create | `client/src/components/Tender/TenderMobileDocumentsTab.tsx` | File list + full-screen PDF viewer |
| Create | `client/src/components/Tender/TenderMobileLayout.tsx` | Top bar + bottom tab bar + tab routing |
| Modify | `client/src/pages/tender/[id]/index.tsx` | Add `isMobile` branch to render TenderMobileLayout |

---

## Task 1: TenderMobilePricingTab

**Files:**
- Create: `client/src/components/Tender/TenderMobilePricingTab.tsx`

- [ ] **Step 1: Create the file**

```tsx
// client/src/components/Tender/TenderMobilePricingTab.tsx
import React, { useCallback, useState } from "react";
import {
  Badge,
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  IconButton,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { gql, useMutation } from "@apollo/client";
import { FiX } from "react-icons/fi";
import LineItemDetail from "../TenderPricing/LineItemDetail";
import { TenderPricingSheet, TenderPricingRow, TenderPricingRowType } from "../TenderPricing/types";
import { computeRow, computeSheetTotal, formatCurrency } from "../TenderPricing/compute";

// ─── GQL ──────────────────────────────────────────────────────────────────────

const ROW_FIELDS = `
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
`;

const SHEET_FIELDS = `
  _id
  defaultMarkupPct
  rows {
    ${ROW_FIELDS}
  }
`;

const UPDATE_ROW = gql`
  mutation MobileTenderPricingRowUpdate($sheetId: ID!, $rowId: ID!, $data: TenderPricingRowUpdateData!) {
    tenderPricingRowUpdate(sheetId: $sheetId, rowId: $rowId, data: $data) {
      ${SHEET_FIELDS}
    }
  }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderMobilePricingTabProps {
  sheet: TenderPricingSheet;
  tenderId: string;
  onSheetUpdate: (sheet: TenderPricingSheet) => void;
}

// ─── Row list item ────────────────────────────────────────────────────────────

interface RowItemProps {
  row: TenderPricingRow;
  defaultMarkupPct: number;
  onSelect: (row: TenderPricingRow) => void;
}

const RowItem: React.FC<RowItemProps> = ({ row, defaultMarkupPct, onSelect }) => {
  if (row.type === TenderPricingRowType.Schedule) {
    return (
      <Flex
        align="center"
        px={4}
        py={2}
        bg="gray.100"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Text fontSize="xs" fontWeight="700" color="gray.600" textTransform="uppercase" letterSpacing="wide">
          {row.description || "Schedule"}
        </Text>
      </Flex>
    );
  }

  if (row.type === TenderPricingRowType.Group) {
    return (
      <Flex
        align="center"
        px={4}
        pl={`${4 + (row.indentLevel ?? 1) * 12}px`}
        py={2}
        bg="gray.50"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Text fontSize="sm" fontWeight="600" color="gray.700" flex={1} isTruncated>
          {row.description || "Group"}
        </Text>
      </Flex>
    );
  }

  // Item row
  const { lineItemTotal } = computeRow(row, defaultMarkupPct);
  return (
    <Flex
      align="center"
      px={4}
      pl={`${4 + (row.indentLevel ?? 2) * 12}px`}
      py={3}
      borderBottom="1px solid"
      borderColor="gray.100"
      cursor="pointer"
      _active={{ bg: "gray.50" }}
      onClick={() => onSelect(row)}
      gap={2}
    >
      {row.itemNumber ? (
        <Text fontSize="xs" fontFamily="mono" color="gray.400" flexShrink={0} w="32px">
          {row.itemNumber}
        </Text>
      ) : null}
      <Text fontSize="sm" color="gray.800" flex={1} isTruncated>
        {row.description || <Text as="span" color="gray.400">No description</Text>}
      </Text>
      <Box flexShrink={0} textAlign="right">
        {row.quantity != null && row.unit ? (
          <Text fontSize="xs" color="gray.400">{row.quantity} {row.unit}</Text>
        ) : null}
        <Text fontSize="sm" fontWeight="600" color="gray.700">
          {formatCurrency(lineItemTotal)}
        </Text>
      </Box>
    </Flex>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const TenderMobilePricingTab: React.FC<TenderMobilePricingTabProps> = ({
  sheet,
  tenderId,
  onSheetUpdate,
}) => {
  const [selectedRow, setSelectedRow] = useState<TenderPricingRow | null>(null);
  const [updateRow] = useMutation(UPDATE_ROW);

  const sheetTotal = computeSheetTotal(sheet.rows, sheet.defaultMarkupPct);

  const handleUpdateRow = useCallback(
    async (rowId: string, data: Record<string, unknown>) => {
      const res = await updateRow({
        variables: { sheetId: sheet._id, rowId, data },
      });
      const updated: TenderPricingSheet = res.data.tenderPricingRowUpdate;
      onSheetUpdate(updated);
      // Keep selectedRow in sync with the updated sheet
      const updatedRow = updated.rows.find((r) => r._id === rowId);
      if (updatedRow) setSelectedRow(updatedRow);
    },
    [sheet._id, updateRow, onSheetUpdate]
  );

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Summary strip */}
      <Flex
        px={4}
        py={2}
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <Text fontSize="xs" color="gray.500">
          Markup: {sheet.defaultMarkupPct}%
        </Text>
        <Text fontSize="md" fontWeight="700" color="gray.800">
          {formatCurrency(sheetTotal)}
        </Text>
      </Flex>

      {/* Row list */}
      <Box flex={1} overflowY="auto">
        {sheet.rows.map((row) => (
          <RowItem
            key={row._id}
            row={row}
            defaultMarkupPct={sheet.defaultMarkupPct}
            onSelect={setSelectedRow}
          />
        ))}
      </Box>

      {/* Line item drawer */}
      <Drawer
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        placement="bottom"
      >
        <DrawerOverlay />
        <DrawerContent maxH="85vh" borderTopRadius="xl">
          <DrawerHeader
            px={4}
            py={3}
            borderBottom="1px solid"
            borderColor="gray.200"
            display="flex"
            alignItems="center"
            gap={2}
          >
            {selectedRow?.itemNumber && (
              <Text fontFamily="mono" fontSize="sm" color="gray.500" flexShrink={0}>
                {selectedRow.itemNumber}
              </Text>
            )}
            <Text fontSize="sm" fontWeight="600" flex={1} isTruncated>
              {selectedRow?.description || "Line Item"}
            </Text>
            <IconButton
              aria-label="Close"
              icon={<FiX />}
              size="sm"
              variant="ghost"
              onClick={() => setSelectedRow(null)}
            />
          </DrawerHeader>
          <DrawerBody p={0} overflow="hidden">
            {selectedRow && (
              <LineItemDetail
                row={selectedRow}
                defaultMarkupPct={sheet.defaultMarkupPct}
                sheetId={sheet._id}
                tenderId={tenderId}
                onUpdate={handleUpdateRow}
                onClose={() => setSelectedRow(null)}
              />
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default TenderMobilePricingTab;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Tender/TenderMobilePricingTab.tsx
git commit -m "feat: TenderMobilePricingTab — row list + line item drawer"
```

---

## Task 2: TenderMobileDocumentsTab

**Files:**
- Create: `client/src/components/Tender/TenderMobileDocumentsTab.tsx`

- [ ] **Step 1: Create the file**

```tsx
// client/src/components/Tender/TenderMobileDocumentsTab.tsx
import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { FiChevronLeft, FiDownload } from "react-icons/fi";
import dynamic from "next/dynamic";
import ClientOnly from "../Common/ClientOnly";
import { TenderFileItem } from "./types";
import { localStorageTokenKey } from "../../contexts/Auth";

const PdfViewer = dynamic(
  () => import("../TenderPricing/PdfViewer"),
  { ssr: false, loading: () => <Flex h="100%" align="center" justify="center"><Spinner /></Flex> }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFileUrl(fileId: string, stream = false): string {
  const token = typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (stream) params.set("stream", "1");
  const qs = params.toString();
  return `/api/enriched-files/${fileId}${qs ? `?${qs}` : ""}`;
}

// ─── File list item ───────────────────────────────────────────────────────────

interface FileListItemProps {
  file: TenderFileItem;
  onSelect: (file: TenderFileItem) => void;
}

const FileListItem: React.FC<FileListItemProps> = ({ file, onSelect }) => {
  const isProcessing = file.summaryStatus === "pending" || file.summaryStatus === "processing";
  return (
    <Flex
      px={4}
      py={3}
      borderBottom="1px solid"
      borderColor="gray.100"
      align="flex-start"
      gap={3}
      cursor="pointer"
      _active={{ bg: "gray.50" }}
      onClick={() => onSelect(file)}
    >
      <Box flex={1} minW={0}>
        <Flex align="center" gap={2} mb={1} flexWrap="wrap">
          {file.documentType && (
            <Badge fontSize="xs" colorScheme="blue" flexShrink={0}>
              {file.documentType}
            </Badge>
          )}
          <Text fontSize="sm" color="gray.800" isTruncated>
            {file.file.description || "Untitled"}
          </Text>
        </Flex>
        {isProcessing ? (
          <Flex align="center" gap={1}>
            <Spinner size="xs" color="gray.400" />
            <Text fontSize="xs" color="gray.400">Processing…</Text>
          </Flex>
        ) : file.summary?.overview ? (
          <Text fontSize="xs" color="gray.500" noOfLines={2}>
            {file.summary.overview}
          </Text>
        ) : null}
      </Box>
    </Flex>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderMobileDocumentsTabProps {
  files: TenderFileItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

const TenderMobileDocumentsTab: React.FC<TenderMobileDocumentsTabProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<TenderFileItem | null>(null);

  if (selectedFile) {
    const isPdf =
      selectedFile.file.mimetype === "application/pdf" ||
      selectedFile.file.description?.toLowerCase().endsWith(".pdf");
    const fileUrl = buildFileUrl(selectedFile._id);
    const pdfStreamUrl = buildFileUrl(selectedFile._id, true);

    return (
      <Flex direction="column" h="100%">
        {/* Viewer top bar */}
        <Flex
          h="44px"
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
            icon={<FiChevronLeft />}
            size="sm"
            variant="ghost"
            onClick={() => setSelectedFile(null)}
          />
          <Text fontSize="sm" color="gray.700" isTruncated flex={1}>
            {selectedFile.file.description || "File"}
          </Text>
          <IconButton
            aria-label="Download"
            icon={<FiDownload size={14} />}
            size="sm"
            variant="ghost"
            onClick={() => window.open(fileUrl, "_blank")}
          />
        </Flex>

        {/* Viewer body */}
        <Box flex={1} overflow="hidden">
          {isPdf ? (
            <ClientOnly>
              <PdfViewer
                url={pdfStreamUrl}
                fileName={selectedFile.file.description ?? undefined}
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
  }

  return (
    <Box h="100%" overflowY="auto">
      {files.length === 0 ? (
        <Flex h="100%" align="center" justify="center">
          <Text fontSize="sm" color="gray.400">No documents attached.</Text>
        </Flex>
      ) : (
        files.map((file) => (
          <FileListItem key={file._id} file={file} onSelect={setSelectedFile} />
        ))
      )}
    </Box>
  );
};

export default TenderMobileDocumentsTab;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Tender/TenderMobileDocumentsTab.tsx
git commit -m "feat: TenderMobileDocumentsTab — file list + PDF viewer"
```

---

## Task 3: TenderMobileLayout

**Files:**
- Create: `client/src/components/Tender/TenderMobileLayout.tsx`

- [ ] **Step 1: Create the file**

```tsx
// client/src/components/Tender/TenderMobileLayout.tsx
import React, { useState } from "react";
import {
  Box,
  Flex,
  IconButton,
  Spinner,
  Text,
  Badge,
} from "@chakra-ui/react";
import { FiChevronLeft, FiFileText, FiList, FiMessageSquare, FiAlignLeft } from "react-icons/fi";
import { useRouter } from "next/router";
import TenderMobilePricingTab from "./TenderMobilePricingTab";
import TenderMobileDocumentsTab from "./TenderMobileDocumentsTab";
import TenderSummaryTab from "./TenderSummaryTab";
import TenderNotesTab from "./TenderNotesTab";
import { TenderDetail, tenderStatusColor } from "./types";
import { TenderPricingSheet } from "../TenderPricing/types";
import { navbarHeight } from "../../constants/styles";

// ─── Types ────────────────────────────────────────────────────────────────────

type MobileTab = "pricing" | "documents" | "notes" | "summary";

const TABS: { key: MobileTab; label: string; icon: React.ReactElement }[] = [
  { key: "pricing", label: "Pricing", icon: <FiList size={18} /> },
  { key: "documents", label: "Documents", icon: <FiFileText size={18} /> },
  { key: "notes", label: "Notes", icon: <FiMessageSquare size={18} /> },
  { key: "summary", label: "Summary", icon: <FiAlignLeft size={18} /> },
];

const TAB_BAR_HEIGHT = "56px";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderMobileLayoutProps {
  tender: TenderDetail;
  sheet: TenderPricingSheet | null;
  onSheetUpdate: (sheet: TenderPricingSheet) => void;
  tenderId: string;
  onRefetch: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TenderMobileLayout: React.FC<TenderMobileLayoutProps> = ({
  tender,
  sheet,
  onSheetUpdate,
  tenderId,
  onRefetch,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MobileTab>("pricing");

  return (
    <Flex
      direction="column"
      h={`calc(100vh - ${navbarHeight})`}
      w="100%"
      overflow="hidden"
      position="relative"
    >
      {/* Top bar */}
      <Flex
        h="40px"
        flexShrink={0}
        align="center"
        px={2}
        gap={2}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        <IconButton
          aria-label="Back to tenders"
          icon={<FiChevronLeft size={18} />}
          size="sm"
          variant="ghost"
          onClick={() => router.push("/tenders")}
        />
        <Text fontSize="sm" fontWeight="600" isTruncated flex={1} color="gray.800">
          {tender.name}
        </Text>
        <Text fontFamily="mono" fontSize="xs" color="gray.500" flexShrink={0}>
          {tender.jobcode}
        </Text>
        <Badge colorScheme={tenderStatusColor(tender.status)} flexShrink={0}>
          {tender.status}
        </Badge>
      </Flex>

      {/* Tab content */}
      <Box flex={1} overflow="hidden" h={contentHeight}>
        {activeTab === "pricing" && (
          sheet ? (
            <TenderMobilePricingTab
              sheet={sheet}
              tenderId={tenderId}
              onSheetUpdate={onSheetUpdate}
            />
          ) : (
            <Flex h="100%" align="center" justify="center">
              <Spinner />
            </Flex>
          )
        )}
        {activeTab === "documents" && (
          <TenderMobileDocumentsTab files={tender.files} />
        )}
        {activeTab === "notes" && (
          <Box h="100%" overflowY="auto" px={4} py={3}>
            <TenderNotesTab tender={tender} onUpdated={onRefetch} />
          </Box>
        )}
        {activeTab === "summary" && (
          <Box h="100%" overflowY="auto" px={4} py={3}>
            <TenderSummaryTab tender={tender} onUpdated={onRefetch} />
          </Box>
        )}
      </Box>

      {/* Bottom tab bar */}
      <Flex
        h={TAB_BAR_HEIGHT}
        flexShrink={0}
        borderTop="1px solid"
        borderColor="gray.200"
        bg="white"
        align="stretch"
      >
        {TABS.map((tab) => (
          <Flex
            key={tab.key}
            flex={1}
            direction="column"
            align="center"
            justify="center"
            gap={0.5}
            cursor="pointer"
            onClick={() => setActiveTab(tab.key)}
            color={activeTab === tab.key ? "blue.500" : "gray.400"}
            borderTop="2px solid"
            borderColor={activeTab === tab.key ? "blue.500" : "transparent"}
            transition="color 0.15s, border-color 0.15s"
            _active={{ bg: "gray.50" }}
          >
            {tab.icon}
            <Text fontSize="10px" fontWeight={activeTab === tab.key ? "600" : "400"}>
              {tab.label}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};

export default TenderMobileLayout;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Tender/TenderMobileLayout.tsx
git commit -m "feat: TenderMobileLayout — top bar, bottom tab bar, tab routing"
```

---

## Task 4: Wire up in index.tsx

**Files:**
- Modify: `client/src/pages/tender/[id]/index.tsx`

- [ ] **Step 1: Add import and isMobile branch**

At the top of `index.tsx`, add the imports alongside the existing imports:

```ts
import { useBreakpointValue } from "@chakra-ui/react";
import TenderMobileLayout from "../../../components/Tender/TenderMobileLayout";
import { navbarHeight } from "../../../constants/styles";
```

(`Flex` and `Spinner` are already imported in index.tsx.)

Inside `TenderDetailPage`, add this line near the top of the component body (after the existing `useState` declarations):

```ts
const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
```

Then wrap the entire `return (...)` so that when `isMobile` is true, it renders the mobile layout instead:

```tsx
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
      // ... existing desktop JSX unchanged ...
    )}
  </Permission>
);
```

The `tender ?? ({} as TenderDetail)` guard handles the loading state — `TenderMobileLayout` renders a spinner in the pricing tab when sheet is null, and the top bar will show empty strings until data arrives, which is acceptable.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npm run type-check 2>&1 | tail -20
```

Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/tender/[id]/index.tsx
git commit -m "feat: wire up TenderMobileLayout at mobile breakpoint"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Open `bm.hubsite.app` on your phone and navigate to a tender**

Verify:
- Top bar shows tender name, jobcode, status badge
- Bottom tab bar has Pricing / Documents / Notes / Summary
- Pricing tab shows summary strip (total + markup) and row list
- Section/Group rows render as non-tappable dividers
- Tapping a line item opens the bottom drawer with LineItemDetail
- Editing a field in the drawer (e.g. quantity) saves and updates the total in the summary strip
- Documents tab shows file list with badges and summary previews
- Tapping a file opens the PDF viewer full-screen
- Back button in viewer returns to file list
- Notes tab shows note cards
- Summary tab renders the job summary

- [ ] **Step 2: Verify desktop is unchanged**

Open a tender on desktop and confirm the split layout is identical to before.

- [ ] **Step 3: Final commit if any fixups were needed**

```bash
git add -p
git commit -m "fix: tender mobile layout fixups from manual verification"
```
