import React from "react";
import {
  Badge,
  Box,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiSearch, FiX } from "react-icons/fi";
import {
  JobsiteFullSnippetFragment,
  JobsiteInvoiceKind,
  useJobsiteInvoiceSearchQuery,
} from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import InvoiceCardForJobsite from "./InvoiceCard";
import InvoiceCardForJobsiteMaterial from "../../../../Common/JobsiteMaterial/InvoiceCard";

interface IJobsiteInvoiceSearch {
  jobsite: JobsiteFullSnippetFragment;
  /**
   * Optional slot rendered inline with the search input — used to
   * consolidate secondary actions (Trucking rates, Legacy reports) into
   * the same horizontal strip instead of floating them as orphan
   * buttons below.
   */
  rightActions?: React.ReactNode;
}

const KIND_META: Record<
  JobsiteInvoiceKind,
  { label: string; color: string }
> = {
  [JobsiteInvoiceKind.Subcontractor]: { label: "Subcontractor", color: "red" },
  [JobsiteInvoiceKind.Revenue]: { label: "Revenue", color: "green" },
  [JobsiteInvoiceKind.Material]: { label: "Material", color: "purple" },
};

/**
 * Jobsite-scoped invoice search. Appears as a single card at the top of
 * the jobsite page; the results list only renders when the user has
 * typed a non-empty query. Each result is the existing invoice card
 * component (edit-in-place) plus a small kind badge so she knows which
 * bucket it came from — material invoices additionally show the parent
 * material name since they're normally buried under the Materials card.
 */
const JobsiteInvoiceSearch = ({
  jobsite,
  rightActions,
}: IJobsiteInvoiceSearch) => {
  const [rawQuery, setRawQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  // Debounce keeps us from pelting the server on every keystroke. 250ms
  // is the standard "feels instant but isn't spammy" number.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const { data, loading } = useJobsiteInvoiceSearchQuery({
    variables: { jobsiteId: jobsite._id, query: debouncedQuery },
    skip: debouncedQuery.length === 0,
    fetchPolicy: "cache-and-network",
  });

  const results = data?.jobsiteInvoiceSearch ?? [];
  const hasQuery = debouncedQuery.length > 0;

  return (
    <Card variant="flat">
      <Flex direction="column" gap={3}>
        {/* Search + caller-provided secondary actions in one row so the
            strip reads as a single purposeful toolbar instead of a
            heading + orphan buttons stacked vertically. On narrow
            viewports the Flex wraps. */}
        <Flex gap={2} align="center" wrap="wrap">
          <InputGroup size="sm" flex="1 1 260px">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray" />
            </InputLeftElement>
            <Input
              placeholder="Search invoices by company, invoice #, or description"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
            />
            {rawQuery && (
              <InputRightElement>
                <IconButton
                  aria-label="Clear"
                  size="xs"
                  variant="ghost"
                  icon={<FiX />}
                  onClick={() => setRawQuery("")}
                />
              </InputRightElement>
            )}
          </InputGroup>
          {rightActions}
        </Flex>

        {hasQuery && (
          <Box>
            {loading && results.length === 0 ? (
              <Stack>
                <Skeleton h="3em" />
                <Skeleton h="3em" />
              </Stack>
            ) : results.length === 0 ? (
              <Text fontSize="sm" color="gray.500" px={1} py={2}>
                No invoices match &ldquo;{debouncedQuery}&rdquo;.
              </Text>
            ) : (
              /* Cap the results at the same ~50vh used by the invoice
                 lists so a high-match query doesn't blow out the page
                 vertically. Inner scroll with small inset padding so
                 card drop shadows aren't clipped. */
              <Flex
                direction="column"
                gap={2}
                maxH="50vh"
                overflowY="auto"
                px={1}
                pb={1}
              >
                {results.map((hit) => {
                  const meta = KIND_META[hit.kind];
                  const materialName =
                    hit.kind === JobsiteInvoiceKind.Material
                      ? hit.jobsiteMaterial?.material?.name
                      : undefined;
                  return (
                    <Box key={hit.invoice._id}>
                      <Flex align="center" gap={2} mb={1} ml={1}>
                        <Badge colorScheme={meta.color} fontSize="0.65rem">
                          {meta.label}
                        </Badge>
                        {materialName && (
                          <Text fontSize="xs" color="gray.600">
                            {materialName}
                          </Text>
                        )}
                      </Flex>
                      {hit.kind === JobsiteInvoiceKind.Material &&
                      hit.jobsiteMaterial ? (
                        <InvoiceCardForJobsiteMaterial
                          invoice={hit.invoice}
                          jobsiteMaterialId={hit.jobsiteMaterial._id}
                          jobsiteId={jobsite._id}
                        />
                      ) : (
                        <InvoiceCardForJobsite
                          invoice={hit.invoice}
                          jobsiteId={jobsite._id}
                          invoiceKind={
                            hit.kind === JobsiteInvoiceKind.Revenue
                              ? "revenue"
                              : "subcontractor"
                          }
                        />
                      )}
                    </Box>
                  );
                })}
              </Flex>
            )}
          </Box>
        )}
      </Flex>
    </Card>
  );
};

export default JobsiteInvoiceSearch;
