export type SummaryStatus = "pending" | "processing" | "ready" | "failed";

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
