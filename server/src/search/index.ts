import SearchIndices from "@constants/SearchIndices";
import { SearchClass } from "@graphql/types/search";
import {
  Company,
  Crew,
  DailyReport,
  Employee,
  Jobsite,
  Vehicle,
} from "@models";
import { Id, ISearchOptions } from "@typescript/models";
import { Index, SearchParams, SearchResponse } from "meilisearch";
import SearchClient from "./client";
import {
  CompanySearchDocument,
  CrewSearchDocument,
  DailyReportSearchDocument,
  EmployeeSearchDocument,
  JobsiteSearchDocument,
  MaterialSearchDocument,
  VehicleSearchDocument,
} from "./helpers";

export * from "./client";
export * from "./helpers";

interface SearchMultiOptions {
  whitelistedCrews?: Id[];
}

type SearchDocument =
  | CompanySearchDocument
  | CrewSearchDocument
  | DailyReportSearchDocument
  | EmployeeSearchDocument
  | JobsiteSearchDocument
  | MaterialSearchDocument
  | VehicleSearchDocument;

export const searchIndex = async <T extends SearchDocument>(
  index: Index<T>,
  searchString: string,
  options?: ISearchOptions
): Promise<SearchResponse<T, SearchParams>> => {
  return index.search(searchString, {
    limit: options?.limit,
  });
};

export const searchMulti = async (
  indices: (typeof SearchIndices)[keyof typeof SearchIndices][],
  query: string,
  options?: SearchMultiOptions
): Promise<SearchClass[]> => {
  const { results } = await SearchClient.multiSearch({
    queries: indices.map((index) => {
      return {
        indexUid: index,
        q: query,
        showRankingScore: true,
      };
    }),
  });

  const collection: SearchClass[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    switch (result.indexUid) {
      case SearchIndices.Company: {
        for (let j = 0; j < result.hits.length; j++) {
          const hit = result.hits[j];
          if (hit.id) {
            collection.push({
              company: (await Company.getById(hit.id)) || undefined,
              score: hit._rankingScore ?? 0,
            });
          }
        }

        break;
      }
      case SearchIndices.DailyReport: {
        for (let j = 0; j < result.hits.length; j++) {
          const hit = result.hits[j];
          if (hit.id) {
            const dailyReport =
              (await DailyReport.getById(hit.id)) || undefined;
            if (
              dailyReport &&
              (!options?.whitelistedCrews ||
                options.whitelistedCrews.includes(
                  dailyReport.crew?.toString() || ""
                ))
            )
              collection.push({
                dailyReport,
                score: hit._rankingScore ?? 0,
              });
          }
        }

        break;
      }
      case SearchIndices.Crew: {
        for (let j = 0; j < result.hits.length; j++) {
          const hit = result.hits[j];
          if (hit.id) {
            collection.push({
              crew: (await Crew.getById(hit.id)) || undefined,
              score: hit._rankingScore ?? 0,
            });
          }
        }

        break;
      }
      case SearchIndices.Employee: {
        for (let j = 0; j < result.hits.length; j++) {
          const hit = result.hits[j];
          if (hit.id) {
            collection.push({
              employee:
                (await Employee.getById(hit.id)) || undefined,
              score: hit._rankingScore ?? 0,
            });
          }
        }

        break;
      }
      case SearchIndices.Vehicle: {
        for (let j = 0; j < result.hits.length; j++) {
          const hit = result.hits[j];
          if (hit.id) {
            collection.push({
              vehicle: (await Vehicle.getById(hit.id)) || undefined,
              score: hit._rankingScore ?? 0,
            });
          }
        }

        break;
      }
      case SearchIndices.Jobsite: {
        for (let j = 0; j < result.hits.length; j++) {
          const hit = result.hits[j];
          if (hit.id) {
            collection.push({
              jobsite: (await Jobsite.getById(hit.id)) || undefined,
              score: hit._rankingScore ?? 0,
            });
          }
        }

        break;
      }
    }
  }

  return collection;
};
