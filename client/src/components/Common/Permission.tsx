import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@chakra-ui/react";
import React from "react";
import { useAuth } from "../../contexts/Auth";
import { UserRoles, UserTypes } from "../../generated/graphql";

interface IPermission {
  minRole?: UserRoles;
  type?: UserTypes | null;
  otherCriteria?: boolean;
  showError?: boolean;
  alternativeDisplay?: React.ReactChild | null;
}

const Permission: React.FC<IPermission> = ({
  minRole = UserRoles.Admin,
  type = UserTypes.Operations,
  otherCriteria = false,
  showError = false,
  alternativeDisplay = null,
  children,
}) => {
  const {
    state: { user },
  } = useAuth();

  let altDisplay = alternativeDisplay;
  if (showError === true)
    altDisplay = (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          You do not have permission to view this
        </AlertDescription>
      </Alert>
    );

  // Still loading
  if (!user) return null;
  // User Admin
  if (user.role === UserRoles.Admin || otherCriteria) return <>{children}</>;
  // Project Manager
  if (user?.role === UserRoles.ProjectManager) {
    if (
      (minRole === UserRoles.ProjectManager ||
        minRole === UserRoles.User ||
        otherCriteria) &&
      (!type || user.types?.includes(type))
    )
      return <>{children}</>;
    else return <>{altDisplay || null}</>;
    // User
  } else if (user?.role === UserRoles.User) {
    if (
      (minRole === UserRoles.User || otherCriteria) &&
      (!type || user.types?.includes(type))
    )
      return <>{children}</>;
    else return <>{altDisplay || null}</>;
  } else return <>{altDisplay || null}</>;
};

export default Permission;
