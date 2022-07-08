import React from "react";
import { Center, SimpleGrid, Text, Tooltip, useToast } from "@chakra-ui/react";
import { useJobsiteMaterialUpdateForm } from "../../../forms/jobsiteMaterial";
import {
  JobsiteMaterialCardSnippetFragment,
  JobsiteMaterialCostType,
  JobsiteMaterialUpdateData,
  useJobsiteMaterialUpdateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";
import InfoTooltip from "../../Common/Info";

interface IJobsiteMaterialUpdate {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  onSuccess?: () => void;
}

const JobsiteMaterialUpdate = ({
  jobsiteMaterial,
  onSuccess,
}: IJobsiteMaterialUpdate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [update, { loading }] = useJobsiteMaterialUpdateMutation();

  const { FormComponents, costType } = useJobsiteMaterialUpdateForm({
    defaultValues: {
      supplierId: jobsiteMaterial.supplier._id,
      quantity: jobsiteMaterial.quantity,
      unit: jobsiteMaterial.unit,
      rates: jobsiteMaterial.rates,
      costType: jobsiteMaterial.costType,
      deliveredRates: jobsiteMaterial.deliveredRates,
      delivered: jobsiteMaterial.delivered,
    },
  });

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: JobsiteMaterialUpdateData) => {
      try {
        const res = await update({
          variables: {
            id: jobsiteMaterial._id,
            data,
          },
        });

        if (res.data?.jobsiteMaterialUpdate) {
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
    [jobsiteMaterial._id, onSuccess, toast, update]
  );

  /**
   * ----- Rendering -----
   */

  const costTypeForm = React.useMemo(() => {
    if (costType === JobsiteMaterialCostType.Rate) {
      return <FormComponents.Rates isLoading={loading} />;
    } else if (costType === JobsiteMaterialCostType.DeliveredRate) {
      return <FormComponents.DeliveredRates isLoading={loading} />;
    } else
      return (
        <Center mt={2}>
          <Text fontWeight="bold" color="gray.600">
            Invoices can be added after Update
          </Text>
        </Center>
      );
  }, [FormComponents, costType, loading]);

  return (
    <FormComponents.Form submitHandler={handleSubmit}>
      <FormComponents.Supplier isLoading={loading} />
      <SimpleGrid spacing={2} columns={[1, 1, 2]}>
        <FormComponents.Quantity isLoading={loading} />
        <FormComponents.Unit isLoading={loading} />
      </SimpleGrid>
      <FormComponents.CostType isLoading={loading} />
      <FormComponents.Delivered isLoading={loading} />
      {costType === JobsiteMaterialCostType.Invoice && (
        <InfoTooltip
          mx={1}
          description="If delivered, it will be assumed that trucking is included in the invoice and it will not be reported separately."
        />
      )}
      {costTypeForm}
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default JobsiteMaterialUpdate;
