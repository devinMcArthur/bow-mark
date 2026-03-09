import { logger } from "@logger";
import JobsiteYearReportUpdateHelper from "./helpers/JobsiteYearReportUpdate";

const jobsiteYearReportUpdate = () => {
  return setInterval(async () => {
    try {
      await JobsiteYearReportUpdateHelper();
    } catch (e: unknown) {
      logger.error(`JobsiteYearReport Worker Error: ${(e as Error).message}`);
    }
  }, 0.55 * 60 * 1000);
};

export default jobsiteYearReportUpdate;
