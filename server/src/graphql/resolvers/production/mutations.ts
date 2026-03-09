import { DailyReport, Production, ProductionDocument } from "@models";
import { Field, Float, InputType } from "type-graphql";

@InputType()
export class ProductionUpdateData {
  @Field({ nullable: false })
  public jobTitle!: string;

  @Field(() => Float, { nullable: false })
  public quantity!: number;

  @Field({ nullable: false })
  public unit!: string;

  @Field(() => Date, { nullable: false })
  public startTime!: Date;

  @Field(() => Date, { nullable: false })
  public endTime!: Date;

  @Field({ nullable: true })
  public description?: string;
}

@InputType()
export class ProductionCreateData extends ProductionUpdateData {}

const create = async (
  dailyReportId: string,
  data: ProductionCreateData
): Promise<ProductionDocument> => {
  const dailyReport = await DailyReport.getById(dailyReportId, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find daily report");

  const production = await Production.createDocument({
    ...data,
    dailyReport,
  });

  await production.save();

  await dailyReport.save();

  return production;
};

const update = async (
  id: string,
  data: ProductionUpdateData
): Promise<ProductionDocument> => {
  const production = await Production.getById(id, { throwError: true });
  if (!production) throw new Error("Unable to find production");

  await production.updateDocument(data);

  await production.save();

  return production;
};

const remove = async (id: string): Promise<string> => {
  const production = await Production.getById(id, { throwError: true });
  if (!production) throw new Error("Unable to find production");

  await production.fullDelete();

  return production._id.toString();
};

export default {
  create,
  update,
  remove,
};
