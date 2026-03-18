import { IContext } from "@typescript/graphql";
import { AuthChecker } from "type-graphql";
import { UserRoles } from "@typescript/user";

const authChecker: AuthChecker<IContext> = async ({ context }, roles) => {
  // if 'Authorized()', check only if user exists
  if (roles.length === 0) {
    return !!context.user;
  }

  if (context.user) {
    const isDevelopment = process.env.NODE_ENV === "development";

    if (roles.includes("DEV") && isDevelopment && context.user) return true;

    if (roles.includes("DEVELOPER") && context.user.role === UserRoles.Developer) return true;

    // >= 3 so Developer (4) also passes ADMIN checks
    if (roles.includes("ADMIN") && context.user.role >= 3) return true;

    if (roles.includes("PM") && context.user.role >= 2) return true;
  }

  return false;
};

export default authChecker;
