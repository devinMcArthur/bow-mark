import React from "react";

import { useToast } from "@chakra-ui/react";
import {
  DefaultRateData,
  SystemDocument,
  SystemSnippetFragment,
  useSystemUpdateMaterialShipmentVehicleTypeDefaultsMutation,
} from "../../../generated/graphql";
import DefaultRates from "../../Common/forms/DefaultRates";
import SubmitButton from "../../Common/forms/SubmitButton";

interface ISystemMaterialShipmentVehicleTypeUpdate {
  system: SystemSnippetFragment;
  onSuccess?: () => void;
}

const SystemMaterialShipmentVehicleTypeUpdate = ({
  system,
  onSuccess,
}: ISystemMaterialShipmentVehicleTypeUpdate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [update, { loading }] =
    useSystemUpdateMaterialShipmentVehicleTypeDefaultsMutation({
      refetchQueries: [SystemDocument],
    });

  const [defaultRates, setDefaultRates] = React.useState<DefaultRateData[]>(
    system.materialShipmentVehicleTypeDefaults
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

      if (res.data?.systemUpdateMaterialShipmentVehicleTypeDefaults) {
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

export default SystemMaterialShipmentVehicleTypeUpdate;
