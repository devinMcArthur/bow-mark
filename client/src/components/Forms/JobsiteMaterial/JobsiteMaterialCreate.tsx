import { Center, SimpleGrid, Text, useToast } from "@chakra-ui/react";
import React from "react";

import { useJobsiteMaterialCreateForm } from "../../../forms/jobsiteMaterial";
import {
  JobsiteMaterialCostType,
  JobsiteMaterialCreateData,
  useJobsiteAddMaterialMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";
import InfoTooltip from "../../Common/Info";

interface IJobsiteMaterialCreate {
  jobsiteId: string;
  onSuccess?: () => void;
}

const JobsiteMaterialCreate = ({
  jobsiteId,
  onSuccess,
}: IJobsiteMaterialCreate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents, costType } = useJobsiteMaterialCreateForm();

  const [create, { loading }] = useJobsiteAddMaterialMutation();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: JobsiteMaterialCreateData) => {
      try {
        const res = await create({
          variables: {
            jobsiteId,
            data,
          },
        });

        if (res.data?.jobsiteAddMaterial) {
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
    [create, jobsiteId, onSuccess, toast]
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
            Invoices can be added after creation
          </Text>
        </Center>
      );
  }, [FormComponents, costType, loading]);

  return (
    <FormComponents.Form submitHandler={handleSubmit}>
      <SimpleGrid spacing={2} columns={[1, 1, 2]}>
        <FormComponents.Material isLoading={loading} />
        <FormComponents.Supplier isLoading={loading} />
      </SimpleGrid>
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

export default JobsiteMaterialCreate;
