import {
  File,
  Jobsite,
  JobsiteDayReport,
  JobsiteDocument,
  JobsiteMonthReport,
  JobsiteYearReport,
} from "@models";
import { Id } from "@typescript/models";

const fileObject = async (jobsite: JobsiteDocument, fileObjectId: Id) => {
  const index = jobsite.fileObjects.findIndex(
    (object) => object._id?.toString() === fileObjectId.toString()
  );

  if (index !== -1) {
    const fileObject = jobsite.fileObjects[index];

    const file = await File.getById(fileObject.file || "");

    if (file) {
      await file.fullRemove();
    }

    jobsite.fileObjects.splice(index, 1);

    await jobsite.save();
  }
};

const document = async (jobsite: JobsiteDocument, transferJobsiteId?: Id) => {
  const dailyReports = await jobsite.getDailyReports();
  const revenueInvoices = await jobsite.getRevenueInvoices();
  const expenseInvoices = await jobsite.getExpenseInvoices();
  const materials = await jobsite.getMaterials();

  // Ensure transfer is provided if daily reports, materials, or invoices exist
  let transferJobsite: JobsiteDocument | null = null;
  if (
    !transferJobsiteId &&
    (dailyReports.length > 0 ||
      materials.length > 0 ||
      revenueInvoices.length > 0 ||
      expenseInvoices.length > 0)
  ) {
    throw new Error(
      "Transfer jobsite is required if daily reports, materials, or invoices exist"
    );
  } else if (transferJobsiteId) {
    // Transfer all items to new jobsite
    transferJobsite = await Jobsite.getById(transferJobsiteId);
    if (!transferJobsite)
      throw new Error("Could not find jobsite to transfer to");

    // Transfer all jobsite materials
    if (materials.length > 0) {
      for (let i = 0; i < materials.length; i++) {
        transferJobsite.materials.push(materials[i]._id);
      }
    }

    // Transfer daily reports
    if (dailyReports.length > 0) {
      for (let i = 0; i < dailyReports.length; i++) {
        await dailyReports[i].updateJobsite(transferJobsite, {
          checkMaterials: false,
        });
      }
    }

    // Transfer revenue invoices
    if (revenueInvoices.length > 0) {
      for (let i = 0; i < revenueInvoices.length; i++) {
        transferJobsite.revenueInvoices.push(revenueInvoices[i]._id);
      }
    }

    // Transfer expense invoices
    if (expenseInvoices.length > 0) {
      for (let i = 0; i < expenseInvoices.length; i++) {
        transferJobsite.expenseInvoices.push(expenseInvoices[i]._id);
      }
    }
  }

  // Remove jobsite
  await jobsite.remove();

  // Save transfer jobsite
  await transferJobsite?.save();

  // Save daily reports
  for (let i = 0; i < dailyReports.length; i++) {
    await dailyReports[i].save();
  }

  // Remove jobsite day reports
  const jobsiteDayReports = await JobsiteDayReport.getByJobsite(jobsite);
  for (let i = 0; i < jobsiteDayReports.length; i++) {
    await jobsiteDayReports[i].removeFull();
  }

  // Remove jobsite month reports
  const jobsiteMonthReports = await JobsiteMonthReport.getByJobsite(jobsite);
  for (let i = 0; i < jobsiteMonthReports.length; i++) {
    await jobsiteMonthReports[i].removeFull();
  }

  // Remove jobsite year reports
  const jobsiteYearReports = await JobsiteYearReport.getByJobsite(jobsite);
  for (let i = 0; i < jobsiteYearReports.length; i++) {
    await jobsiteYearReports[i].removeFull();
  }
};

export default {
  fileObject,
  document,
};
