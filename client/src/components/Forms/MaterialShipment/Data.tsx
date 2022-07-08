import { Box, Flex, IconButton, SimpleGrid, Text } from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { MaterialShipmentVehicleTypes } from "../../../constants/select";
import {
  JobsiteMaterialCardSnippetFragment,
  JobsiteMaterialCostType,
  MaterialShipmentCreateData,
  MaterialShipmentShipmentData,
  MaterialShipmentVehicleObjectData,
  TruckingTypeRateSnippetFragment,
} from "../../../generated/graphql";
import isEmpty from "../../../utils/isEmpty";
import ContactOffice from "../../Common/ContactOffice";
import FormContainer from "../../Common/FormContainer";
import Select, { ISelect } from "../../Common/forms/Select";
import TextField from "../../Common/forms/TextField";
import CompanySearch from "../../Search/CompanySearch";
import MaterialShipmentShipmentForm, { ShipmentErrors } from "./Shipment";

export interface MaterialShipmentFormError {
  shipments: ShipmentErrors[];
  vehicleObject: {
    source?: string;
    vehicleCode?: string;
    vehicleType?: string;
  };
}

interface IMaterialShipmentDataForm {
  formData: MaterialShipmentCreateData;
  canDelete: boolean;
  isLoading: boolean;
  jobsiteMaterials: JobsiteMaterialCardSnippetFragment[];
  truckingRates: TruckingTypeRateSnippetFragment[];
  dailyReportDate: Date;
  errors?: MaterialShipmentFormError;
  remove: () => void;
  onChange: (data: MaterialShipmentCreateData) => void;
}

