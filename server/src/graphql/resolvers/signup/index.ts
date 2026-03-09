import { EmployeeClass, Signup, SignupClass, SignupDocument } from "@models";
import {
  Arg,
  Authorized,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import mutations from "./mutations";

@Resolver(() => SignupClass)
export default class SignupResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => EmployeeClass, { nullable: false })
  async employee(@Root() signup: SignupDocument) {
    return signup.getEmployee();
  }

  /**
   * ----- Query -----
   */

  @Query(() => SignupClass)
  async signup(@Arg("id", { nullable: false }) id: string) {
    return Signup.getById(id);
  }

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => SignupClass)
  async signupCreate(@Arg("employeeId") employeeId: string) {
    return mutations.create(employeeId);
  }
}
