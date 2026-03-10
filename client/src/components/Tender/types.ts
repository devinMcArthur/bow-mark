// ─── Shared TypeScript interfaces and utilities for Tender components ──────────

export const TENDER_STATUS_COLORS: Record<string, string> = {
  bidding: "blue",
  won: "green",
  lost: "red",
};

export const tenderStatusColor = (status: string): string =>
  TENDER_STATUS_COLORS[status] ?? "gray";

export interface TenderFileSummary {
  overview: string;
  documentType: string;
  keyTopics: string[];
}

export interface TenderFileItem {
  _id: string;
  documentType: string;
  summaryStatus: string;
  pageCount?: number | null;
  summary?: TenderFileSummary | null;
  file: {
    _id: string;
    mimetype: string;
  };
}

export interface TenderJobsite {
  _id: string;
  name: string;
}

export interface TenderDetail {
  _id: string;
  name: string;
  jobcode: string;
  status: string;
  description?: string | null;
  files: TenderFileItem[];
  jobsite?: TenderJobsite | null;
  createdAt: string;
  updatedAt: string;
}
