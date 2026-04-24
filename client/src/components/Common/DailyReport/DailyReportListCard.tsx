import {
  Flex,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import NextLink from "next/link";
import React from "react";
import { FiBookOpen, FiList, FiSearch, FiX } from "react-icons/fi";

import { DailyReportCardSnippetFragment } from "../../../generated/graphql";
import Card from "../Card";
import DailyReportCard from "./DailyReportCard";
import ShowMore from "../ShowMore";
import createLink from "../../../utils/createLink";
import dayjs from "dayjs";

interface IDailyReportListCard {
  dailyReports?: DailyReportCardSnippetFragment[];
  jobsiteId?: string;
  limit?: number;
}

/**
 * Client-side filter across the jobsite's loaded daily reports. Matches
 * on crew name (case-insensitive) and date — date matching accepts
 * loose forms like "2026-04", "apr 23", "23", "april", etc. since that
 * covers the common "find the crew/day I'm looking for" flow.
 */
function filterDailyReports(
  list: DailyReportCardSnippetFragment[],
  query: string
): DailyReportCardSnippetFragment[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((r) => {
    if (r.crew?.name?.toLowerCase().includes(q)) return true;
    const d = dayjs(r.date);
    // Day-specific formats only — month-only forms ("August 2026") were
    // causing "August 20" to false-match any date in August 2020/2026
    // because the query was a substring of the year.
    const candidates = [
      d.format("YYYY-MM-DD"),
      d.format("MMM D, YYYY"),
      d.format("MMMM D, YYYY"),
      d.format("dddd"),
    ];
    return candidates.some((c) => c.toLowerCase().includes(q));
  });
}

const DailyReportListCard = ({
  limit,
  dailyReports,
  jobsiteId,
}: IDailyReportListCard) => {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => (dailyReports ? filterDailyReports(dailyReports, query) : undefined),
    [dailyReports, query]
  );
  const showingCount = filtered?.length ?? 0;
  const totalCount = dailyReports?.length ?? 0;
  const hasQuery = query.trim().length > 0;

  return (
    <Card
      variant="flat"
      // Reserve space only while loading OR when the list is long
      // enough that ShowMore's bounded-scroll mode will kick in. Short
      // lists (1-2 reports) size naturally — the card sits alone in a
      // column so the empty-space cost was too high.
      minH={!dailyReports || (dailyReports?.length ?? 0) > (limit ?? 3) ? "70vh" : undefined}
      heading={
        <Flex
          flexDir={["column", "row"]}
          align={["stretch", "center"]}
          gap={2}
        >
          <Heading ml={2} my="auto" size="md" whiteSpace="nowrap">
            Daily Reports{" "}
            {dailyReports
              ? hasQuery
                ? `(${showingCount} of ${totalCount})`
                : `(${totalCount})`
              : ""}
          </Heading>
          {/* Inline the search alongside the heading — on narrow
              viewports the Flex stacks, so the input drops below. */}
          {dailyReports && dailyReports.length > 0 && (
            <InputGroup size="sm" flex={1}>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray" />
              </InputLeftElement>
              <Input
                placeholder="Search by crew or date"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <InputRightElement>
                  <IconButton
                    aria-label="Clear"
                    size="xs"
                    variant="ghost"
                    icon={<FiX />}
                    onClick={() => setQuery("")}
                  />
                </InputRightElement>
              )}
            </InputGroup>
          )}
          {jobsiteId && (
            <Flex align="center" gap={1}>
              <Tooltip label="Story view">
                <NextLink href={createLink.jobsiteStory(jobsiteId)} passHref>
                  <IconButton
                    as="a"
                    aria-label="Story view"
                    icon={<FiBookOpen />}
                    size="sm"
                    variant="ghost"
                  />
                </NextLink>
              </Tooltip>
              <Tooltip label="View all reports">
                <NextLink
                  href={createLink.jobsiteDailyReports(jobsiteId)}
                  passHref
                >
                  <IconButton
                    as="a"
                    aria-label="View all reports"
                    icon={<FiList />}
                    size="sm"
                    variant="ghost"
                  />
                </NextLink>
              </Tooltip>
            </Flex>
          )}
        </Flex>
      }
    >
      {filtered ? (
        filtered.length === 0 && hasQuery ? (
          <Text fontSize="sm" color="gray.500" px={4} py={3}>
            No daily reports match &ldquo;{query.trim()}&rdquo;.
          </Text>
        ) : (
          // ShowMore's own bounded-height mode: list scrolls inside,
          // Show more/less button stays pinned to the bottom of the
          // card so the card size doesn't change on toggle.
          <ShowMore
            maxH="70vh"
            limit={limit}
            list={filtered.map((dailyReport) => (
              <DailyReportCard
                key={dailyReport._id}
                dailyReport={dailyReport}
                hideJobsite={!!jobsiteId}
              />
            ))}
          />
        )
      ) : (
        <Stack spacing={2} my={4}>
          <Skeleton h="4em" />
          <Skeleton h="4em" />
        </Stack>
      )}
    </Card>
  );
};

export default DailyReportListCard;
