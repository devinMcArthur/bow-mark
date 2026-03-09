import React from "react";

import { useToast } from "@chakra-ui/react";
import {
  DefaultRateData,
  SystemDocument,
  SystemSnippetFragment,
  useSystemUpdateCompanyVehicleTypeDefaultsMutation,
} from "../../../generated/graphql";
import DefaultRates from "../../Common/forms/DefaultRates";
import SubmitButton from "../../Common/forms/SubmitButton";

interface ISystemCompanyVehicleTypeUpdate {
  system: SystemSnippetFragment;
  onSuccess?: () => void;
}

const SystemCompanyVehicleTypeUpdate = ({
  system,
  onSuccess,
}: ISystemCompanyVehicleTypeUpdate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [update, { loading }] =
    useSystemUpdateCompanyVehicleTypeDefaultsMutation({
      refetchQueries: [SystemDocument],
    });

  const [defaultRates, setDefaultRates] = React.useState<DefaultRateData[]>(
    system.companyVehicleTypeDefaults
  );

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(async () => {
    try {
      const res = await update({
        variables: {
          data: defaultRates,
        },
      });

      if (res.data?.systemUpdateCompanyVehicleTypeDefaults) {
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
  }, [defaultRates, onSuccess, toast, update]);

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
      <DefaultRates
        defaultRates={defaultRates}
        onChange={(rates) => setDefaultRates(rates)}
        isLoading={loading}
        allowDeletion
      />
      <SubmitButton isLoading={loading} />
    </form>
  );
};

export default SystemCompanyVehicleTypeUpdate;
