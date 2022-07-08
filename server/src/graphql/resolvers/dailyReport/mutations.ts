import {
  Crew,
  DailyReport,
  DailyReportDocument,
  Employee,
  File,
  Jobsite,
  ReportNote,
  Vehicle,
} from "@models";
import { Id } from "@typescript/models";
import { Field, ID, InputType } from "type-graphql";
import { FileCreateData } from "../file/mutations";

@InputType()
export class DailyReportUpdateData {
  @Field(() => Date, { nullable: false })
  public date!: Date;

  @Field(() => ID, { nullable: false })
  public jobsiteId!: string;
}

@InputType()
export class DailyReportNoteUpdateData {
  @Field(() => String, { nullable: false })
  public note!: string;
}

@InputType()
export class DailyReportCreateData {
  @Field(() => String, { nullable: false })
  public jobsiteId!: string;

  @Field(() => String, { nullable: false })
  public crewId!: string;

  @Field(() => Date, { nullable: false })
  public date!: Date;
}

const create = async (
  data: DailyReportCreateData
): Promise<DailyReportDocument> => {
  const crew = await Crew.getById(data.crewId, { throwError: true });
  if (!crew) throw new Error("Cannot find crew");

  const jobsite = await Jobsite.getById(data.jobsiteId, {
    throwError: true,
  });
  if (!jobsite) throw new Error("Unable to find Jobsite");

  const dailyReport = await DailyReport.createDocument({
    crew,
    jobsite,
    date: data.date,
  });

  await dailyReport.save();

  return dailyReport;
};

const update = async (
  id: string,
  data: DailyReportUpdateData
): Promise<DailyReportDocument> => {
  const dailyReport = await DailyReport.getById(id, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find Daily Report");

  const { employeeWork, materialShipments } = await dailyReport.updateDocument(
    data
  );

  await dailyReport.save();

  for (let i = 0; i < employeeWork.length; i++) {
    employeeWork[i].save();
  }

  for (let i = 0; i < materialShipments.length; i++) {
    materialShipments[i].save();
  }

  return dailyReport;
};

const updateNote = async (
  id: string,
  data: DailyReportNoteUpdateData
): Promise<DailyReportDocument> => {
  const dailyReport = await DailyReport.getById(id, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find Daily Report");

  if (dailyReport.reportNote) {
    // Update existing note

    const reportNote = await dailyReport.getReportNote();

    if (!reportNote) {
      throw new Error("unable to find report note");
    }

    await reportNote.updateDocument(data);

    await reportNote.save();
  } else {
    // Create new note

    const reportNote = await ReportNote.createDocument({
      ...data,
      dailyReport,
    });

    await reportNote.save();
  }

  await dailyReport.save();

  return dailyReport;
};

const updateJobCostApproval = async (
  id: string,
  approved: boolean
): Promise<DailyReportDocument> => {
  const dailyReport = await DailyReport.getById(id, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find Daily Report");

  await dailyReport.updateJobCostApproval(approved);

  await dailyReport.save();

  return dailyReport;
};

const updatePayrollComplete = async (
  id: string,
  complete: boolean
): Promise<DailyReportDocument> => {
  const dailyReport = await DailyReport.getById(id, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find Daily Report");

  await dailyReport.updatePayrollComplete(complete);

  await dailyReport.save();

  return dailyReport;
};

const addTemporaryEmployee = async (
  id: string,
  employeeId: string
): Promise<DailyReportDocument> => {
  const dailyReport = await DailyReport.getById(id, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find Daily Report");

  const employee = await Employee.getById(employeeId, {
    throwError: true,
  });
  if (!employee) throw new Error("Unable to find employee");

  await dailyReport.addTemporaryEmployee(employee);

  await dailyReport.save();

  return dailyReport;
};

const addTemporaryVehicle = async (
  id: string,
  vehicleId: string
): Promise<DailyReportDocument> => {
  const dailyReport = await DailyReport.getById(id, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find Daily Report");

  const vehicle = await Vehicle.getById(vehicleId, {
    throwError: true,
  });
  if (!vehicle) throw new Error("Unable to find vehicle");

  await dailyReport.addTemporaryVehicle(vehicle);

  await dailyReport.save();

  return dailyReport;
};

const addNoteFile = async (
  id: Id,
  data: FileCreateData
): Promise<DailyReportDocument> => {
  const dailyReport = await DailyReport.getById(id, {
    throwError: true,
  });
  if (!dailyReport) throw new Error("Unable to find Daily Report");

  let reportNote = await dailyReport.getReportNote();
  if (!reportNote) {
    reportNote = await ReportNote.createDocument({
      dailyReport,
      note: "",
    });
  }

  const fileStream = await data.file;

  const file = await File.createDocument({
    description: data.description,
    mimetype: fileStream.mimetype,
    stream: fileStream.createReadStream(),
  });

  await reportNote.addFile(file);

  await reportNote.save();

  await dailyReport.save();

  return dailyReport;
};

const archive = async (id: Id) => {
  const dailyReport = await DailyReport.getById(id);
  if (!dailyReport) throw new Error("Unable to find Daily Report");

  const { employeeWork, vehicleWork, materialShipments } =
    await dailyReport.archive();

  await dailyReport.save();

  // save employee work
  for (let i = 0; i < employeeWork.length; i++) {
    employeeWork[i].save();
  }

  // save vehicle work
  for (let i = 0; i < vehicleWork.length; i++) {
    vehicleWork[i].save();
  }

  // save material shipments
  for (let i = 0; i < materialShipments.length; i++) {
    materialShipments[i].save();
  }

  return dailyReport;
};

export default {
  create,
  update,
  updateNote,
  addNoteFile,
  updateJobCostApproval,
  updatePayrollComplete,
  addTemporaryEmployee,
  addTemporaryVehicle,
  archive,
};
