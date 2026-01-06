import { Company } from "@models";
import generateCompanyMaterialReportExcel from "@utils/excel/companyMaterialReport";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { getWorkbookBuffer } from "@utils/excel";

import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env.development") });

const runPlayground = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");

    const uri = process.env.RO_MONGO_URI || "";

    if (!uri) throw new Error("RO_MONGO_URI is undefined");

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected.");

    await testMaterialReportExcel();
  } catch (error) {
    console.error("💥 Error in playground:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected");
    process.exit();
  }
};

const testMaterialReportExcel = async () => {
  const companyId = "6671e478bea32700122e2bc9";
  const year = "2025";

  const company = await Company.getById(companyId);

  if (!company) throw new Error("Could not find company");
  if (!year) throw new Error("Invalid year");

  console.log("Found company:", company.name);

  const materialReport = await company.getMaterialReports(parseInt(year, 10));

  console.log(materialReport.map((group) => group.jobDays));

  let quantitySum = 0;
  materialReport.forEach((group) => {
    group.jobDays.forEach((item) => {
      quantitySum += (item.quantity || 0);
    });
  });

  const totalMaterialsWithDays: Map<string, number> = new Map();
  const totalMaterialsWithQuantity: Map<string, number> = new Map();
  materialReport.forEach((group) => {
    if (group.material) {
      totalMaterialsWithDays.set(group.material.toString(), group.jobDays.length);
      let totalQuantity = 0;
      group.jobDays.forEach((item) => {
        totalQuantity += (item.quantity || 0);
      });
      totalMaterialsWithQuantity.set(group.material.toString(), totalQuantity);
    }
  });
  console.log("Total Materials:", totalMaterialsWithDays);
  console.log("Total Materials Quantity:", totalMaterialsWithQuantity);

  const workbook = await generateCompanyMaterialReportExcel(materialReport);
  const buffer = await getWorkbookBuffer(workbook);

  console.log("Total Quantity:", quantitySum);

  const filename = `DEBUG_${company.name}-${year}.xlsx`;
  const outputPath = path.resolve(__dirname, "output", filename);

  fs.writeFileSync(outputPath, buffer);
  console.log(`\n🎉 Success! File written to:\n${outputPath}`);

  return;
};

runPlayground();
