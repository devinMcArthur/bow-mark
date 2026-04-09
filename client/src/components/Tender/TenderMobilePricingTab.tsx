// client/src/components/Tender/TenderMobilePricingTab.tsx
import React, { useCallback, useRef, useState } from "react";
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  IconButton,
  Modal,
  ModalContent,
  ModalOverlay,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { gql, useMutation } from "@apollo/client";
import { FiChevronLeft, FiDownload } from "react-icons/fi";
import dynamic from "next/dynamic";
import ClientOnly from "../Common/ClientOnly";
import LineItemDetail from "../TenderPricing/LineItemDetail";
import { TenderPricingSheet, TenderPricingRow, TenderPricingRowType } from "../TenderPricing/types";
import { TenderFileItem } from "./types";
import { localStorageTokenKey } from "../../contexts/Auth";

import { computeRow, computeSheetTotal, formatCurrency } from "../TenderPricing/compute";

const PdfViewer = dynamic(
  () => import("../TenderPricing/PdfViewer"),
  { ssr: false, loading: () => <Flex h="100%" align="center" justify="center"><Spinner /></Flex> }
);

function buildFileUrl(fileId: string, stream = false): string {
  const token = typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (stream) params.set("stream", "1");
  const qs = params.toString();
  return `/api/enriched-files/${fileId}${qs ? `?${qs}` : ""}`;
}

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
  markupOverride
  rateBuildupSnapshot
  extraUnitPrice
  extraUnitPriceMemo
  status
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
  tenderFiles: TenderFileItem[];
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
        px={3}
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
        px={3}
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
      px={3}
      py={3}
      borderBottom="1px solid"
      borderColor="gray.100"
      cursor="pointer"
      _active={{ bg: "gray.50" }}
      onClick={() => onSelect(row)}
    >
      {row.itemNumber ? (
        <Text fontSize="xs" fontFamily="mono" color="gray.400" flexShrink={0} whiteSpace="nowrap" mr={3}>
          {row.itemNumber}
        </Text>
      ) : null}
      <Text fontSize="sm" color="gray.800" flex={1} minW={0} isTruncated>
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
  tenderFiles,
}) => {
  const [selectedRow, setSelectedRow] = useState<TenderPricingRow | null>(null);
  const [viewingFile, setViewingFile] = useState<{ fileId: string; fileName: string; page?: number } | null>(null);
  const [updateRow] = useMutation(UPDATE_ROW);
  const drawerBoxRef = useRef<HTMLDivElement | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  // Callback ref — fires synchronously on mount/unmount, lets us attach a
  // non-passive touchmove listener (needed to call preventDefault and stop
  // the inner scroll area from consuming the gesture).
  const drawerBoxCallbackRef = useCallback((el: HTMLDivElement | null) => {
    if (dragCleanupRef.current) { dragCleanupRef.current(); dragCleanupRef.current = null; }
    drawerBoxRef.current = el;
    if (!el) return;

    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0; // px/ms, positive = downward
    let dragging = false;

    // Elastic resistance: drawer follows at ~40% of finger travel so casual
    // swipes don't accidentally dismiss. Snap back unless you've pulled far
    // enough (180 px raw) or flicked fast (≥ 0.5 px/ms = 500 px/s).
    const DISMISS_DISTANCE = 180;
    const DISMISS_VELOCITY = 0.5;
    const RESISTANCE = 0.15;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      lastY = startY;
      lastTime = Date.now();
      velocity = 0;
      dragging = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) return;
      // Only steal the gesture when the inner scroll container is at the top
      let scrollable: HTMLElement | null = null;
      for (const node of Array.from(el.querySelectorAll('*'))) {
        const s = getComputedStyle(node);
        if (s.overflowY === 'auto' || s.overflowY === 'scroll') { scrollable = node as HTMLElement; break; }
      }
      if (scrollable && scrollable.scrollTop > 0) return;
      e.preventDefault();
      dragging = true;
      // Track instantaneous velocity
      const now = Date.now();
      const dt = Math.max(1, now - lastTime);
      velocity = (e.touches[0].clientY - lastY) / dt;
      lastY = e.touches[0].clientY;
      lastTime = now;
      // Elastic translation: resist the pull so it feels biased toward staying open
      el.style.transform = `translateY(${dy * RESISTANCE}px)`;
      el.style.transition = 'none';
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY;
      const shouldDismiss = dragging && (dy > DISMISS_DISTANCE || velocity >= DISMISS_VELOCITY);
      if (shouldDismiss) {
        el.style.transition = 'transform 0.25s ease';
        el.style.transform = 'translateY(100%)';
        setTimeout(() => setSelectedRow(null), 250);
      } else {
        el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 300);
      }
      dragging = false;
      velocity = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    dragCleanupRef.current = () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const sheetTotal = computeSheetTotal(sheet.rows, sheet.defaultMarkupPct);

  const handleUpdateRow = useCallback(
    async (rowId: string, data: Record<string, unknown>) => {
      const res = await updateRow({
        variables: { sheetId: sheet._id, rowId, data },
      });
      const updated: TenderPricingSheet | undefined = res.data?.tenderPricingRowUpdate;
      if (!updated) return;
      onSheetUpdate(updated);
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
        <DrawerContent h="85vh" borderTopRadius="xl" overflow="visible" bg="transparent" boxShadow="none">
          <DrawerBody p={0} h="100%" overflow="visible">
            <Box
              ref={drawerBoxCallbackRef}
              h="100%"
              bg="white"
              borderTopRadius="xl"
              overflow="hidden"
            >
            {selectedRow && (
              <LineItemDetail
                row={selectedRow}
                defaultMarkupPct={sheet.defaultMarkupPct}
                sheetId={sheet._id}
                tenderId={tenderId}
                onUpdate={handleUpdateRow}
                onClose={() => setSelectedRow(null)}
                tenderFiles={tenderFiles}
                onDocRefClick={(enrichedFileId, page) => {
                  const file = tenderFiles.find((f) => f._id === enrichedFileId);
                  setViewingFile({ fileId: enrichedFileId, fileName: file?.file.description ?? "File", page });
                }}
              />
            )}
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* PDF viewer modal */}
      <Modal isOpen={!!viewingFile} onClose={() => setViewingFile(null)} size="full">
        <ModalOverlay />
        <ModalContent m={0} borderRadius={0} h="100vh" display="flex" flexDirection="column">
          <Flex
            h="44px"
            align="center"
            px={2}
            borderBottom="1px solid"
            borderColor="gray.200"
            bg="gray.50"
            flexShrink={0}
          >
            <IconButton
              aria-label="Close"
              icon={<FiChevronLeft />}
              size="sm"
              variant="ghost"
              onClick={() => setViewingFile(null)}
              mr={1}
            />
            <Text fontSize="sm" color="gray.700" isTruncated flex={1}>
              {viewingFile?.fileName}
            </Text>
            <IconButton
              aria-label="Download"
              icon={<FiDownload size={14} />}
              size="sm"
              variant="ghost"
              onClick={() => viewingFile && window.open(buildFileUrl(viewingFile.fileId), "_blank")}
            />
          </Flex>
          <Box flex={1} overflow="hidden">
            {viewingFile && (
              <ClientOnly>
                <PdfViewer
                  url={buildFileUrl(viewingFile.fileId, true)}
                  fileName={viewingFile.fileName}
                  initialPage={viewingFile.page}
                />
              </ClientOnly>
            )}
          </Box>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TenderMobilePricingTab;
