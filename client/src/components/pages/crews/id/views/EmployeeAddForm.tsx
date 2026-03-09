import { Box, Heading, Text, useToast } from "@chakra-ui/react";
import React from "react";
import { useEmployeeCreateForm } from "../../../../../forms/employee";
import {
  CrewFullDocument,
  CrewFullSnippetFragment,
  EmployeeCreateData,
  useCrewAddEmployeeMutation,
  useEmployeeCreateMutation,
  UserRoles,
} from "../../../../../generated/graphql";
import SubmitButton from "../../../../Common/forms/SubmitButton";
import Permission from "../../../../Common/Permission";
import EmployeeSearch from "../../../../Search/EmployeeSearch";

interface IEmployeeAddForm {
  crew: CrewFullSnippetFragment;
  closeForm?: () => void;
}

const EmployeeAddForm = ({ crew, closeForm }: IEmployeeAddForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [add, { loading: addLoading }] = useCrewAddEmployeeMutation();

  const [create, { loading: createLoading }] = useEmployeeCreateMutation({
    refetchQueries: [CrewFullDocument],
  });

  const { FormComponents } = useEmployeeCreateForm();

  /**
   * ----- Functions -----
   */

  const createSubmitHandler = React.useCallback(
    async (data: EmployeeCreateData) => {
      try {
        // Create employee
        await create({
          variables: {
            data,
            crewId: crew._id,
          },
        });

        toast({
          title: "Success",
          description: "Successfully added a new employee",
          isClosable: true,
          status: "success",
        });

        if (closeForm) closeForm();
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          isClosable: true,
        });
      }
    },
    [closeForm, create, crew._id, toast]
  );

  /**
   * ----- Variables -----
   */

  const loading = React.useMemo(
    () => addLoading || createLoading,
    [addLoading, createLoading]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <Box p={2}>
      <EmployeeSearch
        label="Add existing Employee"
        placeholder="Search employee"
        isDisabled={loading}
        employeeSelected={(employee) => {
          add({
            variables: {
              crewId: crew._id,
              employeeId: employee._id,
            },
          });
        }}
      />
      <Permission minRole={UserRoles.ProjectManager}>
        <Text color="gray.500" textAlign="center" my={2}>
          or
        </Text>
        <Box>
          <Heading size="sm" ml={1}>
            Add a new Employee
          </Heading>
          <FormComponents.Form submitHandler={createSubmitHandler}>
            <FormComponents.Name isLoading={loading} />
            <FormComponents.JobTitle isLoading={loading} />
            <SubmitButton isLoading={loading} />
          </FormComponents.Form>
        </Box>
      </Permission>
    </Box>
  );
};

export default EmployeeAddForm;
