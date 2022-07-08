import { Types } from "mongoose";

import {
  Crew,
  CrewDocument,
  DailyReport,
  DailyReportDocument,
  Invoice,
  InvoiceDocument,
  JobsiteDayReport,
  JobsiteDayReportDocument,
  JobsiteDocument,
  JobsiteMaterial,
  JobsiteMaterialDocument,
  JobsiteModel,
  JobsiteMonthReport,
  JobsiteMonthReportDocument,
  JobsiteYearReport,
  JobsiteYearReportDocument,
  MaterialShipment,
  MaterialShipmentDocument,
} from "@models";
import {
  GetByIDOptions,
  Id,
  IListOptions,
  ISearchOptions,
} from "@typescript/models";
import populateOptions from "@utils/populateOptions";
import { IJobsiteSearchObject } from "@typescript/jobsite";
import ElasticsearchClient from "@elasticsearch/client";
import ElasticSearchIndices from "@constants/ElasticSearchIndices";
import { IHit } from "@typescript/elasticsearch";
import dayjs from "dayjs";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  Jobsite: JobsiteModel,
  id: Types.ObjectId | string,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<JobsiteDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const jobsite = await Jobsite.findById(id);

  if (!jobsite && options.throwError) {
    throw new Error("Jobsite.getById: unable to find jobsite");
  }

  return jobsite;
};

const search = async (
  Jobsite: JobsiteModel,
  searchString: string,
  options?: ISearchOptions
): Promise<IJobsiteSearchObject[]> => {
  const res = await ElasticsearchClient.search({
    index: ElasticSearchIndices.Jobsite,
    body: {
      query: {
        multi_match: {
          query: searchString.toLowerCase(),
          fuzziness: "AUTO",
          fields: ["name", "jobcode"],
        },
      },
    },
    size: options?.limit,
  });

  let jobsiteObjects: { id: string; score: number }[] = res.body.hits.hits.map(
    (item: IHit) => {
      return {
        id: item._id,
        score: item._score,
      };
    }
  );

  // Filter out blacklisted ids
  if (options?.blacklistedIds) {
    jobsiteObjects = jobsiteObjects.filter(
      (object) => !options.blacklistedIds?.includes(object.id)
    );
  }

  const jobsites: IJobsiteSearchObject[] = [];
  for (let i = 0; i < jobsiteObjects.length; i++) {
    const jobsite = await Jobsite.getById(jobsiteObjects[i].id);
    if (jobsite)
      jobsites.push({
        jobsite,
        score: jobsiteObjects[i].score,
      });
  }

  return jobsites;
};

const listDefaultOptions: IListOptions<JobsiteDocument> = {
  pageLimit: 25,
  offset: 0,
};
const list = async (
  Jobsite: JobsiteModel,
  options?: IListOptions<JobsiteDocument>
): Promise<JobsiteDocument[]> => {
  options = populateOptions(options, listDefaultOptions);

  const jobsite = await Jobsite.find(options?.query || {}, undefined, {
    limit: options?.pageLimit,
    skip: options?.offset,
    sort: {
      date: -1,
    },
  }).sort({ jobcode: "desc" });

  return jobsite;
};

const byCrew = async (
  Jobsite: JobsiteModel,
  crew: CrewDocument
): Promise<JobsiteDocument[]> => {
  const jobsites = await Jobsite.find({ crews: crew._id });

  return jobsites;
};

/**
 * ----- Methods -----
 */

const crews = async (jobsite: JobsiteDocument): Promise<CrewDocument[]> => {
  const crews = await Crew.find({ _id: { $in: jobsite.crews } });

  return crews;
};

export interface IJobsiteGetDailyReportOptions {
  whitelistedCrews?: Id[];
}
const dailyReports = async (
  jobsite: JobsiteDocument,
  options?: IJobsiteGetDailyReportOptions
): Promise<DailyReportDocument[]> => {
  const crewQuery: Record<string, unknown> = {};
  if (options?.whitelistedCrews) {
    crewQuery.crew = { $in: options.whitelistedCrews };
  }

  const dailyReports = await DailyReport.find({
    jobsite: jobsite._id,
    archived: { $ne: true },
    ...crewQuery,
  }).sort({ date: -1 });

  return dailyReports;
};

const materials = async (
  jobsite: JobsiteDocument
): Promise<JobsiteMaterialDocument[]> => {
  const jobsiteMaterials = await JobsiteMaterial.find({
    _id: { $in: jobsite.materials },
  });

  return jobsiteMaterials;
};

const expenseInvoices = async (
  jobsite: JobsiteDocument
): Promise<InvoiceDocument[]> => {
  const invoices = await Invoice.find({
    _id: { $in: jobsite.expenseInvoices },
  });

  return invoices;
};

const revenueInvoices = async (
  jobsite: JobsiteDocument
): Promise<InvoiceDocument[]> => {
  const invoices = await Invoice.find({
    _id: { $in: jobsite.revenueInvoices },
  });

  return invoices;
};

const nonCostedMaterialShipments = async (
  jobsite: JobsiteDocument,
  dateRange?: { startTime: Date; endTime: Date }
): Promise<MaterialShipmentDocument[]> => {
  const dailyReports = await jobsite.getDailyReports();

  let materialShipmentIds: Id[] = [];
  for (let i = 0; i < dailyReports.length; i++) {
    if (
      !dateRange ||
      (dayjs(dailyReports[i].date).isAfter(dateRange.startTime) &&
        dayjs(dailyReports[i].date).isBefore(dateRange.endTime))
    )
      materialShipmentIds = [
        ...materialShipmentIds,
        ...dailyReports[i].materialShipment.map((id) => id?.toString() || ""),
      ];
  }

  const materialShipments = await MaterialShipment.find({
    _id: { $in: materialShipmentIds },
    noJobsiteMaterial: true,
    archivedAt: null,
  });

  return materialShipments;
};

const dayReports = async (
  jobsite: JobsiteDocument
): Promise<JobsiteDayReportDocument[]> => {
  const jobsiteDayReports = await JobsiteDayReport.find({
    jobsite: jobsite._id,
  });

  return jobsiteDayReports;
};

const monthReports = async (
  jobsite: JobsiteDocument
): Promise<JobsiteMonthReportDocument[]> => {
  const jobsiteMonthReports = await JobsiteMonthReport.find({
    jobsite: jobsite._id,
  });

  return jobsiteMonthReports;
};

const yearReports = async (
  jobsite: JobsiteDocument
): Promise<JobsiteYearReportDocument[]> => {
  const jobsiteYearReports = await JobsiteYearReport.find({
    jobsite: jobsite._id,
  });

  return jobsiteYearReports;
};

export default {
  byId,
  search,
  list,
  byCrew,
  crews,
  dailyReports,
  materials,
  expenseInvoices,
  revenueInvoices,
  nonCostedMaterialShipments,
  dayReports,
  monthReports,
  yearReports,
};
