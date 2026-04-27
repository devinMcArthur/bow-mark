import React from "react";
import { Box, Button, Stack } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { UserRoles, useDailyReportEntriesQuery } from "../../generated/graphql";
import { useAuth } from "../../contexts/Auth";
import Loading from "../Common/Loading";
import DailyReportComposer from "./DailyReportComposer";
import DailyReportEntryCard from "./DailyReportEntryCard";

/**
 * Timeline of DailyReportEntry rows. Composer sits at the top (always
 * visible, no toggles) so posting a thought or photo is a single tap;
 * entries render below in chronological order — oldest first so
 * readers follow the arc of the day.
 *
 * For busy days we collapse older entries behind a "Show N earlier"
 * button so the downstream Today's Numbers / Documents sections don't
 * get buried. The default-visible window is the N most recent entries
 * — new posts always land in-view.
 */

// Number of most-recent entries visible before collapsing the rest.
// 0 means entries are always hidden until the user clicks "Show N"
// — keeps the page tight when there's a day full of posts.
const DEFAULT_VISIBLE = 0;

interface DailyReportTimelineProps {
  dailyReportId: string;
  /**
   * When false, the composer is hidden. Used for read-only surfaces
   * (e.g. archived reports, future share-links).
   */
  canPost?: boolean;
}

const DailyReportTimeline: React.FC<DailyReportTimelineProps> = ({
  dailyReportId,
  canPost = true,
}) => {
  const {
    state: { user },
  } = useAuth();

  const { data, loading } = useDailyReportEntriesQuery({
    variables: { dailyReportId },
    fetchPolicy: "cache-and-network",
  });

  const entries = data?.dailyReportEntries ?? [];
  // UserRoles is a GraphQL string enum (Admin|Developer|ProjectManager|User).
  // Pass through as-is; DailyReportEntryCard uses hasPermission() to gate
  // on role weight.
  const viewerRole = user?.role as UserRoles | undefined;

  // Default expanded on desktop, collapsed on mobile. Read matchMedia
  // synchronously in the initializer so the desktop default doesn't
  // flash collapsed-then-expanded on first paint. Resize after mount
  // doesn't re-evaluate, so a user's manual toggle sticks.
  const [showAll, setShowAll] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches
  );
  const hiddenCount = Math.max(0, entries.length - DEFAULT_VISIBLE);
  // slice(entries.length - 0) === slice(entries.length) === []
  // — avoids the slice(-0) gotcha where -0 gets coerced to 0 and the
  // whole array comes back instead of nothing.
  const visibleEntries = showAll
    ? entries
    : hiddenCount === 0
      ? entries
      : entries.slice(entries.length - DEFAULT_VISIBLE);

  // Nothing to show — no composer, no entries, not even a loading
  // state. Return null so the parent can skip its wrapping margin
  // entirely (avoids a stale gap between the hero and the next
  // section on read-only / empty reports).
  if (!canPost && entries.length === 0 && !loading) return null;

  return (
    <Box mb={6}>
      {canPost && (
        <Box mb={4}>
          <DailyReportComposer dailyReportId={dailyReportId} />
        </Box>
      )}

      {loading && entries.length === 0 && <Loading />}

      {hiddenCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          colorScheme="blue"
          leftIcon={showAll ? <FiChevronUp /> : <FiChevronDown />}
          // Only push space under the button when actual entries render
          // below it. Without this, the collapsed state leaves the
          // button floating with its own margin + the outer-wrapper's
          // mb={6}, creating a big empty band before the next section.
          mb={visibleEntries.length > 0 ? 3 : 0}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll
            ? `Hide earlier entries`
            : `Show ${hiddenCount} earlier ${hiddenCount === 1 ? "entry" : "entries"}`}
        </Button>
      )}

      <Stack spacing={3}>
        {visibleEntries.map((e) => (
          <DailyReportEntryCard
            key={e._id}
            entry={e}
            viewerUserId={user?._id}
            viewerRole={viewerRole}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default DailyReportTimeline;
