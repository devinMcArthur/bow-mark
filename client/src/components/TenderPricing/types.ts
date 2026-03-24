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
  subcontractorUP?: number | null;
  truckingUP?: number | null;
  materialUP?: number | null;
  crewUP?: number | null;
  rentalUP?: number | null;
  markupOverride?: number | null;
  unitPrice?: number | null;
  notes?: string | null;
  calculatorType?: string | null;
  calculatorInputsJson?: string | null;
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
