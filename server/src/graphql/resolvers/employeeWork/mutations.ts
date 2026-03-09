import { DailyReport, EmployeeWork, EmployeeWorkDocument } from "@models";
import { Field, InputType } from "type-graphql";

@InputType()
export class EmployeeWorkJobData {
  @Field(() => String, { nullable: false })
  public jobTitle!: string;

  @Field(() => Date, { nullable: false })
  public startTime!: Date;

  @Field(() => Date, { nullable: true })
  public endTime!: Date;
}

@InputType()
export class EmployeeWorkCreateData {
  @Field(() => [String], { nullable: false })
  public employees!: string[];

  @Field(() => [EmployeeWorkJobData], { nullable: false })
  public jobs!: EmployeeWorkJobData[];
}

@InputType()
export class EmployeeWorkUpdateData {
  @Field({ nullable: false })
  public jobTitle!: string;

  @Field(() => Date, { nullable: false })
  public startTime!: Date;

  @Field(() => Date, { nullable: false })
  public endTime!: Date;
}

const create = async (
  dailyReportId: string,
  data: EmployeeWorkCreateData[]
): Promise<EmployeeWorkDocument[]> => {
  const dailyReport = await DailyReport.getById(dailyReportId, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find Daily Report");

  let employeeWorks: EmployeeWorkDocument[] = [];

  for (let i = 0; i < data.length; i++) {
    const currentData = data[i];

    for (let j = 0; j < currentData.jobs.length; j++) {
      employeeWorks = [
        ...employeeWorks,
        ...(await EmployeeWork.createPerEmployee(
          { ...currentData.jobs[j], dailyReport },
          currentData.employees
        )),
      ];
    }
  }

  for (let i = 0; i < employeeWorks.length; i++) {
    employeeWorks[i].save();
  }

  await dailyReport.save();

  return employeeWorks;
};

const update = async (
  id: string,
  data: EmployeeWorkUpdateData
): Promise<EmployeeWorkDocument> => {
  const employeeWork = await EmployeeWork.getById(id, {
    throwError: true,
  });
  if (!employeeWork) throw new Error("Unable to find employee work");

  await employeeWork.updateDocument(data);

  await employeeWork.save();

  return employeeWork;
};

const remove = async (id: string): Promise<string> => {
  const employeeWork = await EmployeeWork.getById(id, {
    throwError: true,
  });
  if (!employeeWork) throw new Error("Unable to find employee work");

  await employeeWork.fullDelete();

  return employeeWork._id.toString();
};

export default {
  create,
  update,
  remove,
};
