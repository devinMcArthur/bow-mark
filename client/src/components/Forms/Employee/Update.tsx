import { useToast } from "@chakra-ui/react";
import React from "react";
import { useEmployeeUpdateForm } from "../../../forms/employee";
import {
  EmployeeSsrSnippetFragment,
  EmployeeUpdateData,
  useEmployeeUpdateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IEmployeeUpdateForm {
  employee: EmployeeSsrSnippetFragment;
  onSuccess?: () => void;
}

const EmployeeUpdateForm = ({ employee, onSuccess }: IEmployeeUpdateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useEmployeeUpdateForm({
    defaultValues: {
      name: employee.name,
      jobTitle: employee.jobTitle,
    },
  });

  const [updateEmployee, { loading }] = useEmployeeUpdateMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: EmployeeUpdateData) => {
      try {
        const res = await updateEmployee({
          variables: { id: employee._id, data },
        });

        if (res.data?.employeeUpdate) {
          if (onSuccess) onSuccess();
        } else {
          toast({
            status: "error",
            title: "Error",
            description: "Something went wrong, please try again",
            isClosable: true,
          });
        }
      } catch (e: any) {
        toast({
          status: "error",
          title: "Error",
          description: e.message,
          isClosable: true,
        });
      }
    },
    [employee._id, onSuccess, toast, updateEmployee]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={submitHandler}>
      <FormComponents.Name isLoading={loading} />
      <FormComponents.JobTitle isLoading={loading} />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default EmployeeUpdateForm;
