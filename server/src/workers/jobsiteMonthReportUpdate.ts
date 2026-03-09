import { logger } from "@logger";
import JobsiteMonthReportUpdateHelper from "./helpers/JobsiteMonthReportUpdate";

const jobsiteMonthReportUpdate = () => {
  return setInterval(async () => {
    try {
      await JobsiteMonthReportUpdateHelper();
    } catch (e: unknown) {
      logger.error(`JobsiteMonthReport Worker Error: ${(e as Error).message}`);
    }
  }, 0.45 * 60 * 1000);
};

export default jobsiteMonthReportUpdate;
