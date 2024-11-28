import { Company, Crew, DailyReport, OperatorDailyReport } from "@models";
import { SupportedMimeTypes } from "@typescript/file";
import { generateForDailyReport, getWorkbookBuffer } from "@utils/excel";
import dayjs from "dayjs";
import { Router } from "express";
import archiver from "archiver";
import { generateForVehicles } from "@utils/excel/vehicles";
import { generateForEmployees } from "@utils/excel/employees";
import generateCompanyMaterialReportExcel from "@utils/excel/companyMaterialReport";
import generateCompanyInvoiceReportExcel from "@utils/excel/companyInvoiceReport";

const router = Router();

router.get("/daily-report/:dailyReportId", async (req, res) => {
  const dailyReport = await DailyReport.getById(req.params.dailyReportId);

  if (!dailyReport) return res.status(404);

  const jobsite = await dailyReport.getJobsite();
  const crew = await dailyReport.getCrew();

  const workbook = await generateForDailyReport(dailyReport);

  res.setHeader("Content-Type", SupportedMimeTypes.XLSX);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${dayjs(dailyReport.date).format("YYYY-MM-DD")}-(${jobsite.jobcode
    })-${crew.name}.xlsx`
  );

  return res.send(await getWorkbookBuffer(workbook));
});

router.get("/crew/:crewId", async (req, res) => {
  const crew = await Crew.getById(req.params.crewId);

  if (!crew) return res.status(404).send("Could not find Crew");

  const date = new Date(
    req.query.start_of_month?.toString() || "invalid string"
  );
  if (isNaN(date.getTime())) return res.status(400).send("Invalid date format");

  const dailyReports = await crew.getDailyReportsByMonth(date);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${crew.name}-${dayjs(date).format("MMMM-YYYY")}.zip`
  );

  for (let i = 0; i < dailyReports.length; i++) {
    const workbook = await generateForDailyReport(dailyReports[i]);

    const crew = await dailyReports[i].getCrew();
    const jobsite = await dailyReports[i].getJobsite();

    const buffer = await getWorkbookBuffer(workbook);

    archive.append(buffer, {
      name: `${dayjs(dailyReports[i].date).format("YYYY-MM-DD")}-${crew.name}-${jobsite.jobcode
        }.xlsx`,
    });
  }

  archive.finalize();
});

router.get("/vehicles", async (_req, res) => {
  const workbook = await generateForVehicles();

  res.setHeader("Content-Type", SupportedMimeTypes.XLSX);
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Vehicle-List.xlsx"
  );

  return res.send(await getWorkbookBuffer(workbook));
});

router.get("/employees", async (_req, res) => {
  const workbook = await generateForEmployees();

  res.setHeader("Content-Type", SupportedMimeTypes.XLSX);
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Employee-List.xlsx"
  );

  return res.send(await getWorkbookBuffer(workbook));
});

router.get("/operator-daily-report/:operatorDailyReportId/pdf", async (req, res) => {
  const operatorDailyReport = await OperatorDailyReport.getById(req.params.operatorDailyReportId);

  if (!operatorDailyReport) return res.status(404);

  const vehicle = await operatorDailyReport.getVehicle();

  const pdf = await operatorDailyReport.generatePDF();
  res.setHeader("Content-Type", SupportedMimeTypes.PDF);
  res.setHeader(
    "Content-Disposition",
    `inline; filename=${vehicle.vehicleCode}-${dayjs(operatorDailyReport.createdAt).format("YYYY-MM-DD")}.pdf`
  );

  return res.send(Buffer.from(pdf));
});

router.get("/company/:companyId/material-report/:year", async (req, res) => {
  const companyId = req.params.companyId;
  const year = req.params.year;

  const company = await Company.getById(companyId);
  if (!company) return res.status(404).send("Could not find company");

  if (!year) return res.status(400).send("Invalid year");

  const materialReport = await company.getMaterialReports(parseInt(year, 10));
  const workbook = await generateCompanyMaterialReportExcel(materialReport);

  res.setHeader("Content-Type", SupportedMimeTypes.XLSX);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${company.name}-${year}-Material-Report.xlsx`
  );

  return res.send(await getWorkbookBuffer(workbook));
});

router.get("/company/:companyId/invoice-report/:year", async (req, res) => {
  const companyId = req.params.companyId;
  const year = req.params.year;

  const company = await Company.getById(companyId);
  if (!company) return res.status(404).send("Could not find company");

  if (!year) return res.status(400).send("Invalid year");

  const invoices = await company.getInvoiceReport(parseInt(year, 10));
  const workbook = await generateCompanyInvoiceReportExcel(invoices);

  res.setHeader("Content-Type", SupportedMimeTypes.XLSX);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${company.name}-${year}-Invoice-Report.xlsx`
  );

  return res.send(await getWorkbookBuffer(workbook));
});

export default router;
