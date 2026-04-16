import {
  TenderPricingRow,
  TenderPricingRowType,
  RowComputedValues,
  SubtotalResult,
} from "./types";

export function computeRow(
  row: TenderPricingRow,
  defaultMarkupPct: number
): RowComputedValues {
  const totalUP = (row.unitPrice ?? 0) + (row.extraUnitPrice ?? 0);

  const effectiveMarkup = defaultMarkupPct + (row.markupOverride ?? 0);

  const suggestedBidUP = totalUP * (1 + effectiveMarkup / 100);
  const lineItemTotal = suggestedBidUP * (row.quantity ?? 0);

  return { totalUP, effectiveMarkup, suggestedBidUP, lineItemTotal };
}

/**
 * Computes the subtotal for a header row (schedule or group).
 * Walks forward from headerIndex, accumulating lineItemTotal for all "item"
 * rows that belong to this header.
 *
 * Schedule: owns ALL items until the next Schedule (regardless of indentLevel).
 * Group: owns items until the next Group/Schedule at the same or lower indentLevel.
 *
 * This handles both properly-indented hierarchies AND flat-indent data
 * (e.g. Claude-created rows where everything is at indentLevel 0).
 */
export function computeSubtotal(
  rows: TenderPricingRow[],
  headerIndex: number,
  defaultMarkupPct: number
): SubtotalResult {
  const header = rows[headerIndex];
  let total = 0;
  let firstUnit: string | null = null;
  let uniformQty = 0;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];

    if (header.type === TenderPricingRowType.Schedule) {
      if (row.type === TenderPricingRowType.Schedule) break;
    } else {
      if (
        row.type !== TenderPricingRowType.Item &&
        row.indentLevel <= header.indentLevel
      ) break;
    }

    if (row.type === TenderPricingRowType.Item) {
      const { lineItemTotal } = computeRow(row, defaultMarkupPct);
      total += lineItemTotal;
      uniformQty += row.quantity ?? 0;
      if (firstUnit == null) firstUnit = row.unit ?? null;
    }
  }

  return { lineItemTotal: total, quantity: uniformQty, unit: firstUnit };
}

export function computeSheetTotal(
  rows: TenderPricingRow[],
  defaultMarkupPct: number
): number {
  return rows
    .filter((r) => r.type === TenderPricingRowType.Item)
    .reduce((sum, row) => sum + computeRow(row, defaultMarkupPct).lineItemTotal, 0);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMarkup(
  markupOverride: number | null | undefined
): string {
  if (markupOverride == null || markupOverride === 0) return "DEFAULT";
  return markupOverride > 0 ? `+${markupOverride}%` : `${markupOverride}%`;
}
