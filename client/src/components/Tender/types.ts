// ─── Shared TypeScript interfaces and utilities for Tender components ──────────

export const TENDER_STATUS_COLORS: Record<string, string> = {
  bidding: "blue",
  won: "green",
  lost: "red",
};

export const tenderStatusColor = (status: string): string =>
  TENDER_STATUS_COLORS[status] ?? "gray";

export interface TenderFileSummaryChunk {
  startPage: number;
  endPage: number;
  overview: string;
  keyTopics: string[];
}

export interface TenderFileSummary {
  overview: string;
  documentType: string;
  keyTopics: string[];
  chunks?: TenderFileSummaryChunk[] | null;
}

export interface TenderFileItem {
  _id: string;
  documentType?: string | null;
  summaryStatus: string;
  summaryError?: string | null;
  pageCount?: number | null;
  summary?: TenderFileSummary | null;
  file: {
    _id: string;
    mimetype: string;
    description?: string | null;
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
