export type { SummaryStatus, IEnrichedFileChunk, IEnrichedFileSummary, IEnrichedFileCreate } from "./enrichedFile";

export type TenderStatus = "bidding" | "won" | "lost";

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
