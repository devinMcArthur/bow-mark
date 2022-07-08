import { DefaultRateData, RatesData } from "@graphql/types/mutation";
import {
  Company,
  Invoice,
  JobsiteMaterial,
  JobsiteMaterialDocument,
} from "@models";
import { JobsiteMaterialCostType } from "@typescript/jobsiteMaterial";
import { Id } from "@typescript/models";
import { Field, Float, ID, InputType } from "type-graphql";
import { InvoiceData } from "../invoice/mutations";

@InputType()
export class JobsiteMaterialRateData extends RatesData {
  @Field({ nullable: false })
  public estimated!: boolean;
}

@InputType()
export class JobsiteMaterialDeliveredRateData implements DefaultRateData {
  @Field(() => ID, { nullable: true })
  public _id?: string;

  @Field({ nullable: false })
  public title!: string;

  @Field(() => [JobsiteMaterialRateData], { nullable: false })
  public rates!: JobsiteMaterialRateData[];
}

@InputType()
export class JobsiteMaterialCreateData {
  @Field({ nullable: false })
  public materialId!: string;

  @Field({ nullable: false })
  public supplierId!: string;

  @Field(() => Float, { nullable: false })
  public quantity!: number;

  @Field({ nullable: false })
  public unit!: string;

  @Field(() => [JobsiteMaterialRateData], { nullable: true })
  public rates!: JobsiteMaterialRateData[];

  @Field(() => JobsiteMaterialCostType, { nullable: false })
  public costType!: JobsiteMaterialCostType;

  @Field(() => [JobsiteMaterialDeliveredRateData], { nullable: true })
  public deliveredRates!: JobsiteMaterialDeliveredRateData[];

  @Field(() => Boolean, { nullable: true })
  public delivered?: boolean;
}

@InputType()
export class JobsiteMaterialUpdateData {
  @Field({ nullable: false })
  public supplierId!: string;

  @Field(() => Float, { nullable: false })
  public quantity!: number;

  @Field({ nullable: false })
  public unit!: string;

  @Field(() => [JobsiteMaterialRateData], { nullable: false })
  public rates!: JobsiteMaterialRateData[];

  @Field(() => JobsiteMaterialCostType, { nullable: false })
  public costType!: JobsiteMaterialCostType;

  @Field(() => [JobsiteMaterialDeliveredRateData], { nullable: true })
  public deliveredRates!: JobsiteMaterialDeliveredRateData[];

  @Field(() => Boolean, { nullable: true })
  public delivered?: boolean;
}

const update = async (
  id: string,
  data: JobsiteMaterialUpdateData
): Promise<JobsiteMaterialDocument> => {
  const jobsiteMaterial = await JobsiteMaterial.getById(id, {
    throwError: true,
  });
  if (!jobsiteMaterial) throw new Error("Unable to find jobsite material");

  const supplier = await Company.getById(data.supplierId, {
    throwError: true,
  });
  if (!supplier) throw new Error("Unable to find supplier");

  await jobsiteMaterial.updateDocument({
    ...data,
    supplier,
  });

  await jobsiteMaterial.save();

  return jobsiteMaterial;
};

const remove = async (id: Id) => {
  const jobsiteMaterial = await JobsiteMaterial.getById(id);
  if (!jobsiteMaterial) throw new Error("Unable to find Jobsite Material");

  await jobsiteMaterial.removeIfPossible();

  return true;
};

const addInvoice = async (jobsiteMaterialId: Id, data: InvoiceData) => {
  const jobsiteMaterial = await JobsiteMaterial.getById(jobsiteMaterialId);
  if (!jobsiteMaterial) throw new Error("Unable to find jobsite material");
  if (jobsiteMaterial.costType !== JobsiteMaterialCostType.invoice)
    throw new Error("Cannot add an invoice to this material");

  const company = await Company.getById(data.companyId, {
    throwError: true,
  });
  if (!company) throw new Error("Unable to find company");

  const invoice = await Invoice.createDocument({
    ...data,
    company,
  });

  await jobsiteMaterial.addInvoice(invoice);

  await invoice.save();

  await jobsiteMaterial.save();

  return jobsiteMaterial;
};

export default {
  update,
  remove,
  addInvoice,
};
