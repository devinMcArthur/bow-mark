import { JobsiteDocument } from "@models";
import SearchClient from "../../client";
import SearchIndices from "@constants/SearchIndices";

export interface JobsiteSearchDocument {
  id: string;
  name: string;
  jobcode?: string;
}

export const JobsiteSearchIndex = SearchClient.index<JobsiteSearchDocument>(
  SearchIndices.Jobsite
);
JobsiteSearchIndex.primaryKey = "id";

export const search_UpdateJobsite = async (jobsite: JobsiteDocument) => {
  if (process.env.NODE_ENV === "test") return;

  if (!jobsite.archivedAt) {
    await JobsiteSearchIndex.addDocuments([
      {
        id: jobsite._id.toString(),
        name: jobsite.name,
        jobcode: jobsite.jobcode,
      },
    ]);
  } else {
    await JobsiteSearchIndex.deleteDocument(jobsite._id.toString());
  }
};
