import {
  Invoice,
  InvoiceDocument,
  Jobsite,
  JobsiteDayReport,
  JobsiteDayReportDocument,
  JobsiteDocument,
  System,
} from "@models";
import { CrewTypes } from "@typescript/crew";
import { TruckingRateTypes } from "@typescript/jobsite";
import ExcelJS from "exceljs";
import {
  generateMasterTable,
  IMasterRow,
  MasterCrewTotals,
} from "../masterTable";

type JobsiteCatalog = Record<
  string,
  {
    jobsite: JobsiteDocument;
    dayReports: JobsiteDayReportDocument[];
    revenueInvoices: InvoiceDocument[];
    expenseInvoices: InvoiceDocument[];
  }
>;

export const generateForDateRange = async (startTime: Date, endTime: Date) => {
  const jobsiteDayReports = await JobsiteDayReport.getByDateRange(
    startTime,
    endTime
  );

  // Unique list of crewTypes
  const crewTypes: CrewTypes[] = [];
  for (let i = 0; i < jobsiteDayReports.length; i++) {
    const jobsiteDayReport = jobsiteDayReports[i];
    for (let j = 0; j < jobsiteDayReport.crewTypes.length; j++) {
      const crewType = jobsiteDayReport.crewTypes[j];
      if (!crewTypes.includes(crewType)) {
        crewTypes.push(crewType);
      }
    }
  }

  // Unique list of jobsites and catalog of jobsiteDayReports
  const jobsites: JobsiteCatalog = {};
  for (let i = 0; i < jobsiteDayReports.length; i++) {
    const jobsiteDayReport = jobsiteDayReports[i];

    if (jobsiteDayReport.jobsite) {
      if (!jobsites[jobsiteDayReport.jobsite.toString()]) {
        const jobsite = await Jobsite.getById(jobsiteDayReport.jobsite);
        if (jobsite) {
          jobsites[jobsiteDayReport.jobsite.toString()] = {
            jobsite,
            dayReports: [],
            revenueInvoices: [],
            expenseInvoices: [],
          };
        }
      }

      jobsites[jobsiteDayReport.jobsite.toString()].dayReports.push(
        jobsiteDayReport
      );
    }
  }

  // Get all invoices that took place during the date range
  const invoices: InvoiceDocument[] = await Invoice.find({
    date: {
      $gte: startTime,
      $lte: endTime,
    },
  });

  // Catalog all jobsites and their invoices that haven't been covered by their day reports
  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i];

    const expenseJobsite: JobsiteDocument | null = await Jobsite.findOne({
      expenseInvoices: invoice._id,
    });

    if (expenseJobsite) {
      if (!jobsites[expenseJobsite._id?.toString()]) {
        jobsites[expenseJobsite._id?.toString()] = {
          jobsite: expenseJobsite,
          dayReports: [],
          revenueInvoices: [],
          expenseInvoices: [],
        };
      }

      jobsites[expenseJobsite._id?.toString()].expenseInvoices.push(invoice);
    }

    const revenueJobsite: JobsiteDocument | null = await Jobsite.findOne({
      revenueInvoices: invoice._id,
    });

    if (revenueJobsite) {
      if (!jobsites[revenueJobsite._id?.toString()]) {
        jobsites[revenueJobsite._id?.toString()] = {
          jobsite: revenueJobsite,
          dayReports: [],
          revenueInvoices: [],
          expenseInvoices: [],
        };
      }

      jobsites[revenueJobsite._id?.toString()].revenueInvoices.push(invoice);
    }
  }

  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("Master Cost");

  await generateTable(worksheet, startTime, endTime, crewTypes, jobsites);

  return workbook;
};

