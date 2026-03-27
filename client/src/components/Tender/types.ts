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

export interface TenderNote {
  _id: string;
  content: string;
  savedBy?: { name?: string | null } | null;
  savedAt: string;
  conversationId: string;
}

export interface TenderJobSummary {
  content: string;
  generatedAt: string;
  generatedBy: string;
  generatedFrom: string[];
}

export interface TenderDetail {
  _id: string;
  name: string;
  jobcode: string;
  status: string;
  description?: string | null;
  files: TenderFileItem[];
  notes: TenderNote[];
  summaryGenerating: boolean;
  jobSummary?: TenderJobSummary | null;
  jobsite?: TenderJobsite | null;
  createdAt: string;
  updatedAt: string;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
