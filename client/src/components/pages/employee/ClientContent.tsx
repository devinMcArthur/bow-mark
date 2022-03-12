import React from "react";

import { Box, Button, Heading, Text } from "@chakra-ui/react";
import {
  EmployeeFullDocument,
  useEmployeeFullQuery,
  useSignupCreateMutation,
  useUserAdminMutation,
} from "../../../generated/graphql";
import Loading from "../../Common/Loading";
import Card from "../../Common/Card";
import TextLink from "../../Common/TextLink";
import AdminOnly from "../../Common/AdminOnly";
import Checkbox from "../../Common/forms/Checkbox";
import CopyField from "../../Common/CopyField";

interface IEmployeeClientContent {
  id: string;
}

const EmployeeClientContent = ({ id }: IEmployeeClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data } = useEmployeeFullQuery({
    variables: {
      id,
    },
  });

  const [userAdmin, { loading }] = useUserAdminMutation();

  const [createSignup, { loading: signupLoading }] = useSignupCreateMutation({
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
            <AdminOnly>
              <Checkbox
                isChecked={employee.user.admin}
                isDisabled={loading}
                onChange={(e) =>
                  userAdmin({
                    variables: {
                      id: employee.user!._id,
                      isAdmin: e.target.checked,
                    },
                  })
                }
              >
                Admin
              </Checkbox>
            </AdminOnly>
          </Box>
        );
      }

      return (
        <Box>
          <Card>
            <Heading size="md">User Info</Heading>
            {userContent}
          </Card>
          {employee.crews.length > 0 && (
            <Card>
              <Heading size="md">Crews</Heading>
              <Box m={2}>
                {employee.crews.map((crew) => (
                  <Box key={crew._id} border="1px solid lightgray" p={2}>
                    <TextLink fontWeight="bold" link={`/crew/${crew._id}`}>
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
  }, [createSignup, data?.employee, loading, signupLoading, userAdmin]);
};

export default EmployeeClientContent;