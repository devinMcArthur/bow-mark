// client/src/components/Common/JobsiteReport/InvoiceTable.tsx
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  HStack,
  Table,
  TableCaption,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import React from "react";
import { JobsiteDayReportInvoiceSnippetFragment } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";

type ViewMode = "grouped" | "flat";
type SortCol = "date" | "cost";
type SortDir = "asc" | "desc";

interface Props {
  invoices: JobsiteDayReportInvoiceSnippetFragment[];
  caption: string;
  colorScheme?: string;
}

const InvoiceTable: React.FC<Props> = ({
  invoices,
  caption,
  colorScheme = "red",
}) => {
  const [viewMode, setViewMode] = React.useState<ViewMode>("grouped");
  const [sortCol, setSortCol] = React.useState<SortCol>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [expandedCompanies, setExpandedCompanies] = React.useState<Set<string>>(
    () => new Set(invoices.map((r) => r.invoice.company._id))
  );

  React.useEffect(() => {
    setExpandedCompanies(new Set(invoices.map((r) => r.invoice.company._id)));
  }, [invoices]);

  const total = invoices.reduce((sum, r) => sum + r.value, 0);

  // ── Type badge ──────────────────────────────────────────────────────────────

  const typeBadge = (r: JobsiteDayReportInvoiceSnippetFragment) => {
    if (r.accrual) return <Badge colorScheme="purple">Accrual</Badge>;
    if (r.internal) return <Badge colorScheme="orange">Internal</Badge>;
    return null;
  };

  // ── Flat sort ───────────────────────────────────────────────────────────────

  const handleSortToggle = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const sortIndicator = (col: SortCol) =>
    sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  // ── Grouped view data ───────────────────────────────────────────────────────

  const groupedView = React.useMemo(() => {
    const groups = new Map<
      string,
      {
        name: string;
        subtotal: number;
        rows: JobsiteDayReportInvoiceSnippetFragment[];
      }
    >();
    for (const r of invoices) {
      const id = r.invoice.company._id;
      if (!groups.has(id)) {
        groups.set(id, { name: r.invoice.company.name, subtotal: 0, rows: [] });
      }
      const g = groups.get(id)!;
      g.subtotal += r.value;
      g.rows.push(r);
    }
    // Sort groups by subtotal descending
    const sorted = Array.from(groups.entries()).sort(
      (a, b) => b[1].subtotal - a[1].subtotal
    );
    // Sort rows within each group by date descending
    for (const [, g] of sorted) {
      g.rows.sort(
        (a, b) =>
          new Date(b.invoice.date).getTime() -
          new Date(a.invoice.date).getTime()
      );
    }
    return sorted;
  }, [invoices]);

  const toggleCompany = (id: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Flat view data ──────────────────────────────────────────────────────────

  const flatRows = React.useMemo(() => {
    return [...invoices].sort((a, b) => {
      const aDate = new Date(a.invoice.date).getTime();
      const bDate = new Date(b.invoice.date).getTime();
      const diff =
        sortCol === "date" ? aDate - bDate : a.value - b.value;
      return sortDir === "asc" ? diff : -diff;
    });
  }, [invoices, sortCol, sortDir]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box>
      <HStack justify="flex-end" mb={2}>
        <ButtonGroup size="xs" isAttached>
          <Button
            variant={viewMode === "grouped" ? "solid" : "outline"}
            onClick={() => setViewMode("grouped")}
          >
            Grouped
          </Button>
          <Button
            variant={viewMode === "flat" ? "solid" : "outline"}
            onClick={() => setViewMode("flat")}
          >
            Flat
          </Button>
        </ButtonGroup>
      </HStack>

      <Box w="100%" overflowX="auto" backgroundColor="gray.200" borderRadius={4}>
        {viewMode === "grouped" ? (
          <Table variant="striped" colorScheme={colorScheme}>
            <TableCaption>{caption}</TableCaption>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Invoice #</Th>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th isNumeric>Cost</Th>
              </Tr>
            </Thead>
            <Tbody>
              {groupedView.map(([companyId, group]) => {
                const isExpanded = expandedCompanies.has(companyId);
                return (
                  <React.Fragment key={companyId}>
                    <Tr
                      cursor="pointer"
                      bg="gray.100"
                      _hover={{ bg: "gray.200" }}
                      onClick={() => toggleCompany(companyId)}
                    >
                      <Td colSpan={4} fontWeight="bold">
                        {isExpanded ? "▾" : "▸"} {group.name}{" "}
                        <Text
                          as="span"
                          fontWeight="normal"
                          color="gray.500"
                          fontSize="sm"
                        >
                          ({group.rows.length} invoice
                          {group.rows.length !== 1 ? "s" : ""})
                        </Text>
                      </Td>
                      <Td isNumeric fontWeight="bold">
                        ${formatNumber(group.subtotal)}
                      </Td>
                    </Tr>
                    {isExpanded &&
                      group.rows.map((r) => (
                        <Tr key={r._id}>
                          <Td>
                            {new Date(r.invoice.date).toLocaleDateString()}
                          </Td>
                          <Td>{r.invoice.invoiceNumber}</Td>
                          <Td
                            color={
                              r.invoice.description ? undefined : "gray.400"
                            }
                          >
                            {r.invoice.description ?? "—"}
                          </Td>
                          <Td>{typeBadge(r)}</Td>
                          <Td isNumeric>${formatNumber(r.value)}</Td>
                        </Tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </Tbody>
            <Tfoot>
              <Tr>
                <Th colSpan={4}>Total</Th>
                <Th isNumeric>${formatNumber(total)}</Th>
              </Tr>
            </Tfoot>
          </Table>
        ) : (
          <Table variant="striped" colorScheme={colorScheme}>
            <TableCaption>{caption}</TableCaption>
            <Thead>
              <Tr>
                <Th
                  cursor="pointer"
                  userSelect="none"
                  onClick={() => handleSortToggle("date")}
                >
                  Date{sortIndicator("date")}
                </Th>
                <Th>Company</Th>
                <Th>Invoice #</Th>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th
                  isNumeric
                  cursor="pointer"
                  userSelect="none"
                  onClick={() => handleSortToggle("cost")}
                >
                  Cost{sortIndicator("cost")}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {flatRows.map((r) => (
                <Tr key={r._id}>
                  <Td>{new Date(r.invoice.date).toLocaleDateString()}</Td>
                  <Td>{r.invoice.company.name}</Td>
                  <Td>{r.invoice.invoiceNumber}</Td>
                  <Td
                    color={r.invoice.description ? undefined : "gray.400"}
                  >
                    {r.invoice.description ?? "—"}
                  </Td>
                  <Td>{typeBadge(r)}</Td>
                  <Td isNumeric>${formatNumber(r.value)}</Td>
                </Tr>
              ))}
            </Tbody>
            <Tfoot>
              <Tr>
                <Th colSpan={5}>Total</Th>
                <Th isNumeric>${formatNumber(total)}</Th>
              </Tr>
            </Tfoot>
          </Table>
        )}
      </Box>
    </Box>
  );
};

export default InvoiceTable;
