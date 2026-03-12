export type TenderStatus = "bidding" | "won" | "lost";
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

export interface ITenderCreate {
  name: string;
  jobcode: string;
  description?: string;
  createdBy: string;
}

export interface ITenderUpdate {
  name?: string;
  description?: string;
  status?: TenderStatus;
  jobsiteId?: string | null;
}
