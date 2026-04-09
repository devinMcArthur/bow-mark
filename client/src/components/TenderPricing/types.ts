export interface DocRef {
  _id: string;
  enrichedFileId: string;
  page: number;
  description?: string | null;
}

export enum TenderPricingRowType {
  Schedule = "Schedule",
  Group = "Group",
  Item = "Item",
}

export interface TenderPricingRow {
  _id: string;
  type: TenderPricingRowType;
  sortOrder: number;
  itemNumber: string;
  description: string;
  indentLevel: number;
  quantity?: number | null;
  unit?: string | null;
  markupOverride?: number | null;
  unitPrice?: number | null;
  notes?: string | null;
  rateBuildupSnapshot?: string | null;
  extraUnitPrice?: number | null;
  extraUnitPriceMemo?: string | null;
  docRefs?: DocRef[] | null;
  status?: string | null;
}

export interface TenderPricingSheet {
  _id: string;
  defaultMarkupPct: number;
  rows: TenderPricingRow[];
}

export interface RowComputedValues {
  totalUP: number;
  effectiveMarkup: number;
  suggestedBidUP: number;
  lineItemTotal: number;
}

export interface SubtotalResult {
  lineItemTotal: number;
  quantity: number;
  unit: string | null;
}
