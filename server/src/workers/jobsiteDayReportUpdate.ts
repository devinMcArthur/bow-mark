import errorHandler from "@utils/errorHandler";
import JobsiteDayReportUpdateHelper from "./helpers/JobsiteDayReportUpdate";

const jobsiteDayReportUpdate = () => {
  return setInterval(async () => {
    try {
      await JobsiteDayReportUpdateHelper();
    } catch (e) {
      errorHandler("JobsiteDayReport Worker Error", e);
    }
  }, 0.6 * 60 * 1000);
};

export default jobsiteDayReportUpdate;
