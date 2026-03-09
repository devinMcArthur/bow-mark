import React from "react";

import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import {
  EmployeeFullDocument,
  useEmployeeArchiveMutation,
  useEmployeeFullQuery,
  useEmployeeUnarchiveMutation,
  useSignupCreateMutation,
  useUserDeleteMutation,
} from "../../../generated/graphql";
import Loading from "../../Common/Loading";
import Card from "../../Common/Card";
import TextLink from "../../Common/TextLink";
import CopyField from "../../Common/CopyField";
import EmployeeRates from "./views/Rates";
import createLink from "../../../utils/createLink";
import Permission from "../../Common/Permission";
import UserUpdateRole from "../../Forms/User/Role";
import { FiArchive, FiTrash, FiUnlock } from "react-icons/fi";
import { useRouter } from "next/router";
import IndividualEmployeeHours from "../../Common/Employee/IndividualHours";
import UserUpdateTypes from "../../Forms/User/Types";

interface IEmployeeClientContent {
  id: string;
}

const EmployeeClientContent = ({ id }: IEmployeeClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const router = useRouter();

  const { data } = useEmployeeFullQuery({
    variables: {
      id,
    },
  });

  const [createSignup, { loading: signupLoading }] = useSignupCreateMutation({
    refetchQueries: [EmployeeFullDocument],
  });

  const [archive, { loading: archiveLoading }] = useEmployeeArchiveMutation();

  const [unarchive, { loading: unarchiveLoading }] =
    useEmployeeUnarchiveMutation();

  const [deleteUser, { loading: userDeleteLoading }] = useUserDeleteMutation({
    refetchQueries: [EmployeeFullDocument],
  });

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (data?.employee) {
      const employee = data.employee;

      let userContent;
      if (!employee.user) {
        if (employee.signup) {
          userContent = (
            <CopyField
              label="Signup Link"
              link={`${window.location.origin}/signup?id=${data?.employee.signup?._id}`}
            />
          );
        } else {
          userContent = (
            <Box>
              <Button
                onClick={() =>
                  createSignup({ variables: { employeeId: employee._id } })
                }
                isLoading={signupLoading}
              >
                Create Signup Link
              </Button>
            </Box>
          );
        }
      } else {
        userContent = (
          <Box>
            <Text>
              <Text fontWeight="bold" as="span">
                Name:{" "}
              </Text>
              {employee.user.name}
            </Text>
            <Text>
              <Text fontWeight="bold" as="span">
                Email:{" "}
              </Text>
              {employee.user.email}
            </Text>
            <Permission>
              <Box backgroundColor="gray.200" borderRadius={6} m={1} p={2}>
                <Text as="b">Permissions</Text>
                <UserUpdateRole user={employee.user} />
                <UserUpdateTypes user={employee.user} />
              </Box>
            </Permission>
          </Box>
        );
      }

      return (
        <Box>
          <Card>
            <Flex flexDir="row" justifyContent="space-between">
              <Heading size="md">User Info</Heading>

              <div>
                <Permission>
                  {!employee.archivedAt ? (
                    <Tooltip label="Archive">
                      <IconButton
                        icon={<FiArchive />}
                        aria-label="archive"
                        backgroundColor="transparent"
                        isLoading={archiveLoading}
                        onClick={() => {
                          if (window.confirm("Are you sure?")) {
                            archive({
                              variables: {
                                id: employee._id,
                              },
                            }).then(() => {
                              router.back();
                            });
                          }
                        }}
                      />
                    </Tooltip>
                  ) : (
                    <Tooltip label="Unarchive">
                      <IconButton
                        icon={<FiUnlock />}
                        aria-label="unarchive"
                        backgroundColor="transparent"
                        isLoading={unarchiveLoading}
                        onClick={() => {
                          if (window.confirm("Are you sure?")) {
                            unarchive({
                              variables: {
                                id: employee._id,
                              },
                            });
                          }
                        }}
                      />
                    </Tooltip>
                  )}
                  {!!employee.user && (
                    <Tooltip label="Remove User">
                      <IconButton
                        icon={<FiTrash />}
                        aria-label="remove"
                        backgroundColor="transparent"
                        isLoading={userDeleteLoading}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure? This cannot be reversed."
                            )
                          ) {
                            if (employee.user)
                              deleteUser({
                                variables: {
                                  userId: employee.user._id,
                                },
                              });
                          }
                        }}
                      />
                    </Tooltip>
                  )}
                </Permission>
              </div>
            </Flex>
            {userContent}
          </Card>
          <IndividualEmployeeHours employeeId={id} />
          <Permission>
            <EmployeeRates employee={employee} />
          </Permission>
          {employee.crews.length > 0 && (
            <Card>
              <Heading size="md">Crews</Heading>
              <Box m={2}>
                {employee.crews.map((crew) => (
                  <Box key={crew._id} border="1px solid lightgray" p={2}>
                    <TextLink
                      fontWeight="bold"
                      link={createLink.crew(crew._id)}
                    >
                      {crew.name}
                    </TextLink>
                  </Box>
                ))}
              </Box>
            </Card>
          )}
        </Box>
      );
    } else return <Loading />;
  }, [
    unarchive,
    unarchiveLoading,
    archive,
    archiveLoading,
    createSignup,
    data?.employee,
    deleteUser,
    id,
    router,
    signupLoading,
    userDeleteLoading,
  ]);
};

export default EmployeeClientContent;
