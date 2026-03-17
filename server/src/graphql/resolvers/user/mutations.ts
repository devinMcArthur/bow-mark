import { Field, InputType } from "type-graphql";

import { Signup, User, UserDocument } from "@models";
import { decode, JwtPayload } from "jsonwebtoken";
import { Id } from "@typescript/models";
import { UserHomeViewSettings, UserRoles, UserTypes } from "@typescript/user";
import { IContext } from "@typescript/graphql";
import getClientUrl from "@utils/getClientUrl";
import { VehicleIssuePriority } from "@typescript/vehicleIssue";

@InputType()
export class LoginData {
  @Field({ nullable: false })
  public email!: string;

  @Field({ nullable: false })
  public password!: string;

  @Field({ nullable: false })
  public rememberMe!: boolean;
}

@InputType()
export class SignupData {
  @Field({ nullable: false })
  public name!: string;

  @Field({ nullable: false })
  public email!: string;

  @Field({ nullable: false })
  public password!: string;
}

const login = (data: LoginData) => {
  return User.login(data.email, data.password, data.rememberMe);
};

const signup = async (signupId: string, data: SignupData): Promise<string> => {
  const signup = await Signup.getById(signupId, { throwError: true });
  if (!signup) throw new Error("Unable to find signup");

  const user = await User.createDocument(signup, data);

  await user.save();

  await signup.remove();

  const token = await User.login(user.email, data.password, true);

  return token;
};

const passwordResetRequest = async (email: string): Promise<boolean> => {
  const user = await User.getByEmail(email);
  if (!user) throw new Error("Unable to find user with that email");

  const token = await user.setResetPasswordToken();

  await user.save();

  console.log(`Reset link: ${getClientUrl()}/password-reset/${token}`);
  await user.sendEmail({
    subject: "Bow Mark - Password Reset",
    htmlContent: `Follow link to reset password: ${getClientUrl()}/password-reset/${token}`,
  });

  return true;
};

const passwordReset = async (
  password: string,
  token: string
): Promise<boolean> => {
  const user = await User.getByResetPasswordToken(token);
  if (!user) throw new Error("Invalid token, please try the process again");

  const decoded = decode(token) as JwtPayload;

  if (decoded.exp && decoded.exp * 1000 < new Date().getTime())
    throw new Error(
      "Your reset link has expired, pleas try the proocess again"
    );

  await user.updatePassword(password);

  await user.save();

  return true;
};

const role = async (id: Id, role: UserRoles): Promise<UserDocument> => {
  if (role === UserRoles.Developer)
    throw new Error("Cannot assign Developer role");

  const user = await User.getById(id, { throwError: true });
  if (!user) throw new Error("Unable to find user");

  await user.updateRole(role);

  await user.save();

  return user;
};

const types = async (id: Id, types: UserTypes[]): Promise<UserDocument> => {
  const user = await User.getById(id, { throwError: true });
  if (!user) throw new Error("Unable to find user");

  await user.updateTypes(types);

  await user.save();

  return user;
};

const updateHomeView = async (
  context: IContext,
  homeView: UserHomeViewSettings
): Promise<UserDocument> => {
  if (!context.user) throw new Error("cannot find user");

  if (parseInt(context.user.role.toString()) < 2 && homeView === 2)
    throw new Error("You do not have permission for this home view");

  await context.user.updateHomeView(homeView);

  await context.user.save();

  return context.user;
};

const subscribedPriorities = async (
  context: IContext,
  priorities: VehicleIssuePriority[]
): Promise<UserDocument> => {
  if (!context.user) throw new Error("cannot find user");

  if (
    parseInt(context.user.role.toString()) < 2 &&
    (context.user.types.includes(UserTypes.VehicleMaintenance) ||
      context.user.role === UserRoles.Admin)
  )
    throw new Error("You do not have permission to subscribe");

  await context.user.updateSubscribedPriorities(priorities);

  await context.user.save();

  return context.user;
};

const deleteUser = async (userId: Id) => {
  const user = await User.getById(userId);
  if (!user) throw new Error("Unable to find user with that Id");

  await user.delete();

  return userId;
};

export default {
  login,
  signup,
  role,
  types,
  passwordResetRequest,
  passwordReset,
  updateHomeView,
  subscribedPriorities,
  deleteUser,
};
