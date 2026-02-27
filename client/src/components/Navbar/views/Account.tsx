import React from "react";

import {
  Menu,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/Auth";
import Loading from "../../Common/Loading";
import Permission from "../../Common/Permission";
import { UserRoles } from "../../../generated/graphql";
import UserIcon from "../../Common/User/Icon";

const NavbarAccount = () => {
  const {
    logout,
    state: { user },
  } = useAuth();

  const router = useRouter();

  const content = React.useMemo(() => {
    if (user) {
      return (
        <Menu>
          <UserIcon name={user.name} menuButton hideTooltip />
          <MenuList>
            <MenuGroup>
              <Permission minRole={UserRoles.ProjectManager}>
                <MenuItem onClick={() => router.push("/dashboard")}>
                  Dashboard
                </MenuItem>
              </Permission>
              <Permission minRole={UserRoles.ProjectManager}>
                <MenuItem onClick={() => router.push("/current-master")}>
                  Master Costing
                </MenuItem>
              </Permission>
              <MenuItem onClick={() => router.push("/daily-reports")}>
                Daily Reports
              </MenuItem>
              <MenuItem onClick={() => router.push("/jobsites")}>
                Jobsites
              </MenuItem>

              <MenuDivider />

              <MenuItem onClick={() => router.push(`/settings`)}>
                Settings
              </MenuItem>
              <MenuItem onClick={() => logout()}>Logout</MenuItem>
            </MenuGroup>
          </MenuList>
        </Menu>
      );
    } else if (user === null) {
      return null;
    } else {
      return <Loading />;
    }
  }, [logout, router, user]);

  return content;
};

export default NavbarAccount;
