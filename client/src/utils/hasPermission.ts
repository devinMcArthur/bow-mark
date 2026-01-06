import { UserRoles } from "../generated/graphql";

const ROLE_WEIGHTS: Record<UserRoles, number> = {
  [UserRoles.Admin]: 3,
  [UserRoles.ProjectManager]: 2,
  [UserRoles.User]: 1,
};

const hasPermission = (
  userRole: UserRoles | null | undefined,
  minimumRole: UserRoles | null | undefined
): boolean => {
  // 1. Default to 0 (No Access) if role is missing/unknown
  const userLevel = userRole ? ROLE_WEIGHTS[userRole] ?? 0 : 0;

  // 2. Default to 0 (Public) or High (Private)? 
  // Usually, if a file has NO minRole, it implies it's public (0).
  const requiredLevel = minimumRole ? ROLE_WEIGHTS[minimumRole] ?? 0 : 0;

  return userLevel >= requiredLevel;
}

export default hasPermission;
