import React from "react";
import { Box, HStack, Progress, Text } from "@chakra-ui/react";

// ─── Status helpers (shared across tender + jobsite displays) ────────────────

export function summaryStatusColor(status: string): string {
  if (status === "ready") return "green";
  if (status === "failed") return "red";
  if (status === "orphaned") return "red";
  // Blue for "processing" is more professional than yellow — reads as
  // "working on it" instead of "alert". Partial uses orange to flag the
  // need for watchdog-driven recovery.
  if (status === "processing") return "blue";
  if (status === "partial") return "orange";
  return "gray"; // pending
}

export function summaryStatusLabel(status: string): string {
  if (status === "orphaned") return "source missing";
  if (status === "partial") return "partial";
  return status;
}

export function phaseLabel(phase: string): string {
  if (phase === "summary") return "Synthesizing summary";
  if (phase === "page_index") return "Indexing pages";
  return phase;
}

function phaseUnit(phase: string): string {
  if (phase === "page_index") return "pages";
  return "";
}

// Rough ETA from elapsed time and linear progress rate. Conservative —
// real throughput varies across pages (large drawings cost more). Returns
// null for too-early or zero-progress cases so the UI hides the label.
export function computeEta(
  processingStartedAt: string | null | undefined,
  progress: { current: number; total: number } | null | undefined
): string | null {
  if (!processingStartedAt || !progress) return null;
  if (progress.current <= 0 || progress.total <= 0) return null;
  const elapsedMs = Date.now() - new Date(processingStartedAt).getTime();
  if (elapsedMs < 5_000) return null;
  const msPerUnit = elapsedMs / progress.current;
  const remaining = progress.total - progress.current;
  if (remaining <= 0) return null;
  const etaMs = msPerUnit * remaining;
  if (etaMs < 60_000) return "< 1 min";
  const mins = Math.round(etaMs / 60_000);
  if (mins < 60) return `~${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `~${hrs}h ${rem}m` : `~${hrs}h`;
}

// ─── Progress bar component ──────────────────────────────────────────────────

interface EnrichedFileProgressProps {
  status: string;
  progress?: {
    phase: string;
    current: number;
    total: number;
  } | null;
  processingStartedAt?: string | null;
  // Compact single-line variant for tight layouts (table rows, mobile
  // lists). Default is the two-line card variant.
  compact?: boolean;
}

const TABULAR_NUMS = { fontVariantNumeric: "tabular-nums" } as const;

// Pulse animation keyframes used by the live-activity dot. Declared once
// at the module level so the identifier is stable across renders.
const pulseAnimation = {
  animation: "efProgressDotPulse 1.8s ease-in-out infinite",
  "@keyframes efProgressDotPulse": {
    "0%, 100%": { opacity: 1, transform: "scale(1)" },
    "50%": { opacity: 0.4, transform: "scale(0.75)" },
  },
} as const;

/**
 * Live progress bar for an EnrichedFile in `processing` or `partial` state.
 * Renders nothing for other states. Shows phase, percentage, page/chunk
 * count, ETA, and a striped animated bar.
 */
export const EnrichedFileProgress: React.FC<EnrichedFileProgressProps> = ({
  status,
  progress,
  processingStartedAt,
  compact = false,
}) => {
  if (status !== "processing" && status !== "partial") return null;
  if (!progress) return null;

  const isPartial = status === "partial";
  const colorScheme = isPartial ? "orange" : "blue";
  const dotColor = isPartial ? "orange.400" : "blue.500";
  const pct =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const roundedPct = Math.round(pct);
  const eta = computeEta(processingStartedAt, progress);
  const unit = phaseUnit(progress.phase);
  const isIndeterminate = progress.current === 0;
  // The synthesis phase reports total=1 as a sentinel "we're busy on a
  // single Claude call" — the fraction (0/1 or 1/1) isn't meaningful, so
  // suppress it and rely on the indeterminate bar to convey activity.
  const hideFraction = progress.total <= 1;

  const dot = (
    <Box
      w="6px"
      h="6px"
      borderRadius="full"
      bg={dotColor}
      flexShrink={0}
      sx={pulseAnimation}
    />
  );

  if (compact) {
    return (
      <Box mt={1.5} role="group" aria-label="Processing progress">
        <HStack justify="space-between" spacing={2} mb={1} align="center">
          <HStack spacing={1.5} minW={0} flex={1}>
            {dot}
            <Text
              fontSize="2xs"
              fontWeight="semibold"
              color="gray.700"
              textTransform="uppercase"
              letterSpacing="0.02em"
              isTruncated
            >
              {phaseLabel(progress.phase)}
            </Text>
            {!hideFraction && (
              <Text
                fontSize="2xs"
                color="gray.500"
                sx={TABULAR_NUMS}
                flexShrink={0}
              >
                {progress.current}/{progress.total}
              </Text>
            )}
          </HStack>
          {eta && (
            <Text
              fontSize="2xs"
              color="gray.500"
              flexShrink={0}
              sx={TABULAR_NUMS}
            >
              {eta}
            </Text>
          )}
        </HStack>
        <Progress
          value={pct}
          size="xs"
          colorScheme={colorScheme}
          isIndeterminate={isIndeterminate || hideFraction}
          hasStripe={!isIndeterminate && !hideFraction}
          isAnimated={!isIndeterminate && !hideFraction}
          borderRadius="full"
        />
      </Box>
    );
  }

  // Full card variant: two-line layout with percentage, ETA, and a
  // detail row below the bar showing the current/total breakdown.
  return (
    <Box mt={2.5} role="group" aria-label="Processing progress">
      <HStack justify="space-between" mb={1.5} align="center">
        <HStack spacing={2}>
          {dot}
          <Text
            fontSize="xs"
            fontWeight="semibold"
            color="gray.700"
            textTransform="uppercase"
            letterSpacing="0.02em"
          >
            {phaseLabel(progress.phase)}
          </Text>
          {!hideFraction && (
            <Text
              fontSize="xs"
              color={isPartial ? "orange.500" : "blue.500"}
              fontWeight="semibold"
              sx={TABULAR_NUMS}
            >
              {roundedPct}%
            </Text>
          )}
        </HStack>
        {eta && (
          <Text fontSize="xs" color="gray.500" sx={TABULAR_NUMS}>
            {eta} left
          </Text>
        )}
      </HStack>
      <Progress
        value={pct}
        size="sm"
        colorScheme={colorScheme}
        isIndeterminate={isIndeterminate || hideFraction}
        hasStripe={!isIndeterminate && !hideFraction}
        isAnimated={!isIndeterminate && !hideFraction}
        borderRadius="full"
      />
      {!hideFraction && (
        <HStack justify="space-between" mt={1}>
          <Text fontSize="2xs" color="gray.400" sx={TABULAR_NUMS}>
            {progress.current} of {progress.total}
            {unit ? ` ${unit}` : ""}
          </Text>
          {isPartial && (
            <Text fontSize="2xs" color="orange.500" fontWeight="medium">
              Retrying
            </Text>
          )}
        </HStack>
      )}
    </Box>
  );
};
