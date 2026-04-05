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
const MAX_SCALE = 10;
const ZOOM_STEP = 0.25;

const PdfViewer: React.FC<PdfViewerProps> = ({ url, fileName, initialPage, onPageChange }) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(initialPage ?? 1);
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(380);

  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  // Refs so touch handlers always see current values without stale closures
  const panRef = useRef(pan);
  panRef.current = pan;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const containerWidthRef = useRef(containerWidth);
  containerWidthRef.current = containerWidth;
  const touchStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const livePinchScale = useRef(1); // visual-only scale during gesture, avoids re-renders
  const pinchMidpoint = useRef({ x: 0, y: 0 });

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

  // Non-passive wheel handler — zoom toward cursor position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * factor));
      const ratio = newScale / scaleRef.current;
      const c = containerWidthRef.current / 2;
      const newPan = {
        x: (cx - c) * (1 - ratio) + panRef.current.x * ratio,
        y: cy * (1 - ratio) + panRef.current.y * ratio,
      };
      setScale(newScale);
      setPan(newPan);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Non-passive touch handlers for pan + pinch-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const dist = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: panRef.current.x, py: panRef.current.y };
        pinchStart.current = null;
      } else if (e.touches.length === 2) {
        pinchStart.current = { dist: dist(e.touches), scale: scaleRef.current };
        touchStart.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && touchStart.current) {
        const nx = touchStart.current.px + (e.touches[0].clientX - touchStart.current.x);
        const ny = touchStart.current.py + (e.touches[0].clientY - touchStart.current.y);
        if (innerRef.current) innerRef.current.style.transform = `translate(${nx}px, ${ny}px)`;
        setPan({ x: nx, y: ny });
      } else if (e.touches.length === 2 && pinchStart.current) {
        const rect = el.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        pinchMidpoint.current = { x: mx, y: my };
        const ratio = dist(e.touches) / pinchStart.current.dist;
        const clamped = Math.max(MIN_SCALE / scaleRef.current, Math.min(MAX_SCALE / scaleRef.current, ratio));
        livePinchScale.current = clamped;
        if (innerRef.current) {
          // Set transform-origin to finger midpoint so visual zoom tracks fingers
          innerRef.current.style.transformOrigin = `${mx - panRef.current.x}px ${my - panRef.current.y}px`;
          innerRef.current.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${clamped})`;
        }
      }
    };

    const onTouchEnd = () => {
      if (pinchStart.current && livePinchScale.current !== 1) {
        const S = livePinchScale.current;
        const committed = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * S));
        const ratio = committed / scaleRef.current;
        const { x: mx, y: my } = pinchMidpoint.current;
        const c = containerWidthRef.current / 2;
        const newPan = {
          x: (mx - c) * (1 - ratio) + panRef.current.x * ratio,
          y: my * (1 - ratio) + panRef.current.y * ratio,
        };
        livePinchScale.current = 1;
        if (innerRef.current) {
          innerRef.current.style.transformOrigin = "center top";
          innerRef.current.style.transform = `translate(${newPan.x}px, ${newPan.y}px)`;
        }
        setScale(committed);
        setPan(newPan);
      }
      touchStart.current = null;
      pinchStart.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Sync pan/scale state → DOM after wheel zoom or pinch commit.
  // Drives the transform exclusively via ref so React's style prop never fights imperative updates.
  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.style.transformOrigin = "center top";
      innerRef.current.style.transform = `translate(${pan.x}px, ${pan.y}px)`;
    }
  }, [pan, scale]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setPageNumber(initialPage ?? 1);
      setScale(1.0);
      setPan({ x: 0, y: 0 });
    },
    [initialPage]
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
          ref={innerRef}
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="flex-start"
          justifyContent="center"
          pt={4}
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