const MaterialShipmentDataForm = ({
  formData,
  canDelete,
  isLoading,
  jobsiteMaterials,
  truckingRates,
  dailyReportDate,
  errors,
  onChange,
  remove,
}: IMaterialShipmentDataForm) => {
  /**
   * ----- Variables -----
   */

  const formDataCopy: MaterialShipmentCreateData = React.useMemo(() => {
    return JSON.parse(JSON.stringify(formData));
  }, [formData]);

  const initialShipment: MaterialShipmentShipmentData = React.useMemo(() => {
    const jobsiteMaterialId = jobsiteMaterials[0]?._id || "";

    return {
      noJobsiteMaterial: isEmpty(jobsiteMaterialId),
      jobsiteMaterialId,
      quantity: 0,
      startTime: undefined,
      endTime: undefined,
    };
  }, [jobsiteMaterials]);

  const initialVehicleObject: MaterialShipmentVehicleObjectData =
    React.useMemo(() => {
      return {
        source: "",
        vehicleType: truckingRates[0]?.title || MaterialShipmentVehicleTypes[0],
        vehicleCode: "",
        truckingRateId: truckingRates[0]?._id || "",
      };
    }, [truckingRates]);

  const deliveredMaterial: JobsiteMaterialCardSnippetFragment | undefined =
    React.useMemo(() => {
      let deliveredMaterial: JobsiteMaterialCardSnippetFragment | undefined =
        undefined;
      const shipment = formData.shipments[0];
      if (shipment.noJobsiteMaterial === false) {
        const material = jobsiteMaterials.find(
          (material) => material._id === shipment.jobsiteMaterialId
        );
        if (
          material &&
          material.costType === JobsiteMaterialCostType.DeliveredRate
        )
          deliveredMaterial = material;
      }

      return deliveredMaterial;
    }, [formData.shipments, jobsiteMaterials]);

  const vehicleTypeOptions: ISelect["options"] = React.useMemo(() => {
    if (deliveredMaterial) {
      return deliveredMaterial.deliveredRates.map((rate) => {
        return {
          title: rate.title,
          value: rate._id!,
        };
      });
    } else {
      return truckingRates.map((rate) => {
        return {
          title: rate.title,
          value: rate._id!,
        };
      });
    }
  }, [deliveredMaterial, truckingRates]);

  /**
   * ----- Functions -----
   */

  const addShipment = React.useCallback(() => {
    formDataCopy.shipments.push(initialShipment);

    onChange(formDataCopy);
  }, [formDataCopy, initialShipment, onChange]);

  const removeShipment = React.useCallback(
    (index: number) => {
      formDataCopy.shipments.splice(index, 1);

      onChange(formDataCopy);
    },
    [formDataCopy, onChange]
  );

  const updateVehicleSource = React.useCallback(
    (value: string) => {
      if (!formDataCopy.vehicleObject)
        formDataCopy.vehicleObject = initialVehicleObject;

      formDataCopy.vehicleObject.source = value;

      onChange(formDataCopy);
    },
    [formDataCopy, initialVehicleObject, onChange]
  );

  const updateVehicleCode = React.useCallback(
    (value: string) => {
      if (!formDataCopy.vehicleObject)
        formDataCopy.vehicleObject = initialVehicleObject;

      formDataCopy.vehicleObject.vehicleCode = value;

      onChange(formDataCopy);
    },
    [formDataCopy, initialVehicleObject, onChange]
  );

  const updateVehicleType = React.useCallback(
    (type: string, truckingRateId: string) => {
      if (!formDataCopy.vehicleObject)
        formDataCopy.vehicleObject = initialVehicleObject;

      formDataCopy.vehicleObject.vehicleType = type;

      if (deliveredMaterial) {
        formDataCopy.vehicleObject.deliveredRateId = truckingRateId;
      } else {
        formDataCopy.vehicleObject.truckingRateId = truckingRateId;
      }

      onChange(formDataCopy);
    },
    [deliveredMaterial, formDataCopy, initialVehicleObject, onChange]
  );

  const updateShipment = React.useCallback(
    (shipment: MaterialShipmentShipmentData, index: number) => {
      formDataCopy.shipments[index] = shipment;

      onChange(formDataCopy);
    },
    [formDataCopy, onChange]
  );

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (deliveredMaterial) {
      updateVehicleSource(deliveredMaterial.supplier.name);
      if (deliveredMaterial.deliveredRates[0])
        updateVehicleType(
          deliveredMaterial.deliveredRates[0].title,
          deliveredMaterial.deliveredRates[0]._id!
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveredMaterial]);

  /**
   * ----- Rendering -----
   */

  return (
    <FormContainer>
      <Flex justifyContent="space-between">
        <Text ml={2} fontWeight="bold">
          {deliveredMaterial && "Delivered Material"}
        </Text>
        {canDelete && (
          <IconButton
            p={0}
            icon={<FiX />}
            aria-label="remove"
            onClick={() => remove()}
            backgroundColor="transparent"
            isLoading={isLoading}
          />
        )}
      </Flex>
      {/* SHIPMENTS */}
      {formData.shipments.map((shipment, shipmentIndex) => (
        <MaterialShipmentShipmentForm
          errors={errors?.shipments[shipmentIndex]}
          jobsiteMaterials={jobsiteMaterials}
          onChange={(shipment) => updateShipment(shipment, shipmentIndex)}
          dailyReportDate={dailyReportDate}
          shipment={shipment}
          key={shipmentIndex}
          canDelete={formData.shipments.length > 1}
          isLoading={isLoading}
          remove={() => removeShipment(shipmentIndex)}
          index={shipmentIndex}
          deliveredMaterial={deliveredMaterial}
        />
      ))}
      <Box w="100%" px={2}>
        <IconButton
          w="100%"
          icon={<FiPlus />}
          aria-label="add-shipment"
          onClick={() => addShipment()}
          backgroundColor="gray.300"
          isLoading={isLoading}
        />
      </Box>

      {/* VEHICLE OBJECT */}
      <SimpleGrid spacing={2} columns={[1, 1, 3]} p={4}>
        <CompanySearch
          label="Vehicle Source"
          isDisabled={isLoading}
          errorMessage={errors?.vehicleObject?.source}
          value={formData.vehicleObject?.source}
          companySelected={(company) => updateVehicleSource(company.name)}
          helperText={
            <>
              if not available contact <ContactOffice />
            </>
          }
        />
        <Select
          name="vehicleType"
          onChange={(e) => {
            updateVehicleType(
              e.target.options[e.target.selectedIndex].text,
              e.target.value
            );
          }}
          placeholder="Select vehicle type"
          options={vehicleTypeOptions}
          errorMessage={errors?.vehicleObject?.vehicleType}
          label="Vehicle Type"
          isDisabled={isLoading}
          helperText={
            <>
              if not available contact <ContactOffice />
            </>
          }
        />
        <TextField
          label="Vehicle Code"
          isDisabled={isLoading}
          value={formData.vehicleObject?.vehicleCode}
          errorMessage={errors?.vehicleObject?.vehicleCode}
          onChange={(e) => updateVehicleCode(e.target.value)}
          helperText="&nbsp;"
        />
      </SimpleGrid>
    </FormContainer>
  );
};

export default MaterialShipmentDataForm;
