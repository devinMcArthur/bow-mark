import { SimpleGrid, useToast } from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { useMaterialShipmentUpdateForm } from "../../../forms/materialShipment";
import {
  DailyReportForMaterialShipmentSnippetFragment,
  JobsiteMaterialCardSnippetFragment,
  JobsiteMaterialCostType,
  MaterialShipmentCardSnippetFragment,
  MaterialShipmentUpdateData,
  useMaterialShipmentUpdateMutation,
} from "../../../generated/graphql";
import convertHourToDate from "../../../utils/convertHourToDate";
import isEmpty from "../../../utils/isEmpty";
import { ISelect } from "../../Common/forms/Select";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IMaterialShipmentUpdate {
  materialShipment: MaterialShipmentCardSnippetFragment;
  dailyReport: DailyReportForMaterialShipmentSnippetFragment;
  onSuccess?: () => void;
}

const MaterialShipmentUpdate = ({
  materialShipment,
  dailyReport,
  onSuccess,
}: IMaterialShipmentUpdate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [update, { loading }] = useMaterialShipmentUpdateMutation();

  const { FormComponents, noJobsiteMaterial, jobsiteMaterialId } =
    useMaterialShipmentUpdateForm({
      defaultValues: {
        jobsiteMaterialId: materialShipment.jobsiteMaterial?._id,
        noJobsiteMaterial: materialShipment.noJobsiteMaterial,
        quantity: materialShipment.quantity,
        startTime: materialShipment.startTime,
        endTime: materialShipment.endTime,
        shipmentType: materialShipment.shipmentType,
        unit: materialShipment.unit,
        supplier: materialShipment.supplier,
        vehicleObject: {
          source: materialShipment.vehicleObject?.source,
          vehicleCode: materialShipment.vehicleObject?.vehicleCode,
          vehicleType: materialShipment.vehicleObject?.vehicleType,
          truckingRateId: materialShipment.vehicleObject?.truckingRateId,
          deliveredRateId: materialShipment.vehicleObject?.deliveredRateId,
        },
      },
    });

  /**
   * ----- Variables -----
   */

  const deliveredMaterial: JobsiteMaterialCardSnippetFragment | undefined =
    React.useMemo(() => {
      let deliveredMaterial: JobsiteMaterialCardSnippetFragment | undefined =
        undefined;
      if (noJobsiteMaterial === false) {
        const material = dailyReport.jobsite.materials.find(
          (material) => material._id === jobsiteMaterialId
        );
        if (
          material &&
          material.costType === JobsiteMaterialCostType.DeliveredRate
        )
          deliveredMaterial = material;
      }

      return deliveredMaterial;
    }, [dailyReport.jobsite.materials, jobsiteMaterialId, noJobsiteMaterial]);

  const vehicleTypeOptions: ISelect["options"] = React.useMemo(() => {
    if (deliveredMaterial) {
      return deliveredMaterial.deliveredRates.map((rate) => {
        return {
          title: rate.title,
          value: rate._id!,
        };
      });
    } else {
      return dailyReport.jobsite.truckingRates.map((rate) => {
        return {
          title: rate.title,
          value: rate._id!,
        };
      });
    }
  }, [dailyReport.jobsite.truckingRates, deliveredMaterial]);

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: MaterialShipmentUpdateData) => {
      try {
        let startTime = data.startTime;
        if (startTime && !dayjs(startTime).isValid()) {
          startTime = convertHourToDate(data.startTime, dailyReport.date);
        }

        let endTime = data.endTime;
        if (endTime && !dayjs(endTime).isValid()) {
          endTime = convertHourToDate(data.endTime, dailyReport.date);
        }

        let vehicleObject = data.vehicleObject;
        if (data.vehicleObject) {
          if (
            isEmpty(data.vehicleObject.source) &&
            isEmpty(data.vehicleObject.vehicleCode) &&
            isEmpty(data.vehicleObject.vehicleType)
          ) {
            vehicleObject = null;
          }
        }

        const res = await update({
          variables: {
            id: materialShipment._id,
            data: {
              ...data,
              startTime,
              endTime,
              vehicleObject,
            },
          },
        });

        if (res.data?.materialShipmentUpdate) {
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
    [dailyReport.date, materialShipment._id, onSuccess, toast, update]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={handleSubmit}>
      {noJobsiteMaterial ? (
        <>
          <FormComponents.JobsiteMaterial
            jobsiteMaterials={dailyReport.jobsite.materials}
            isLoading={loading}
          />
          <SimpleGrid spacing={2} columns={[1, 1, 2]}>
            <FormComponents.Quantity isLoading={loading} />
            <FormComponents.Unit isLoading={loading} />
          </SimpleGrid>
          <SimpleGrid spacing={2} columns={[1, 1, 2]}>
            <FormComponents.ShipmentType isLoading={loading} />
            <FormComponents.Supplier isLoading={loading} />
          </SimpleGrid>
        </>
      ) : (
        <SimpleGrid spacing={2} columns={[1, 1, 2]}>
          <FormComponents.JobsiteMaterial
            jobsiteMaterials={dailyReport.jobsite.materials}
            isLoading={loading}
          />
          <FormComponents.Quantity isLoading={loading} />
        </SimpleGrid>
      )}
      <SimpleGrid spacing={2} columns={[1, 1, 2]}>
        <FormComponents.StartTime isLoading={loading} />
        <FormComponents.EndTime isLoading={loading} />
      </SimpleGrid>
      <SimpleGrid spacing={2} columns={[1, 1, 3]} p={4}>
        <FormComponents.VehicleSource isLoading={loading} />
        <FormComponents.VehicleType
          isLoading={loading}
          isDelivered={!!deliveredMaterial}
          options={vehicleTypeOptions}
        />
        <FormComponents.VehicleCode isLoading={loading} />
      </SimpleGrid>
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default MaterialShipmentUpdate;
