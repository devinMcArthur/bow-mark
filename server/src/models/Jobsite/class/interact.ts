import eventEmitters from "@events";
import { JobsiteDocument } from "@models";

const requestGenerateDayReports = async (jobsite: JobsiteDocument) => {
  eventEmitters.jobsite.onJobsiteRequestDayReportGeneration.emit(jobsite);
};

const requestGenerateMonthReports = async (jobsite: JobsiteDocument) => {
  eventEmitters.jobsite.onJobsiteRequestMonthReportGeneration.emit(jobsite);
};

const requestGenerateYearReports = async (jobsite: JobsiteDocument) => {
  eventEmitters.jobsite.onJobsiteRequestYearReportGeneration.emit(jobsite);
};

export default {
  requestGenerateDayReports,
  requestGenerateMonthReports,
  requestGenerateYearReports,
};
