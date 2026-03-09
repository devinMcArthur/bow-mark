import { Flex, Icon, useToast } from "@chakra-ui/react";
import React from "react";
import {
  Exact,
  UserCardSnippetFragment,
  UserRoles,
  UserUpdateRoleMutation,
  useUserUpdateRoleMutation,
} from "../../../generated/graphql";
import Select from "../../Common/forms/Select";
import { FcCheckmark } from "react-icons/fc";
import {
  ApolloCache,
  DefaultContext,
  MutationHookOptions,
} from "@apollo/client";

interface IUserUpdateRole {
  user: UserCardSnippetFragment;
  mutationOptions?:
    | MutationHookOptions<
        UserUpdateRoleMutation,
        Exact<{
          id: string;
          role: UserRoles;
        }>,
        DefaultContext,
        ApolloCache<any>
      >
    | undefined;
}

const UserUpdateRole = ({ user, mutationOptions }: IUserUpdateRole) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast({
    isClosable: true,
    status: "error",
  });

  const [update, { data, loading }] = useUserUpdateRoleMutation({
    ...mutationOptions,
  });

  /**
   * ----- Functions -----
   */

  const handleChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (event.target.value) {
        try {
          const value: UserRoles = event.target.value as UserRoles;

          await update({
            variables: {
              id: user._id,
              role: value,
            },
          });
        } catch (e: any) {
          toast({
            title: "Error",
            description: e.message,
          });
        }
      }
    },
    [toast, update, user._id]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <Flex flexDir="row">
      <Select
        onChange={handleChange}
        value={user.role}
        options={[
          {
            title: "User",
            value: UserRoles.User,
          },
          {
            title: "Project Manager",
            value: UserRoles.ProjectManager,
          },
          {
            title: "Admin",
            value: UserRoles.Admin,
          },
        ]}
      />
      {!loading && data?.userUpdateRole && (
        <Icon boxSize={8} pl={2} m="auto" as={FcCheckmark} />
      )}
    </Flex>
  );
};

export default UserUpdateRole;
