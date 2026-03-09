import { UserDocument, UserModel } from "@models";
import createJWT from "@utils/createJWT";
import email from "@utils/email";
import bcrypt from "bcryptjs";

/**
 * ----- Static Methods -----
 */

const login = async (
  User: UserModel,
  email: string,
  password: string,
  rememberMe: boolean
): Promise<string> => {
  const user = await User.getByEmail(email);
  if (!user) throw new Error("Invalid email or password provided");

  if ((await user.checkPassword(password)) === false)
    throw new Error("Invalid email or password provided");

  let expiresIn = 7 * 24 * 60 * 60;
  if (rememberMe) expiresIn = 90 * 24 * 60 * 60;

  const token = createJWT(
    {
      userId: user._id,
    },
    { expiresIn }
  );

  return token;
};

/**
 * ----- Methods -----
 */

const checkPassword = async (
  user: UserDocument,
  password: string
): Promise<boolean> => {
  const isMatch = await bcrypt.compare(password, user.password);

  return isMatch;
};

export interface IEmailData {
  subject: string;
  htmlContent: string;
}

const emailSend = async (user: UserDocument, data: IEmailData) => {
  await email.sendEmail(user.email, data.subject, data.htmlContent);

  return;
};

export default {
  login,
  email: emailSend,
  checkPassword,
};
