import { UserDocument } from "@models";
import createJWT from "@utils/createJWT";
import hashPassword from "@utils/hashPassword";
import { UserHomeViewSettings, UserRoles, UserTypes } from "@typescript/user";

const role = async (user: UserDocument, role: UserRoles) => {
  user.role = role;

  return;
};

const type = async (user: UserDocument, type: UserTypes) => {
  user.type = type;
};

const resetPasswordToken = async (user: UserDocument): Promise<string> => {
  const token = createJWT(
    {
      userId: user._id,
    },
    { expiresIn: 2 * 60 * 60 }
  );

  user.resetPasswordToken = token;

  return token;
};

const password = async (user: UserDocument, password: string) => {
  user.password = await hashPassword(password);

  return;
};

const homeView = async (user: UserDocument, homeView: UserHomeViewSettings) => {
  user.settings.homeView = homeView;

  return;
};

export default {
  role,
  type,
  resetPasswordToken,
  password,
  homeView,
};
