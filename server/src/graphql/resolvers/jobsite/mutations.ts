import { DefaultRateData, RatesData } from "@graphql/types/mutation";
import {
  Company,
  Invoice,
  Jobsite,
  JobsiteDocument,
  JobsiteMaterial,
  Material,
} from "@models";
import { TruckingRateTypes } from "@typescript/jobsite";
import { Id } from "@typescript/models";
import { UserRoles } from "@typescript/user";
import { Field, Float, InputType } from "type-graphql";
import { FileCreateData } from "../file/mutations";
import { InvoiceData } from "../invoice/mutations";
import { JobsiteMaterialCreateData } from "../jobsiteMaterial/mutations";

@InputType()
export class JobsiteContractData {
  @Field(() => Float)
  public bidValue!: number;

  @Field(() => Float)
  public expectedProfit!: number;
}

@InputType()
export class JobsiteCreateData {
  @Field({ nullable: false })
  public name!: string;

  @Field({ nullable: false })
  public jobcode!: string;

  @Field({ nullable: true })
  public description?: string;

  @Field(() => JobsiteContractData, { nullable: true })
  public contract?: JobsiteContractData;
}

@InputType()
export class JobsiteUpdateData {
  @Field({ nullable: false })
  public name!: string;
}

@InputType()
export class TruckingRateData extends RatesData {
  @Field(() => TruckingRateTypes, { nullable: false })
  public type!: TruckingRateTypes;
}

@InputType()
export class TruckingTypeRateData extends DefaultRateData {
  @Field(() => [TruckingRateData], { nullable: false })
  public rates!: TruckingRateData[];
}

@InputType()
export class JobsiteFileObjectData {
  @Field(() => FileCreateData, { nullable: false })
  public file!: FileCreateData;
}

const create = async (data: JobsiteCreateData): Promise<JobsiteDocument> => {
  const jobsite = await Jobsite.createDocument(data);

  await jobsite.save();

  return jobsite;
};

const update = async (
  id: Id,
  data: JobsiteUpdateData
): Promise<JobsiteDocument> => {
  const jobsite = await Jobsite.getById(id);
  if (!jobsite) throw new Error("Unable to find jobsite with that Id");

  await jobsite.updateDocument(data);

  await jobsite.save();

  return jobsite;
};

const updateContract = async (
  id: Id,
  data: JobsiteContractData
): Promise<JobsiteDocument> => {
  const jobsite = await Jobsite.getById(id);
  if (!jobsite) throw new Error("Unable to find jobsite with that Id");

  await jobsite.updateContract(data);

  await jobsite.save();

  return jobsite;
};

const addMaterial = async (
  jobsiteId: string,
  data: JobsiteMaterialCreateData
): Promise<JobsiteDocument> => {
  const jobsite = await Jobsite.getById(jobsiteId, { throwError: true });
  if (!jobsite) throw new Error("Unable to find jobsite");

  const material = await Material.getById(data.materialId, {
    throwError: true,
  });
  if (!material) throw new Error("Unable to find material");
  const supplier = await Company.getById(data.supplierId, {
    throwError: true,
  });
  if (!supplier) throw new Error("Unable to find supplier");

  const jobsiteMaterial = await JobsiteMaterial.createDocument({
    ...data,
    jobsite,
    material,
    supplier,
  });

  await jobsiteMaterial.save();

  await jobsite.save();

  return jobsite;
};

const addExpenseInvoice = async (
  jobsiteId: string,
  data: InvoiceData
): Promise<JobsiteDocument> => {
  const jobsite = await Jobsite.getById(jobsiteId, { throwError: true });
  if (!jobsite) throw new Error("Unable to find jobsite");

  const company = await Company.getById(data.companyId, {
    throwError: true,
  });
  if (!company) throw new Error("Unable to find company");

  const invoice = await Invoice.createDocument({
    ...data,
    company,
  });

  await jobsite.addExpenseInvoice(invoice);

  await invoice.save();

  await jobsite.save();

  return jobsite;
};