const generateTable = async (
  worksheet: ExcelJS.Worksheet,
  startTime: Date,
  endTime: Date,
  crewTypes: CrewTypes[],
  jobsiteCatalog: JobsiteCatalog
) => {
  const rows: IMasterRow[] = [];

  for (let i = 0; i < Object.keys(jobsiteCatalog).length; i++) {
    const jobsiteId = Object.keys(jobsiteCatalog)[i];
    const jobsite = jobsiteCatalog[jobsiteId].jobsite;
    const jobsiteDayReports = jobsiteCatalog[jobsiteId].dayReports;

    // Filter revenue invoices
    const allRevenueInvoices = jobsiteCatalog[jobsiteId].revenueInvoices;
    const filteredRevenueInvoices = allRevenueInvoices.filter(
      (invoice) => invoice.date >= startTime && invoice.date <= endTime
    );
    const internalRevenueInvoices = filteredRevenueInvoices.filter(
      (invoice) => invoice.internal === true
    );
    const externalRevenueInvoices = filteredRevenueInvoices.filter(
      (invoice) => invoice.internal !== true
    );

    // Fetch and filter expense invoices
    const allExpenseInvoices = jobsiteCatalog[jobsiteId].expenseInvoices;
    const filteredExpenseInvoices = allExpenseInvoices.filter(
      (invoice) => invoice.date >= startTime && invoice.date <= endTime
    );
    const internalExpenseInvoices = filteredExpenseInvoices.filter(
      (invoice) => invoice.internal === true
    );
    const externalExpenseInvoices = filteredExpenseInvoices.filter(
      (invoice) => invoice.internal !== true
    );

    // Get all totals from each day report
    const crewTotals: MasterCrewTotals = {} as MasterCrewTotals;
    let employeeCost = 0,
      vehicleCost = 0,
      materialCost = 0,
      truckingCost = 0;
    for (let j = 0; j < jobsiteDayReports.length; j++) {
      const jobsiteDayReport = jobsiteDayReports[j];

      // Update Employee Cost
      for (let k = 0; k < jobsiteDayReport.employees.length; k++) {
        const employee = jobsiteDayReport.employees[k];
        if (!crewTotals[employee.crewType]) {
          crewTotals[employee.crewType] = {
            wages: 0,
            equipment: 0,
            materials: 0,
            trucking: 0,
          };
        }
        const cost = employee.hours * employee.rate;

        crewTotals[employee.crewType].wages += cost;
        employeeCost += cost;
      }

      // Update Equipment Cost
      for (let k = 0; k < jobsiteDayReport.vehicles.length; k++) {
        const vehicle = jobsiteDayReport.vehicles[k];
        if (!crewTotals[vehicle.crewType]) {
          crewTotals[vehicle.crewType] = {
            wages: 0,
            equipment: 0,
            materials: 0,
            trucking: 0,
          };
        }
        const cost = vehicle.hours * vehicle.rate;

        crewTotals[vehicle.crewType].equipment += cost;
        vehicleCost += cost;
      }

      // Update Material Cost
      for (let k = 0; k < jobsiteDayReport.materials.length; k++) {
        const material = jobsiteDayReport.materials[k];
        if (!crewTotals[material.crewType]) {
          crewTotals[material.crewType] = {
            wages: 0,
            equipment: 0,
            materials: 0,
            trucking: 0,
          };
        }
        const cost = material.quantity * material.rate;

        crewTotals[material.crewType].materials += cost;
        materialCost += cost;
      }

      // Update Trucking Cost
      for (let k = 0; k < jobsiteDayReport.trucking.length; k++) {
        const trucking = jobsiteDayReport.trucking[k];
        if (!crewTotals[trucking.crewType]) {
          crewTotals[trucking.crewType] = {
            wages: 0,
            equipment: 0,
            materials: 0,
            trucking: 0,
          };
        }

        let cost = 0;
        if (trucking.type === TruckingRateTypes.Hour) {
          cost = (trucking.hours || 0) * trucking.rate;
        } else if (trucking.type === TruckingRateTypes.Quantity) {
          cost = trucking.quantity * trucking.rate;
        }

        crewTotals[trucking.crewType].trucking += cost;
        truckingCost += cost;
      }
    }

    /**
     * Calculate all costs
     */

    const system = await System.getSystem();

    // Revenue Invoices
    let internalRevenueValue = 0;
    for (let j = 0; j < internalRevenueInvoices.length; j++) {
      const invoice = internalRevenueInvoices[j];
      internalRevenueValue += invoice.cost;
    }

    let externalRevenueValue = 0;
    for (let j = 0; j < externalRevenueInvoices.length; j++) {
      const invoice = externalRevenueInvoices[j];
      externalRevenueValue += invoice.cost;
    }

    // Expense Invoices
    let internalExpenseValue = 0;
    for (let j = 0; j < internalExpenseInvoices.length; j++) {
      const invoice = internalExpenseInvoices[j];
      internalExpenseValue += invoice.cost;
    }

    let externalExpenseValue = 0;
    for (let j = 0; j < externalExpenseInvoices.length; j++) {
      const invoice = externalExpenseInvoices[j];
      externalExpenseValue += invoice.cost;
    }

    const revenue = internalRevenueValue + externalRevenueValue;

    const onSiteExpenses =
      employeeCost + vehicleCost + materialCost + truckingCost;

    const overhead =
      onSiteExpenses * (1 + (system.internalExpenseOverheadRate || 10) / 100);

    const totalExpenses =
      overhead + externalExpenseValue * 1.03 + internalExpenseValue;

    const netIncome = revenue - totalExpenses;

    const margin = totalExpenses > 0 ? (netIncome / totalExpenses) * 100 : 0;

    const marginMinusInternal =
      totalExpenses - internalExpenseValue > 0
        ? (netIncome / (totalExpenses - internalExpenseValue)) * 100
        : 0;

    const row: IMasterRow = {
      jobsiteName: `${jobsite.jobcode} - ${jobsite.name}`,
      revenue,
      expenses: onSiteExpenses,
      overhead,
      totalExpenses,
      netIncome,
      margin,
      marginMinusInternal,
      internalSubs: internalExpenseValue,
      externalSubs: externalExpenseValue,
      totalWages: employeeCost,
      totalEquipment: vehicleCost,
      totalMaterials: materialCost,
      totalTrucking: truckingCost,
      crewTotals,
    };

    rows.push(row);
  }

  await generateMasterTable(worksheet, crewTypes, rows);
};
