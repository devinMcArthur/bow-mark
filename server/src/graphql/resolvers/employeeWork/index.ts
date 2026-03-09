import {
  Arg,
  Authorized,
  FieldResolver,
  Mutation,
  Resolver,
  Root,
} from "type-graphql";

import {
  EmployeeClass,
  EmployeeWorkClass,
  EmployeeWorkDocument,
} from "@models";
import mutations, {
  EmployeeWorkCreateData,
  EmployeeWorkUpdateData,
} from "./mutations";

@Resolver(() => EmployeeWorkClass)
export default class EmployeeWorkResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => EmployeeClass)
  async employee(@Root() employeeWork: EmployeeWorkDocument) {
    return employeeWork.getEmployee();
  }

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => [EmployeeWorkClass])
  async employeeWorkCreate(
    @Arg("dailyReportId") dailyReportId: string,
    @Arg("data", () => [EmployeeWorkCreateData]) data: EmployeeWorkCreateData[]
  ) {
    return mutations.create(dailyReportId, data);
  }

  @Authorized()
  @Mutation(() => EmployeeWorkClass)
  async employeeWorkUpdate(
    @Arg("id") id: string,
    @Arg("data") data: EmployeeWorkUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized()
  @Mutation(() => String)
  async employeeWorkDelete(@Arg("id") id: string) {
    return mutations.remove(id);
  }
}
