import { useToast } from "@chakra-ui/react";
import React from "react";
import { TruckingRateTypes } from "../../../constants/select";
import { useSystem } from "../../../contexts/System";
import {
  JobsiteFullSnippetFragment,
  useJobsiteSetTruckingRatesMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";
import TruckingRates from "./TruckingRates";

interface IJobsiteTruckingRates {
  jobsite: JobsiteFullSnippetFragment;
  onSuccess?: () => void;
}

const JobsiteTruckingRates = ({
  jobsite,
  onSuccess,
}: IJobsiteTruckingRates) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const {
    state: { system },
  } = useSystem();

  const [truckingRates, setDefaults] = React.useState(
    jobsite.truckingRates.length > 0
      ? jobsite.truckingRates
      : system!.materialShipmentVehicleTypeDefaults.map((rate) => {
          return {
            title: rate.title,
            rate: rate.rate,
            type: TruckingRateTypes[0],
          };
        })
  );

  const [setRates, { loading }] = useJobsiteSetTruckingRatesMutation();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(async () => {
    try {
      const res = await setRates({
        variables: {
          data: truckingRates,
          id: jobsite._id,
        },
      });

      if (res.data?.jobsiteSetTruckingRates) {
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
  }, [truckingRates, jobsite._id, onSuccess, setRates, toast]);

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
      <TruckingRates
        truckingRates={truckingRates}
        onChange={(truckingRates) => setDefaults(truckingRates)}
        isLoading={loading}
      />
      <SubmitButton isLoading={loading} />
    </form>
  );
};

export default JobsiteTruckingRates;
