import { Employee, EmployeeDocument, Vehicle, VehicleIssue } from "@models";
import { Id } from "@typescript/models";
import { VehicleIssuePriority } from "@typescript/vehicleIssue";
import { Field, ID, InputType } from "type-graphql";

@InputType()
export class VehicleIssueCreateData {
  @Field()
  public title!: string;

  @Field()
  public description!: string;

  @Field(() => VehicleIssuePriority)
  public priority!: VehicleIssuePriority;

  @Field(() => ID, { nullable: true })
  public assignedTo?: Id;

  @Field(() => ID, { nullable: true })
  public operatorDailyReport?: Id;
}

const create = async (
  vehicleId: Id,
  author: EmployeeDocument,
  data: VehicleIssueCreateData
) => {
  const vehicle = await Vehicle.getById(vehicleId);
  if (!vehicle) throw new Error("Unable to find this vehicle");

  const vehicleIssue = await VehicleIssue.createDocument(vehicle, author, data);
  await vehicleIssue.save();

  await vehicleIssue.sendNotifications();

  return vehicleIssue;
};

const assignedToUpdate = async (id: Id, assignedTo?: Id) => {
  const vehicleIssue = await VehicleIssue.getById(id);
  if (!vehicleIssue) throw new Error("Unable to find vehicle issue");

  const previousAssignedTo = vehicleIssue.assignedTo;

  let assignTo;
  if (assignedTo) {
    assignTo = await Employee.getById(assignedTo);
    if (!assignTo) throw new Error("Unable to find employee to assign to");
  }

  await vehicleIssue.updateAssignedTo(assignTo);
  await vehicleIssue.save();

  if (assignedTo && previousAssignedTo !== assignedTo)
    await vehicleIssue.sendAssignedToNotification();

  return vehicleIssue;
};

const close = async (id: Id) => {
  const vehicleIssue = await VehicleIssue.getById(id);
  if (!vehicleIssue) throw new Error("Unable to find vehicle issue");

  await vehicleIssue.close();
  await vehicleIssue.save();

  return vehicleIssue;
};

export default {
  create,
  assignedToUpdate,
  close,
};
