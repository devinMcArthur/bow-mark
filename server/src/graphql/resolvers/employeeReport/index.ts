import {
  Employee,
  EmployeeClass,
  EmployeeWork,
  EmployeeWorkClass,
  EmployeeReportClass,
  EmployeeReportDocument,
} from "@models";
import { FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(() => EmployeeReportClass)
export default class EmployeeReportResolver {
  @FieldResolver(() => EmployeeClass, { nullable: true })
  async employee(@Root() employeeReport: EmployeeReportDocument) {
    return Employee.getById(employeeReport.employee || "");
  }

  @FieldResolver(() => [EmployeeWorkClass])
  async employeeWork(@Root() employeeReport: EmployeeReportDocument) {
    return EmployeeWork.find({
      _id: { $in: employeeReport.employeeWork },
    });
  }
}
