export type SummaryStatus =
  | "pending"
  | "processing"
  | "ready"
  | "partial"
  | "failed"
  | "orphaned";

export type SummaryProgressPhase = "summary" | "page_index";

export interface IEnrichedFileSummaryProgress {
  phase: SummaryProgressPhase;
  current: number;
  total: number;
  updatedAt: Date;
}

export interface IEnrichedFilePageEntry {
  page: number;
  summary: string;
}

export interface IEnrichedFileChunk {
  startPage: number;
  endPage: number;
  overview: string;
  keyTopics: string[];
}

export interface IEnrichedFileSummary {
  overview: string;
  documentType: string;
  keyTopics: string[];
  chunks?: IEnrichedFileChunk[];
}

export interface IEnrichedFileCreate {
  fileId: string;
  documentType?: string;
}
