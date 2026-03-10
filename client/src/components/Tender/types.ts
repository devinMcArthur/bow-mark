// ─── Shared TypeScript interfaces for Tender components ───────────────────────

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
