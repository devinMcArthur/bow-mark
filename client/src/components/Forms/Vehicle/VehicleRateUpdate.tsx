import { useToast } from "@chakra-ui/react";
import React from "react";
import {
  VehicleCardSnippetFragment,
  useVehicleUpdateRatesMutation,
} from "../../../generated/graphql";
import Rates from "../../Common/forms/Rates";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IVehicleRateUpdate {
  vehicle: VehicleCardSnippetFragment;
  onSuccess?: () => void;
}

const VehicleRateUpdate = ({ vehicle, onSuccess }: IVehicleRateUpdate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [rates, setRates] = React.useState(vehicle.rates);

  const [update, { loading }] = useVehicleUpdateRatesMutation();

  /**
   * ----- Functions ------
   */

  const handleSubmit = React.useCallback(async () => {
    try {
      const res = await update({
        variables: {
          data: rates,
          id: vehicle._id,
        },
      });

      if (res.data?.vehicleUpdateRates) {
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
  }, [vehicle._id, onSuccess, rates, toast, update]);

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

export default VehicleRateUpdate;
