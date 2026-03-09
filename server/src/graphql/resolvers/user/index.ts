import { UserQuery } from "@graphql/types/query";
import { EmployeeClass, User, UserClass, UserDocument } from "@models";
import { IContext, ListOptionData } from "@typescript/graphql";
import { UserHomeViewSettings, UserRoles, UserTypes } from "@typescript/user";
import { VehicleIssuePriority } from "@typescript/vehicleIssue";
import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import mutations, { LoginData, SignupData } from "./mutations";

@Resolver(() => UserClass)
export default class UserResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => EmployeeClass)
  async employee(@Root() user: UserDocument) {
    return user.getEmployee();
  }

  /**
   * ----- Query -----
   */

  @Authorized()
  @Query(() => UserClass)
  async currentUser(@Ctx() context: IContext) {
    return context.user;
  }

  @Query(() => UserClass, { nullable: true })
  async user(@Arg("query") query: UserQuery) {
    if (query.id) {
      return User.getById(query.id);
    } else if (query.resetPasswordToken) {
      return User.getByResetPasswordToken(query.resetPasswordToken);
    } else {
      return null;
    }
  }

  @Query(() => [UserClass])
  async users(
    @Arg("options", () => ListOptionData, { nullable: true })
    options?: ListOptionData
  ) {
    return User.getList(options);
  }

  /**
   * ----- Mutations -----
   */

  @Mutation(() => String)
  async signup(
    @Arg("signupId") signupId: string,
    @Arg("data", () => SignupData) data: SignupData
  ) {
    return mutations.signup(signupId, data);
  }

  @Mutation(() => String)
  async login(@Arg("data") data: LoginData) {
    return mutations.login(data);
  }

  @Authorized(["ADMIN", "DEV"])
  @Mutation(() => UserClass)
  async userUpdateRole(
    @Arg("id") id: string,
    @Arg("role", () => UserRoles) role: UserRoles
  ) {
    return mutations.role(id, role);
  }

  @Authorized(["ADMIN", "DEV"])
  @Mutation(() => UserClass)
  async userUpdateTypes(
    @Arg("id") id: string,
    @Arg("types", () => [UserTypes]) types: UserTypes[]
  ) {
    return mutations.types(id, types);
  }

  @Authorized()
  @Mutation(() => UserClass)
  async userUpdateHomeView(
    @Ctx() context: IContext,
    @Arg("homeView", () => UserHomeViewSettings) homeView: UserHomeViewSettings
  ) {
    return mutations.updateHomeView(context, homeView);
  }

  @Authorized()
  @Mutation(() => UserClass)
  async userUpdateSubscribedPriorities(
    @Ctx() context: IContext,
    @Arg("priorities", () => [VehicleIssuePriority])
    priorities: VehicleIssuePriority[]
  ) {
    return mutations.subscribedPriorities(context, priorities);
  }

  @Mutation(() => Boolean)
  async userPasswordResetRequest(@Arg("email") email: string) {
    return mutations.passwordResetRequest(email);
  }

  @Mutation(() => Boolean)
  async userPasswordReset(
    @Arg("password") password: string,
    @Arg("token") token: string
  ) {
    return mutations.passwordReset(password, token);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => String)
  async userDelete(@Arg("userId") userId: string) {
    return mutations.deleteUser(userId);
  }
}
