import { Box, Button, Flex, useToast } from "@chakra-ui/react";
import React from "react";
import { FiPlus } from "react-icons/fi";
import {
  DailyReportFullDocument,
  DailyReportFullSnippetFragment,
  MaterialShipmentCreateData,
  MaterialShipmentShipmentData,
  useMaterialShipmentCreateMutation,
} from "../../../generated/graphql";
import isEmpty from "../../../utils/isEmpty";
import ErrorMessage from "../../Common/ErrorMessage";
import MaterialShipmentDataForm, { MaterialShipmentFormError } from "./Data";
import { ShipmentErrors } from "./Shipment";

interface IMaterialShipmentCreate {
  dailyReport: DailyReportFullSnippetFragment;
  onSuccess?: () => void;
}

const MaterialShipmentCreate = ({
  dailyReport,
  onSuccess,
}: IMaterialShipmentCreate) => {
  const initialShipment: MaterialShipmentShipmentData = React.useMemo(() => {
    const jobsiteMaterialId = dailyReport.jobsite.materials[0]?._id || "";
    return {
      noJobsiteMaterial: isEmpty(jobsiteMaterialId),
      jobsiteMaterialId,
      quantity: 0,
      startTime: undefined,
      endTime: undefined,
    };
  }, [dailyReport.jobsite.materials]);

  const toast = useToast();

  const [formData, setFormData] = React.useState<MaterialShipmentCreateData[]>([
    { vehicleObject: undefined, shipments: [initialShipment] },
  ]);
  const [generalError, setGeneralError] = React.useState<string>();
  const [formErrors, setFormErrors] = React.useState<
    MaterialShipmentFormError[]
  >([]);
  const [hasTriedSubmit, setHasTriedSubmit] = React.useState(false);

  const [create, { loading }] = useMaterialShipmentCreateMutation({
    refetchQueries: [DailyReportFullDocument],
  });

  const addData = React.useCallback(() => {
    setHasTriedSubmit(false);
    const copy: MaterialShipmentCreateData[] = JSON.parse(
      JSON.stringify(formData)
    );
    copy.push({ vehicleObject: undefined, shipments: [initialShipment] });
    setFormData(copy);
  }, [formData, initialShipment]);

  const removeData = React.useCallback(
    (dataIndex: number) => {
      const copy: MaterialShipmentCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      copy.splice(dataIndex, 1);
      setFormData(copy);
    },
    [formData]
  );

  const onChange = React.useCallback(
    (data: MaterialShipmentCreateData, index: number) => {
      const copy: MaterialShipmentCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      copy[index] = data;
      setFormData(copy);
    },
    [formData]
  );

  const checkErrors = React.useCallback(() => {
    const errs: MaterialShipmentFormError[] = [];
    let valid = true;

    for (let i = 0; i < formData.length; i++) {
      const shipments: ShipmentErrors[] = [];
      const vehicleObject: MaterialShipmentFormError["vehicleObject"] = {};

      for (let j = 0; j < formData[i].shipments.length; j++) {
        shipments[j] = {};
        const qty = formData[i].shipments[j].quantity as unknown as number;
        if (isEmpty(qty) || !qty || isNaN(qty)) {
          shipments[j].quantity = "please provide a quantity";
          valid = false;
        }
        if (formData[i].shipments[j].noJobsiteMaterial) {
          if (isEmpty(formData[i].shipments[j].shipmentType)) {
            shipments[j].shipmentType = "please provide a shipment type";
            valid = false;
          }
          if (isEmpty(formData[i].shipments[j].supplier)) {
            shipments[j].supplier = "please provide a supplier";
            valid = false;
          }
          if (isEmpty(formData[i].shipments[j].unit)) {
            shipments[j].unit = "please provide a unit";
            valid = false;
          }
        }
      }

      const firstMaterialId = formData[i].shipments[0]?.jobsiteMaterialId;
      const firstMaterial = dailyReport.jobsite.materials.find(
        (m) => m._id === firstMaterialId
      );
      const scenarioId = formData[i].vehicleObject?.rateScenarioId;
      const isDeliveredScenario =
        firstMaterial?.scenarios?.find((s) => s._id === scenarioId)
          ?.delivered ?? false;

      if (formData[i].vehicleObject && !isDeliveredScenario) {
        if (isEmpty(formData[i].vehicleObject!.source)) {
          vehicleObject.source = "please provide a vehicle source";
          valid = false;
        }
        if (isEmpty(formData[i].vehicleObject!.vehicleCode)) {
          vehicleObject.vehicleCode = "please provide a vehicle code";
          valid = false;
        }
        if (isEmpty(formData[i].vehicleObject!.vehicleType)) {
          vehicleObject.vehicleType = "please provide a vehicle type";
          valid = false;
        }
        const isRateModelScenario =
          !!formData[i].vehicleObject!.rateScenarioId;
        if (
          !isRateModelScenario &&
          isEmpty(formData[i].vehicleObject!.truckingRateId)
        ) {
          vehicleObject.vehicleType =
            "something went wrong, please contact support";
          valid = false;
        }
      }

      errs[i] = { shipments, vehicleObject };
    }

    setFormErrors(errs);
    return valid;
  }, [formData, dailyReport.jobsite.materials]);

  const trySubmit = React.useCallback(() => {
    setHasTriedSubmit(true);
    if (!checkErrors()) return;
    create({
      variables: { dailyReportId: dailyReport._id, data: formData },
    })
      .then(() => {
        toast({
          isClosable: true,
          description: "Successfully added material shipments",
          title: "Success",
          status: "success",
        });
        setGeneralError(undefined);
        if (onSuccess) onSuccess();
      })
      .catch((err) => {
        setGeneralError(err.message);
      });
  }, [checkErrors, onSuccess, create, dailyReport._id, formData, toast]);

  React.useEffect(() => {
    if (hasTriedSubmit) checkErrors();
  }, [formData, hasTriedSubmit, checkErrors]);

  return (
    // Accent-tinted wrapper — orange for material shipments.
    <Box bg="orange.50" p={1} borderRadius="md" my={2}>
      <Flex direction="column" gap={4}>
        {generalError && <ErrorMessage description={generalError} />}

      {formData.map((data, dataIndex) => (
        <MaterialShipmentDataForm
          key={dataIndex}
          groupIndex={dataIndex}
          canDelete={formData.length > 1}
          errors={formErrors[dataIndex]}
          formData={data}
          isLoading={loading}
          jobsiteMaterials={dailyReport.jobsite.materials}
          dailyReportDate={dailyReport.date}
          onChange={(d) => onChange(d, dataIndex)}
          remove={() => removeData(dataIndex)}
          truckingRates={dailyReport.jobsite.truckingRates}
        />
      ))}

      <Button
        w="100%"
        variant="outline"
        bg="white"
        leftIcon={<FiPlus />}
        onClick={addData}
        isLoading={loading}
      >
        Add shipment group
      </Button>

      <Button
        w="100%"
        colorScheme="blue"
        onClick={trySubmit}
        isLoading={loading}
      >
        Save shipments
      </Button>
      </Flex>
    </Box>
  );
};

export default MaterialShipmentCreate;
