import { logger } from "@logger";
import JobsiteYearMasterReportUpdateHelper from "./helpers/JobsiteYearMasterReportUpdate";

export default setInterval(async () => {
  try {
    await JobsiteYearMasterReportUpdateHelper();
  } catch (e: unknown) {
    logger.error(
      `JobsiteYearMasterReport Worker Error: ${(e as Error).message}`
    );
  }
}, 0.6 * 60 * 1000);
