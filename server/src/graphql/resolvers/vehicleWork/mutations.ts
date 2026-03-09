import { DailyReport, VehicleWork, VehicleWorkDocument } from "@models";
import { Field, Float, InputType } from "type-graphql";

@InputType()
export class VehicleWorkJobData {
  @Field(() => String, { nullable: true })
  public jobTitle?: string;

  @Field(() => Float, { nullable: false })
  public hours!: number;
}

@InputType()
export class VehicleWorkCreateData {
  @Field(() => [String], { nullable: false })
  public vehicles!: string[];

  @Field(() => [VehicleWorkJobData], { nullable: false })
  public jobs!: VehicleWorkJobData[];
}

@InputType()
export class VehicleWorkUpdateData {
  @Field({ nullable: true })
  public jobTitle?: string;

  @Field(() => Float, { nullable: false })
  public hours!: number;
}

const create = async (
  dailyReportId: string,
  data: VehicleWorkCreateData[]
): Promise<VehicleWorkDocument[]> => {
  const dailyReport = await DailyReport.getById(dailyReportId, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find daily report");

  let vehicleWorks: VehicleWorkDocument[] = [];

  for (let i = 0; i < data.length; i++) {
    const currentData = data[i];

    for (let j = 0; j < currentData.jobs.length; j++) {
      vehicleWorks = [
        ...vehicleWorks,
        ...(await VehicleWork.createPerVehicle(
          { ...currentData.jobs[j], dailyReport },
          currentData.vehicles
        )),
      ];
    }
  }

  for (let i = 0; i < vehicleWorks.length; i++) {
    await vehicleWorks[i].save();
  }

  await dailyReport.save();

  return vehicleWorks;
};

const update = async (
  id: string,
  data: VehicleWorkUpdateData
): Promise<VehicleWorkDocument> => {
  const vehicleWork = await VehicleWork.getById(id, {
    throwError: true,
  });
  if (!vehicleWork) throw new Error("Unable to find vehicle work");

  await vehicleWork.updateDocument(data);

  await vehicleWork.save();

  return vehicleWork;
};

const remove = async (id: string): Promise<string> => {
  const vehicleWork = await VehicleWork.getById(id, {
    throwError: true,
  });
  if (!vehicleWork) throw new Error("Unable to find vehicle work");

  await vehicleWork.fullDelete();

  return vehicleWork._id.toString();
};

export default {
  create,
  update,
  remove,
};
