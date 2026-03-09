import { SignupDocument, UserDocument, UserModel } from "@models";
import { IUserCreate } from "@typescript/user";

const document = async (
  User: UserModel,
  signup: SignupDocument,
  data: IUserCreate
): Promise<UserDocument> => {
  const employee = await signup.getEmployee();

  const user = new User({
    ...data,
    employee: employee._id,
  });

  await user.updatePassword(data.password);

  return user;
};

export default {
  document,
};
