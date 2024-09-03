import { Box, IconButton, useToast } from "@chakra-ui/react";
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
import SubmitButton from "../../Common/forms/SubmitButton";
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

  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [formData, setFormData] = React.useState<MaterialShipmentCreateData[]>([
    {
      vehicleObject: undefined,
      shipments: [initialShipment],
    },
  ]);

  const [generalError, setGeneralError] = React.useState<string>();

  const [formErrors, setFormErrors] = React.useState<
    MaterialShipmentFormError[]
  >([]);

  const [hasTriedSubmit, setHasTriedSubmit] = React.useState(false);

  const [create, { loading }] = useMaterialShipmentCreateMutation({
    refetchQueries: [DailyReportFullDocument],
  });

  /**
   * ----- Functions -----
   */

  const addData = React.useCallback(() => {
    setHasTriedSubmit(false);
    const formDataCopy: MaterialShipmentCreateData[] = JSON.parse(
      JSON.stringify(formData)
    );

    formDataCopy.push({
      vehicleObject: undefined,
      shipments: [initialShipment],
    });

    setFormData(formDataCopy);
  }, [formData, initialShipment]);

  const removeData = React.useCallback(
    (dataIndex: number) => {
      const formDataCopy: MaterialShipmentCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      formDataCopy.splice(dataIndex, 1);

      setFormData(formDataCopy);
    },
    [formData]
  );

  const onChange = React.useCallback(
    (data: MaterialShipmentCreateData, index: number) => {
      const formDataCopy: MaterialShipmentCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      formDataCopy[index] = data;

      setFormData(formDataCopy);
    },
    [formData]
  );

  const checkErrors = React.useCallback(() => {
    const formErrors: MaterialShipmentFormError[] = [];
    let valid = true;

    for (let i = 0; i < formData.length; i++) {
      let shipments: ShipmentErrors[] = [],
        vehicleObject: MaterialShipmentFormError["vehicleObject"] = {
          source: undefined,
          vehicleCode: undefined,
          vehicleType: undefined,
        };

      for (let j = 0; j < formData[i].shipments.length; j++) {
        shipments[j] = {
          jobsiteMaterialId: undefined,
          quantity: undefined,
          startTime: undefined,
          endTime: undefined,
          shipmentType: undefined,
          supplier: undefined,
          unit: undefined,
        };

        if (isEmpty(formData[i].shipments[j].quantity)) {
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

      if (formData[i].vehicleObject) {
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

        if (isEmpty(formData[i].vehicleObject!.truckingRateId)) {
          vehicleObject.vehicleType =
            "something went wrong, please contact support";
          valid = false;
        }
      }

      formErrors[i] = {
        shipments,
        vehicleObject,
      };
    }

    setFormErrors(formErrors);

    return valid;
  }, [formData]);

  const trySubmit = React.useCallback(() => {
    setHasTriedSubmit(true);

    if (checkErrors()) {
      create({
        variables: {
          dailyReportId: dailyReport._id,
          data: formData,
        },
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
    }
  }, [checkErrors, onSuccess, create, dailyReport._id, formData, toast]);

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (hasTriedSubmit) checkErrors();
  }, [formData, hasTriedSubmit, checkErrors]);

  /**
   * ----- Rendering -----
   */

  return (
    <Box>
      {generalError && <ErrorMessage description={generalError} />}
      {formData.map((data, dataIndex) => (
        <MaterialShipmentDataForm
          key={dataIndex}
          canDelete={formData.length > 1}
          errors={formErrors[dataIndex]}
          formData={data}
          isLoading={loading}
          jobsiteMaterials={dailyReport.jobsite.materials}
          dailyReportDate={dailyReport.date}
          onChange={(data) => onChange(data, dataIndex)}
          remove={() => removeData(dataIndex)}
          truckingRates={dailyReport.jobsite.truckingRates}
        />
      ))}

      <Box w="100%" px={2}>
        <IconButton
          w="100%"
          icon={<FiPlus />}
          aria-label="add"
          backgroundColor="gray.200"
          onClick={addData}
          isLoading={loading}
        />
      </Box>
      <Box w="100%" px={2}>
        <SubmitButton onClick={trySubmit} isLoading={loading} />
      </Box>
    </Box>
  );
};

export default MaterialShipmentCreate;
