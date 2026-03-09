import {
  JobsiteDayReport,
  JobsiteDayReportDocument,
  JobsiteMonthReport,
  JobsiteYearReport,
} from "@models";
import mongoose from "mongoose";

const full = async (
  jobsiteDayReport: JobsiteDayReportDocument
): Promise<void> => {
  // sessions are used here to ensure that if anything fails, they all fail
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Get all JobsiteMonthReports that contain this JobsiteDayReport
    const jobsiteMonthReports = await JobsiteMonthReport.getByJobsiteDayReport(
      jobsiteDayReport
    );

    // Remove day report from month reports
    for (let i = 0; i < jobsiteMonthReports.length; i++) {
      await JobsiteMonthReport.findOneAndUpdate(
        { _id: jobsiteMonthReports[i]._id },
        { $pull: { dayReports: jobsiteDayReport._id } },
        { new: true, session }
      );
    }

    // Remove day report from year reports
    const jobsiteYearReports = await JobsiteYearReport.getByJobsiteDayReport(
      jobsiteDayReport
    );
    for (let i = 0; i < jobsiteYearReports.length; i++) {
      await JobsiteYearReport.findOneAndUpdate(
        { _id: jobsiteYearReports[i]._id },
        { $pull: { dayReports: jobsiteDayReport._id } },
        { new: true, session }
      );
    }

    // Remove day report
    await JobsiteDayReport.deleteOne(
      { _id: jobsiteDayReport._id },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    session.endSession();
  }
};

export default {
  full,
};
