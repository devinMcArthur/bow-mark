import React, { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Box,
  Flex,
  IconButton,
  Spinner,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiZoomIn,
  FiZoomOut,
  FiMaximize2,
} from "react-icons/fi";

// Use local worker copy to avoid CDN dependency in dev environment
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface PdfViewerProps {
  url: string;
  fileName?: string;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.25;

const PdfViewer: React.FC<PdfViewerProps> = ({ url, fileName, initialPage, onPageChange }) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(initialPage ?? 1);
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(380);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  // Track container width for page sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Non-passive wheel handler so we can prevent page scroll while zooming
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * factor)));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setPageNumber(1);
      setScale(1.0);
      setPan({ x: 0, y: 0 });
    },
    []
  );

  const resetView = useCallback(() => {
    setScale(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const goToPage = useCallback((p: number) => {
    setPageNumber(p);
    setPan({ x: 0, y: 0 });
    onPageChange?.(p);
  }, [onPageChange]);

  // ── Mouse drag handlers ──────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      px: pan.x,
      py: pan.y,
    };
    e.preventDefault();
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ── Page width at current scale ──────────────────────────────────────────────
  // Pass the scaled width directly to Page so pdfjs re-rasterises at the correct
  // resolution — this keeps text/lines crisp at any zoom level.
  // CSS transform is used only for panning (translate), not scaling.

  const baseWidth = Math.max(200, containerWidth - 32);
  const pageWidth = Math.round(baseWidth * scale);

  return (
    <Flex direction="column" h="100%" overflow="hidden">
      {/* Toolbar */}
      <Flex
        h="40px"
        align="center"
        gap={1}
        px={2}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="gray.50"
        flexShrink={0}
      >
        {/* Zoom controls */}
        <Tooltip label="Zoom out" placement="bottom">
          <IconButton
            aria-label="Zoom out"
            icon={<FiZoomOut size={14} />}
            size="xs"
            variant="ghost"
            onClick={() => setScale((s) => Math.max(MIN_SCALE, s - ZOOM_STEP))}
          />
        </Tooltip>
        <Text
          fontSize="xs"
          w="44px"
          textAlign="center"
          color="gray.600"
          cursor="pointer"
          onClick={resetView}
          _hover={{ color: "blue.500" }}
          title="Click to reset zoom & pan"
        >
          {Math.round(scale * 100)}%
        </Text>
        <Tooltip label="Zoom in" placement="bottom">
          <IconButton
            aria-label="Zoom in"
            icon={<FiZoomIn size={14} />}
            size="xs"
            variant="ghost"
            onClick={() => setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP))}
          />
        </Tooltip>

        <Box w="1px" h="16px" bg="gray.200" mx={1} />

        {/* Page navigation */}
        <Tooltip label="Previous page" placement="bottom">
          <IconButton
            aria-label="Previous page"
            icon={<FiChevronLeft size={14} />}
            size="xs"
            variant="ghost"
            isDisabled={pageNumber <= 1}
            onClick={() => goToPage(pageNumber - 1)}
          />
        </Tooltip>
        <Text fontSize="xs" color="gray.600" whiteSpace="nowrap" px={1}>
          {numPages > 0 ? `${pageNumber} / ${numPages}` : "—"}
        </Text>
        <Tooltip label="Next page" placement="bottom">
          <IconButton
            aria-label="Next page"
            icon={<FiChevronRight size={14} />}
            size="xs"
            variant="ghost"
            isDisabled={pageNumber >= numPages}
            onClick={() => goToPage(pageNumber + 1)}
          />
        </Tooltip>

        <Box flex={1} />

        {/* File name */}
        {fileName && (
          <Text fontSize="xs" color="gray.500" isTruncated maxW="120px" title={fileName}>
            {fileName}
          </Text>
        )}
      </Flex>

      {/* PDF canvas area */}
      <Box
        ref={containerRef}
        flex={1}
        overflow="hidden"
        bg="gray.200"
        cursor="grab"
        _active={{ cursor: "grabbing" }}
        userSelect="none"
        position="relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="flex-start"
          justifyContent="center"
          pt={4}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <Flex h="200px" align="center" justify="center">
                <Spinner color="blue.500" />
              </Flex>
            }
            error={
              <Flex h="200px" align="center" justify="center" direction="column" gap={2}>
                <Text fontSize="sm" color="red.500">Failed to load PDF.</Text>
              </Flex>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </Box>
      </Box>
    </Flex>
  );
};

export default PdfViewer;
