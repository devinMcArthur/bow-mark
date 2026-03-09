import { useToast } from "@chakra-ui/react";
import React from "react";
import {
  EmployeeCardSnippetFragment,
  useEmployeeUpdateRatesMutation,
} from "../../../generated/graphql";
import Rates from "../../Common/forms/Rates";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IEmployeeRateUpdate {
  employee: EmployeeCardSnippetFragment;
  onSuccess?: () => void;
}

const EmployeeRateUpdate = ({ employee, onSuccess }: IEmployeeRateUpdate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [rates, setRates] = React.useState(employee.rates);

  const [update, { loading }] = useEmployeeUpdateRatesMutation();

  /**
   * ----- Functions ------
   */

  const handleSubmit = React.useCallback(async () => {
    try {
      const res = await update({
        variables: {
          data: rates,
          id: employee._id,
        },
      });

      if (res.data?.employeeUpdateRates) {
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
  }, [employee._id, onSuccess, rates, toast, update]);

  /**
   * ----- Rendering -----
   */

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <Rates rates={rates} onChange={(rates) => setRates(rates)} />
      <SubmitButton isLoading={loading} />
    </form>
  );
};

export default EmployeeRateUpdate;
