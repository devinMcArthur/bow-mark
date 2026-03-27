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

export interface ITenderNote {
  content: string;
  savedBy: string; // User _id
  conversationId: string;
}

export interface ITenderJobSummary {
  content: string;
  generatedAt: Date;
  generatedBy: "auto" | "manual";
  generatedFrom: string[]; // enrichedFile _ids + note _ids
}
