import { logger } from "@logger";
import JobsiteYearMasterReportUpdateHelper from "./helpers/JobsiteYearMasterReportUpdate";

const jobsiteYearMasterReportUpdate = () => {
  return setInterval(async () => {
    try {
      await JobsiteYearMasterReportUpdateHelper();
    } catch (e: unknown) {
      logger.error(
        `JobsiteYearMasterReport Worker Error: ${(e as Error).message}`
      );
    }
  }, 0.65 * 60 * 1000);
};

export default jobsiteYearMasterReportUpdate;
