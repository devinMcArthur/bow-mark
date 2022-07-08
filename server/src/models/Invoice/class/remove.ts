import {
  InvoiceDocument,
  Jobsite,
  JobsiteDocument,
  JobsiteMaterial,
  JobsiteMaterialDocument,
  JobsiteMonthReport,
  JobsiteMonthReportDocument,
  JobsiteYearReport,
  JobsiteYearReportDocument,
} from "@models";

const document = async (invoice: InvoiceDocument) => {
  // Remove all connections to jobsites if neccessary
  const jobsites: JobsiteDocument[] = await Jobsite.find({
    $or: [
      {
        revenueInvoices: invoice._id,
      },
      {
        expenseInvoices: invoice._id,
      },
    ],
  });

  if (jobsites) {
    // Loop through all jobsites and remove the invoices
    for (const jobsite of jobsites) {
      if (jobsite.revenueInvoices.includes(invoice._id.toString())) {
        jobsite.revenueInvoices = jobsite.revenueInvoices.filter(
          (id) => id?.toString() !== invoice._id.toString()
        );
      }

      if (jobsite.expenseInvoices.includes(invoice._id.toString())) {
        jobsite.expenseInvoices = jobsite.expenseInvoices.filter(
          (id) => id?.toString() !== invoice._id.toString()
        );
      }

      await jobsite.save();

      await jobsite.requestGenerateDayReports();
    }
  }

  // Remove any connections to jobsite materials if necessary
  const jobsiteMaterials: JobsiteMaterialDocument[] =
    await JobsiteMaterial.find({
      invoices: invoice._id,
    });

  if (jobsiteMaterials) {
    for (const jobsiteMaterial of jobsiteMaterials) {
      jobsiteMaterial.invoices = jobsiteMaterial.invoices.filter(
        (id) => id?.toString() !== invoice._id.toString()
      );

      await jobsiteMaterial.save();
    }
  }

  // Remove any connections in jobsite month reports
  const jobsiteMonthReports: JobsiteMonthReportDocument[] =
    await JobsiteMonthReport.find({
      $or: [
        {
          "expenseInvoices.invoice": invoice._id,
        },
        {
          "revenueInvoices.invoice": invoice._id,
        },
      ],
    });

  if (jobsiteMonthReports) {
    for (const jobsiteMonthReport of jobsiteMonthReports) {
      if (jobsiteMonthReport.expenseInvoices) {
        jobsiteMonthReport.expenseInvoices =
          jobsiteMonthReport.expenseInvoices.filter(
            (expInvoice) =>
              expInvoice?.invoice?.toString() !== invoice._id.toString()
          );
      }

      if (jobsiteMonthReport.revenueInvoices) {
        jobsiteMonthReport.revenueInvoices =
          jobsiteMonthReport.revenueInvoices.filter(
            (revInvoice) =>
              revInvoice?.invoice?.toString() !== invoice._id.toString()
          );
      }

      await jobsiteMonthReport.save();
    }
  }

  // Remove any connections in jobsite year reports
  const jobsiteYearReports: JobsiteYearReportDocument[] =
    await JobsiteYearReport.find({
      $or: [
        {
          "expenseInvoices.invoice": invoice._id,
        },
        {
          "revenueInvoices.invoice": invoice._id,
        },
      ],
    });

  if (jobsiteYearReports) {
    for (const jobsiteYearReport of jobsiteYearReports) {
      if (jobsiteYearReport.expenseInvoices) {
        jobsiteYearReport.expenseInvoices =
          jobsiteYearReport.expenseInvoices.filter(
            (expInvoice) =>
              expInvoice?.invoice?.toString() !== invoice._id.toString()
          );
      }

      if (jobsiteYearReport.revenueInvoices) {
        jobsiteYearReport.revenueInvoices =
          jobsiteYearReport.revenueInvoices.filter(
            (revInvoice) =>
              revInvoice?.invoice?.toString() !== invoice._id.toString()
          );
      }

      await jobsiteYearReport.save();
    }
  }

  await invoice.remove();
};

export default {
  document,
};
