import { IContext } from "@typescript/graphql";
import { Id } from "@typescript/models";
import { UserRoles } from "@typescript/user";

export const getUserCrews = async (context: IContext) => {
  let crews: Id[] | undefined = undefined;
  const { user } = context;

  if (user && user.role === UserRoles.User) {
    const employee = await user.getEmployee();
    crews = (await employee.getCrews()).map((crew) => crew._id.toString());
  }

  return crews;
};
