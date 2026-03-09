import { useToast } from "@chakra-ui/react";
import React from "react";
import { useEmployeeCreateForm } from "../../../forms/employee";
import {
  EmployeeCardSnippetFragment,
  EmployeeCreateData,
  useEmployeeCreateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IEmployeeCreateForm {
  onSuccess?: (employee: EmployeeCardSnippetFragment) => void;
}

const EmployeeCreateForm = ({ onSuccess }: IEmployeeCreateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [create, { loading }] = useEmployeeCreateMutation();

  const { FormComponents } = useEmployeeCreateForm();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: EmployeeCreateData) => {
      try {
        const res = await create({ variables: { data } });

        if (res.data?.employeeCreate) {
          if (onSuccess) onSuccess(res.data.employeeCreate);
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
    [create, onSuccess, toast]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={handleSubmit}>
      <FormComponents.Name isLoading={loading} />
      <FormComponents.JobTitle isLoading={loading} />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default EmployeeCreateForm;
