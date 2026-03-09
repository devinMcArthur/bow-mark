import {
  Employee,
  EmployeeClass,
  JobsiteMaterial,
  JobsiteMaterialClass,
  Vehicle,
  VehicleClass,
} from "@models";
import {
  ReportIssueFullClass,
  ReportIssueFullDocument,
  ReportIssueTypes,
} from "@typescript/jobsiteReports";
import { FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(() => ReportIssueFullClass)
export default class ReportIssueFullResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => EmployeeClass, { nullable: true })
  async employee(@Root() reportIssueFull: ReportIssueFullDocument) {
    if (reportIssueFull.type === ReportIssueTypes.EmployeeRateZero)
      return Employee.getById(reportIssueFull.employee || "");
    else return null;
  }

  @FieldResolver(() => VehicleClass, { nullable: true })
  async vehicle(@Root() reportIssueFull: ReportIssueFullDocument) {
    if (reportIssueFull.type === ReportIssueTypes.VehicleRateZero)
      return Vehicle.getById(reportIssueFull.vehicle || "");
    else return null;
  }

  @FieldResolver(() => JobsiteMaterialClass, { nullable: true })
  async jobsiteMaterial(@Root() reportIssueFull: ReportIssueFullDocument) {
    if (
      reportIssueFull.type === ReportIssueTypes.MaterialRateZero ||
      reportIssueFull.type === ReportIssueTypes.MaterialEstimatedRate
    )
      return JobsiteMaterial.getById(reportIssueFull.jobsiteMaterial || "");
    else return null;
  }
}
