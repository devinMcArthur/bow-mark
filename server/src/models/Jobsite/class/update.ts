import {
  InvoiceDocument,
  JobsiteDocument,
  JobsiteMaterialDocument,
  JobsiteMonthReport,
  JobsiteModel,
  System,
  SystemDocument,
  File,
  JobsiteYearReport,
} from "@models";
import {
  IJobsiteContract,
  IJobsiteFileObject,
  IJobsiteUpdate,
  ITruckingTypeRateData,
  TruckingRateTypes,
} from "@typescript/jobsite";
import getRateForTime from "@utils/getRateForTime";
import dayjs from "dayjs";

const document = async (jobsite: JobsiteDocument, data: IJobsiteUpdate) => {
  jobsite.name = data.name;
};

const addMaterial = async (
  jobsite: JobsiteDocument,
  jobsiteMaterial: JobsiteMaterialDocument
) => {
  const existingIndex = jobsite.materials.findIndex(
    (material) => material?.toString() === jobsiteMaterial._id.toString()
  );

  if (existingIndex === -1) {
    jobsite.materials.push(jobsiteMaterial._id);
  }

  await jobsite.requestGenerateDayReports();

  return;
};

const addExpenseInvoice = async (
  jobsite: JobsiteDocument,
  invoice: InvoiceDocument
) => {
  const existingIndex = jobsite.expenseInvoices.findIndex(
    (inv) => inv?.toString() === invoice._id.toString()
  );

  if (existingIndex === -1) {
    jobsite.expenseInvoices.push(invoice._id);
  }

  await JobsiteMonthReport.requestBuild({
    date: invoice.date,
    jobsiteId: jobsite._id,
  });
  await JobsiteYearReport.requestBuild({
    date: invoice.date,
    jobsiteId: jobsite._id,
  });

  return;
};

const addRevenueInvoice = async (
  jobsite: JobsiteDocument,
  invoice: InvoiceDocument
) => {
  const existingIndex = jobsite.revenueInvoices.findIndex(
    (inv) => inv?.toString() === invoice._id.toString()
  );

  if (existingIndex === -1) {
    jobsite.revenueInvoices.push(invoice._id);
  }

  await JobsiteMonthReport.requestBuild({
    date: invoice.date,
    jobsiteId: jobsite._id,
  });
  await JobsiteYearReport.requestBuild({
    date: invoice.date,
    jobsiteId: jobsite._id,
  });

  return;
};

const contract = async (
  jobsite: JobsiteDocument,
  contractData: IJobsiteContract
) => {
  if (contractData.expectedProfit > contractData.bidValue)
    throw new Error("Profits cannot be larger than contract value");

  jobsite.contract = {
    ...contractData,
    workOnHand: jobsite.contract?.workOnHand || 0,
  };

  await jobsite.updateWorkOnHand();
};

const workOnHand = async (jobsite: JobsiteDocument) => {
  if (!jobsite.contract) return;

  const system = await System.getSystem();

  const contractExpenses =
    jobsite.contract.bidValue - jobsite.contract.expectedProfit;
  let expensesInSystem = 0;

  const jobsiteYearReports = await jobsite.getYearReports();
  for (let i = 0; i < jobsiteYearReports.length; i++) {
    const yearReport = jobsiteYearReports[i];
    let operatingCosts = 0;

    const dayReports = await yearReport.getDayReports();
    for (let i = 0; i < dayReports.length; i++) {
      const dayReport = dayReports[i];

      operatingCosts +=
        (dayReport.summary.vehicleCost +
          dayReport.summary.employeeCost +
          dayReport.summary.materialCost +
          dayReport.summary.truckingCost) *
        (1 +
          getRateForTime(system.internalExpenseOverheadRate, dayReport.date) /
            100);
    }

    expensesInSystem +=
      operatingCosts +
      yearReport.summary.externalExpenseInvoiceValue * 1.03 +
      yearReport.summary.internalExpenseInvoiceValue +
      yearReport.summary.accrualExpenseInvoiceValue;
  }

  const workOnHand = contractExpenses - expensesInSystem;

  jobsite.contract.workOnHand = workOnHand;
};

