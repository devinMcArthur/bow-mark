import { useToast } from "@chakra-ui/react";
import React from "react";
import { useVehicleUpdateForm } from "../../../forms/vehicle";
import {
  useVehicleUpdateMutation,
  VehicleSsrSnippetFragment,
  VehicleUpdateData,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IVehicleUpdateForm {
  vehicle: VehicleSsrSnippetFragment;
  onSuccess?: () => void;
}

const VehicleUpdateForm = ({ vehicle, onSuccess }: IVehicleUpdateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useVehicleUpdateForm({
    defaultValues: {
      name: vehicle.name,
      vehicleType: vehicle.vehicleType,
      vehicleCode: vehicle.vehicleCode,
    },
  });

  const [vehicleUpdate, { loading }] = useVehicleUpdateMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: VehicleUpdateData) => {
      try {
        const res = await vehicleUpdate({
          variables: { id: vehicle._id, data },
        });

        if (res.data?.vehicleUpdate) {
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
    [onSuccess, toast, vehicle._id, vehicleUpdate]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={submitHandler}>
      <FormComponents.Name isLoading={loading} />
      <FormComponents.VehicleType isLoading={loading} />
      <FormComponents.Code isLoading={loading} />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default VehicleUpdateForm;
