import { Menu, MenuButton, MenuList } from "@chakra-ui/react";
import React from "react";
import { useAuth } from "../../../contexts/Auth";
import { CurrentUserDocument } from "../../../generated/graphql";
import UserUpdateRole from "../../Forms/User/Role";
import UserUpdateTypes from "../../Forms/User/Types";

const Development = () => {
  const [isDevelopment] = React.useState(process.env.NODE_ENV !== "production");

  const {
    state: { user },
  } = useAuth();

  return React.useMemo(() => {
    if (user && isDevelopment) {
      return (
        <Menu>
          <MenuButton>Dev</MenuButton>
          <MenuList p={2}>
            <UserUpdateRole
              user={user}
              mutationOptions={{
                refetchQueries: [CurrentUserDocument],
              }}
            />
            <UserUpdateTypes
              user={user}
              mutationOptions={{ refetchQueries: [CurrentUserDocument] }}
            />
          </MenuList>
        </Menu>
      );
    } else return null;
  }, [isDevelopment, user]);
};

export default Development;
