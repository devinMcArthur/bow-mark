// client/src/components/pages/jobsite-report/InvoiceTablePG.tsx
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
import { InvoiceReportPg } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";

type ViewMode = "grouped" | "flat";
type SortCol = "date" | "cost";
type SortDir = "asc" | "desc";

interface Props {
  invoices: InvoiceReportPg[];
  caption: string;
  colorScheme?: string;
}

const formatCurrency = (n: number) =>
  n < 0 ? `-$${formatNumber(Math.abs(n))}` : `$${formatNumber(n)}`;

const typeBadge = (invoiceType: string) => {
  if (invoiceType === "accrual")
    return <Badge colorScheme="purple">Accrual</Badge>;
  if (invoiceType === "internal")
    return <Badge colorScheme="orange">Internal</Badge>;
  return null;
};

const InvoiceTablePG: React.FC<Props> = ({
  invoices,
  caption,
  colorScheme = "red",
}) => {
  const [viewMode, setViewMode] = React.useState<ViewMode>("grouped");
  const [sortCol, setSortCol] = React.useState<SortCol>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [expandedCompanies, setExpandedCompanies] = React.useState<Set<string>>(
    () => new Set(invoices.map((r) => r.companyName))
  );

  React.useEffect(() => {
    setExpandedCompanies(new Set(invoices.map((r) => r.companyName)));
  }, [invoices]);

  const total = invoices.reduce((sum, r) => sum + r.amount, 0);

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

  // ── Grouped view ─────────────────────────────────────────────────────────────

  const groupedView = React.useMemo(() => {
    const groups = new Map<
      string,
      { subtotal: number; rows: InvoiceReportPg[] }
    >();
    for (const r of invoices) {
      if (!groups.has(r.companyName)) {
        groups.set(r.companyName, { subtotal: 0, rows: [] });
      }
      const g = groups.get(r.companyName)!;
      g.subtotal += r.amount;
      g.rows.push(r);
    }
    const sorted = Array.from(groups.entries()).sort(
      (a, b) => b[1].subtotal - a[1].subtotal
    );
    for (const [, g] of sorted) {
      g.rows.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
    return sorted;
  }, [invoices]);

  const toggleCompany = (name: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // ── Flat view ─────────────────────────────────────────────────────────────────

  const flatRows = React.useMemo(() => {
    return [...invoices].sort((a, b) => {
      const diff =
        sortCol === "date"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : a.amount - b.amount;
      return sortDir === "asc" ? diff : -diff;
    });
  }, [invoices, sortCol, sortDir]);

  // ── Render ────────────────────────────────────────────────────────────────────

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
          <Table size="sm" variant="striped" colorScheme={colorScheme}>
            <TableCaption>{caption}</TableCaption>
            <Thead sx={{ "th": { paddingTop: 4 } }}>
              <Tr>
                <Th>Date</Th>
                <Th>Invoice #</Th>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th isNumeric>Amount</Th>
              </Tr>
            </Thead>
            <Tbody>
              {groupedView.map(([companyName, group]) => {
                const isExpanded = expandedCompanies.has(companyName);
                return (
                  <React.Fragment key={companyName}>
                    <Tr
                      cursor="pointer"
                      bg="gray.100"
                      _hover={{ bg: "gray.200" }}
                      onClick={() => toggleCompany(companyName)}
                    >
                      <Td colSpan={4} fontWeight="bold">
                        {isExpanded ? "▾" : "▸"} {companyName}{" "}
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
                        {formatCurrency(group.subtotal)}
                      </Td>
                    </Tr>
                    {isExpanded &&
                      group.rows.map((r) => (
                        <Tr key={r.id}>
                          <Td>
                            {new Date(r.date).toLocaleDateString()}
                          </Td>
                          <Td>{r.invoiceNumber}</Td>
                          <Td color={r.description ? undefined : "gray.400"}>
                            {r.description ?? "—"}
                          </Td>
                          <Td>{typeBadge(r.invoiceType)}</Td>
                          <Td isNumeric>{formatCurrency(r.amount)}</Td>
                        </Tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </Tbody>
            <Tfoot>
              <Tr>
                <Th colSpan={4}>Total</Th>
                <Th isNumeric>{formatCurrency(total)}</Th>
              </Tr>
            </Tfoot>
          </Table>
        ) : (
          <Table size="sm" variant="striped" colorScheme={colorScheme}>
            <TableCaption>{caption}</TableCaption>
            <Thead sx={{ "th": { paddingTop: 4 } }}>
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
                  Amount{sortIndicator("cost")}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {flatRows.map((r) => (
                <Tr key={r.id}>
                  <Td>{new Date(r.date).toLocaleDateString()}</Td>
                  <Td>{r.companyName}</Td>
                  <Td>{r.invoiceNumber}</Td>
                  <Td color={r.description ? undefined : "gray.400"}>
                    {r.description ?? "—"}
                  </Td>
                  <Td>{typeBadge(r.invoiceType)}</Td>
                  <Td isNumeric>{formatCurrency(r.amount)}</Td>
                </Tr>
              ))}
            </Tbody>
            <Tfoot>
              <Tr>
                <Th colSpan={5}>Total</Th>
                <Th isNumeric>{formatCurrency(total)}</Th>
              </Tr>
            </Tfoot>
          </Table>
        )}
      </Box>
    </Box>
  );
};

export default InvoiceTablePG;
