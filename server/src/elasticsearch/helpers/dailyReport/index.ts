import ElasticsearchClient from "../../client";
import { CrewDocument, DailyReportDocument, JobsiteDocument } from "@models";
import { logger } from "@logger";
import { ES_ensureDailyReportSettings } from "./settings";
import { ES_ensureDailyReportMapping } from "./mapping";
import ElasticSearchIndices from "@constants/ElasticSearchIndices";

export const ES_ensureDailyReportIndex = async () => {
  await ES_ensureDailyReportSettings();
  await ES_ensureDailyReportMapping();

  return;
};

export const ES_updateDailyReport = async (
  dailyReport: DailyReportDocument
) => {
  if (process.env.NODE_ENV !== "test") {
    logger.debug(`Updating dailyReport ${dailyReport._id} in ES`);

    if (dailyReport.archived !== true) {
      let crew: CrewDocument | undefined = undefined,
        jobsite: JobsiteDocument | undefined = undefined;
      try {
        jobsite = await dailyReport.getJobsite();
        crew = await dailyReport.getCrew();
      } catch (e: unknown) {
        logger.info(`Daily Report ES update error: ${(e as Error).message}`);
      }

      await ElasticsearchClient.update({
        index: ElasticSearchIndices.DailyReport,
        id: dailyReport._id.toString(),
        body: {
          doc: {
            date: dailyReport.date,
            jobsiteName: jobsite?.name || "",
            jobsiteCode: jobsite?.jobcode || "",
            crewName: crew?.name || "",
          },
          doc_as_upsert: true,
        },
      });
    } else {
      const existing = await ElasticsearchClient.get({
        id: dailyReport._id.toString(),
        index: ElasticSearchIndices.DailyReport,
      });

      // Remove if necessary
      if (existing) {
        await ElasticsearchClient.delete({
          id: dailyReport._id.toString(),
          index: ElasticSearchIndices.DailyReport,
        });
      }
    }
  }

  return;
};

export const ES_clearDailyReport = async () => {
  logger.debug("Clearing daily report index in ES");

  await ElasticsearchClient.indices.delete({
    index: ElasticSearchIndices.DailyReport,
  });

  return;
};
