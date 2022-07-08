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
  useSignupCreateMutation,
} from "../../../generated/graphql";
import Loading from "../../Common/Loading";
import Card from "../../Common/Card";
import TextLink from "../../Common/TextLink";
import CopyField from "../../Common/CopyField";
import EmployeeRates from "./views/Rates";
import createLink from "../../../utils/createLink";
import Permission from "../../Common/Permission";
import UserUpdateRole from "../../Forms/User/Role";
import { FiArchive } from "react-icons/fi";
import { useRouter } from "next/router";
import IndividualEmployeeHours from "../../Common/Employee/IndividualHours";

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
              <UserUpdateRole user={employee.user} />
            </Permission>
          </Box>
        );
      }

      return (
        <Box>
          <Card>
            <Flex flexDir="row" justifyContent="space-between">
              <Heading size="md">User Info</Heading>
              <Permission>
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
              </Permission>
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
    archive,
    archiveLoading,
    createSignup,
    data?.employee,
    id,
    router,
    signupLoading,
  ]);
};

export default EmployeeClientContent;