const truckingRates = async (
  jobsite: JobsiteDocument,
  truckingRates: ITruckingTypeRateData[]
) => {
  jobsite.truckingRates = truckingRates;

  await jobsite.requestGenerateDayReports();

  return;
};

const setTruckingRatesToDefault = async (
  jobsite: JobsiteDocument,
  system: SystemDocument
) => {
  jobsite.truckingRates = system.materialShipmentVehicleTypeDefaults.map(
    (type) => {
      return {
        title: type.title,
        rates: type.rates.map((rate) => {
          return {
            date: rate.date,
            rate: rate.rate,
            type: TruckingRateTypes.Hour,
          };
        }),
      };
    }
  );
};

const setAllEmptyTruckingRates = async (Jobsite: JobsiteModel) => {
  const jobsites = await Jobsite.find({
    truckingRates: { $size: 0 },
  });

  const system = await System.getSystem();
  for (let i = 0; i < jobsites.length; i++) {
    await jobsites[i].setTruckingRatesToDefault(system);
  }

  return jobsites;
};

const addTruckingRateToAll = async (
  Jobsite: JobsiteModel,
  systemItemIndex: number,
  systemRateIndex: number
) => {
  const jobsites = await Jobsite.find({
    "truckingRates.0": { $exists: true },
  });

  const updatedJobsites: JobsiteDocument[] = [];

  const system = await System.getSystem();
  if (
    system.materialShipmentVehicleTypeDefaults[systemItemIndex] &&
    system.materialShipmentVehicleTypeDefaults[systemItemIndex].rates[
      systemRateIndex
    ]
  ) {
    const systemRateItem =
      system.materialShipmentVehicleTypeDefaults[systemItemIndex];
    const systemRate = systemRateItem.rates[systemRateIndex];

    for (let i = 0; i < jobsites.length; i++) {
      const jobsite = jobsites[i];

      const matchingRateItemIndex = jobsite.truckingRates.findIndex(
        (jobsiteRateItem) => jobsiteRateItem.title === systemRateItem.title
      );

      if (matchingRateItemIndex !== -1) {
        const jobsiteRateItem = jobsite.truckingRates[matchingRateItemIndex];

        // Ensure last rate isn't after the new rate
        if (
          dayjs(
            jobsiteRateItem.rates[jobsiteRateItem.rates.length - 1].date
          ).isBefore(dayjs(systemRate.date), "day")
        ) {
          // Push system rate
          jobsites[i].truckingRates[matchingRateItemIndex].rates.push({
            rate: systemRate.rate,
            date: systemRate.date,
            type: TruckingRateTypes.Hour,
          });

          updatedJobsites.push(jobsites[i]);
        }
      } else {
        // Push new rate item to jobsite
        jobsites[i].truckingRates.push({
          title: systemRateItem.title,
          rates: [
            {
              date: systemRate.date,
              rate: systemRate.rate,
              type: TruckingRateTypes.Hour,
            },
          ],
        });

        updatedJobsites.push(jobsites[i]);
      }
    }
  }

  return updatedJobsites;
};

const addFileObject = async (
  jobsite: JobsiteDocument,
  fileObject: IJobsiteFileObject
) => {
  const file = await File.createDocument(fileObject.file);

  jobsite.fileObjects.push({
    ...fileObject,
    file,
  });

  return file;
};

const archive = async (
  jobsite: JobsiteDocument
): Promise<void> => {
  jobsite.archivedAt = new Date();
};

const unarchive = async (jobsite: JobsiteDocument): Promise<void> => {
  jobsite.archivedAt = undefined;
};

export default {
  document,
  addMaterial,
  addExpenseInvoice,
  addRevenueInvoice,
  truckingRates,
  setTruckingRatesToDefault,
  setAllEmptyTruckingRates,
  addTruckingRateToAll,
  addFileObject,
  contract,
  workOnHand,
  archive,
  unarchive
};