const addRevenueInvoice = async (
  jobsiteId: string,
  data: InvoiceData
): Promise<JobsiteDocument> => {
  const jobsite = await Jobsite.getById(jobsiteId, { throwError: true });
  if (!jobsite) throw new Error("Unable to find jobsite");

  const company = await Company.getById(data.companyId, {
    throwError: true,
  });
  if (!company) throw new Error("Unable to find company");

  const invoice = await Invoice.createDocument({
    ...data,
    company,
  });

  await jobsite.addRevenueInvoice(invoice);

  await invoice.save();

  await jobsite.save();

  return jobsite;
};

const setTruckingRates = async (
  jobsiteId: string,
  data: TruckingTypeRateData[]
): Promise<JobsiteDocument> => {
  const jobsite = await Jobsite.getById(jobsiteId, { throwError: true });
  if (!jobsite) throw new Error("Unable to find jobsite");

  await jobsite.setTruckingRates(data);

  await jobsite.save();

  return jobsite;
};

const generateDayReports = async (
  jobsiteId: string
): Promise<JobsiteDocument> => {
  const jobsite = await Jobsite.getById(jobsiteId, { throwError: true });
  if (!jobsite) throw new Error("Unable to find jobsite");

  await jobsite.requestGenerateDayReports();

  return jobsite;
};

const addTruckingRateToAll = async (
  systemRateItemIndex: number,
  systemRateIndex: number
) => {
  const jobsites = await Jobsite.addTruckingRateToAll(
    systemRateItemIndex,
    systemRateIndex
  );

  for (let i = 0; i < jobsites.length; i++) {
    await jobsites[i].save();
  }

  return jobsites;
};

const setAllEmptyTruckingRates = async () => {
  const jobsites = await Jobsite.setAllEmptyTruckingRates();

  for (let i = 0; i < jobsites.length; i++) {
    await jobsites[i].save();
  }

  return jobsites;
};

const addFileObject = async (id: Id, data: JobsiteFileObjectData) => {
  const jobsite = await Jobsite.getById(id);
  if (!jobsite) throw new Error("Unable to find jobsite");

  // FileUpload is a promise, so we need to await it
  const { createReadStream, mimetype } = await data.file.file;

  await jobsite.addFileObject({
    file: {
      mimetype,
      description: data.file.description,
      stream: createReadStream(),
    },
    minRole: UserRoles.User,
  });

  await jobsite.save();

  return jobsite;
};

const removeFileObject = async (id: Id, fileObjectId: Id) => {
  const jobsite = await Jobsite.getById(id);
  if (!jobsite) throw new Error("Unable to find jobsite");

  await jobsite.removeFileObject(fileObjectId);

  return jobsite;
};

const requestReportGeneration = async (id: Id) => {
  const jobsite = await Jobsite.getById(id);
  if (!jobsite) throw new Error("Could not find jobsite");

  await jobsite.requestGenerateDayReports();
  await jobsite.requestGenerateMonthReports();
  await jobsite.requestGenerateYearReports();

  return jobsite;
};

const remove = async (id: Id, transferJobsiteId?: Id) => {
  const jobsite = await Jobsite.getById(id);
  if (!jobsite) throw new Error("Unable to find jobsite");

  await jobsite.removeDocument(transferJobsiteId);

  return true;
};

const archive = async (id: Id) => {
  const jobsite = await Jobsite.getById(id);
  if (!jobsite) throw new Error("Unable to find jobsite");

  await jobsite.archive();

  await jobsite.save();

  return jobsite;
};

const unarchive = async (id: Id) => {
  const jobsite = await Jobsite.getById(id);
  if (!jobsite) throw new Error("Unable to find jobsite");

  await jobsite.unarchive();
  await jobsite.save();

  return jobsite;
};

export default {
  create,
  update,
  updateContract,
  addMaterial,
  addExpenseInvoice,
  addRevenueInvoice,
  setTruckingRates,
  generateDayReports,
  addTruckingRateToAll,
  setAllEmptyTruckingRates,
  addFileObject,
  removeFileObject,
  requestReportGeneration,
  remove,
  archive,
  unarchive,
};
