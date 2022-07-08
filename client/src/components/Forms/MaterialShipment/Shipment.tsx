import { Box, Flex, IconButton, SimpleGrid } from "@chakra-ui/react";
import React from "react";
import { FiX } from "react-icons/fi";
import {
  JobsiteMaterialCardSnippetFragment,
  JobsiteMaterialCostType,
  MaterialShipmentShipmentData,
} from "../../../generated/graphql";
import convertHourToDate from "../../../utils/convertHourToDate";
import isEmpty from "../../../utils/isEmpty";
import jobsiteMaterialName from "../../../utils/jobsiteMaterialName";
import NumberForm from "../../Common/forms/Number";
import Select, { ISelect } from "../../Common/forms/Select";
import TextField from "../../Common/forms/TextField";
import Unit from "../../Common/forms/Unit";
import CompanySearch from "../../Search/CompanySearch";
import MaterialSearch from "../../Search/MaterialSearch";

export interface ShipmentErrors {
  jobsiteMaterialId?: string;
  shipmentType?: string;
  supplier?: string;
  unit?: string;
  quantity?: string;
  startTime?: string;
  endTime?: string;
}

interface IMaterialShipmentShipmentForm {
  shipment: MaterialShipmentShipmentData;
  canDelete: boolean;
  isLoading: boolean;
  jobsiteMaterials: JobsiteMaterialCardSnippetFragment[];
  dailyReportDate: Date;
  errors?: ShipmentErrors;
  index: number;
  deliveredMaterial?: JobsiteMaterialCardSnippetFragment;
  onChange: (shipment: MaterialShipmentShipmentData) => void;
  remove: () => void;
}

const MaterialShipmentShipmentForm = ({
  shipment,
  canDelete,
  isLoading,
  jobsiteMaterials,
  dailyReportDate,
  errors,
  index,
  deliveredMaterial,
  onChange,
  remove,
}: IMaterialShipmentShipmentForm) => {
  /**
   * ----- Variables -----
   */

  const shipmentCopy: MaterialShipmentShipmentData = React.useMemo(() => {
    return JSON.parse(JSON.stringify(shipment));
  }, [shipment]);

  const jobsiteMaterialOptions: ISelect["options"] = React.useMemo(() => {
    return jobsiteMaterials
      .filter((material) => {
        if (
          !deliveredMaterial &&
          index > 0 &&
          material.costType === JobsiteMaterialCostType.DeliveredRate
        )
          return false;
        return true;
      })
      .map((jobsiteMaterial) => {
        return {
          title: jobsiteMaterialName(jobsiteMaterial),
          value: jobsiteMaterial._id,
        };
      });
  }, [deliveredMaterial, index, jobsiteMaterials]);

  /**
   * ----- Functions -----
   */

  const updateJobsiteMaterial = React.useCallback(
    (jobsiteMaterialId: string) => {
      if (isEmpty(jobsiteMaterialId)) shipmentCopy.noJobsiteMaterial = true;
      else shipmentCopy.noJobsiteMaterial = false;

      shipmentCopy.jobsiteMaterialId = jobsiteMaterialId;

      onChange(shipmentCopy);
    },
    [shipmentCopy, onChange]
  );

  const updateQuantity = React.useCallback(
    (value: number) => {
      shipmentCopy.quantity = value;

      onChange(shipmentCopy);
    },
    [shipmentCopy, onChange]
  );

  const updateUnit = React.useCallback(
    (value: string) => {
      shipmentCopy.unit = value;

      onChange(shipmentCopy);
    },
    [onChange, shipmentCopy]
  );

  const updateShipmentType = React.useCallback(
    (value: string) => {
      shipmentCopy.shipmentType = value;

      onChange(shipmentCopy);
    },
    [onChange, shipmentCopy]
  );

  const updateSupplier = React.useCallback(
    (value: string) => {
      shipmentCopy.supplier = value;

      onChange(shipmentCopy);
    },
    [onChange, shipmentCopy]
  );

  const updateStartTime = React.useCallback(
    (value: string) => {
      shipmentCopy.startTime = convertHourToDate(value, dailyReportDate);

      onChange(shipmentCopy);
    },
    [dailyReportDate, onChange, shipmentCopy]
  );

  const updateEndTime = React.useCallback(
    (value: string) => {
      shipmentCopy.endTime = convertHourToDate(value, dailyReportDate);

      onChange(shipmentCopy);
    },
    [dailyReportDate, onChange, shipmentCopy]
  );

  /**
   * ----- Use-effects and other logic ------
   */

  // Handle deliveredMaterial changing
  React.useEffect(() => {
    if (deliveredMaterial && index > 0) {
      updateJobsiteMaterial(deliveredMaterial._id);
    } else if (!deliveredMaterial && index > 0) {
      updateJobsiteMaterial(jobsiteMaterials[0]._id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveredMaterial, index]);

  /**
   * ----- Rendering -----
   */

  return (
    <Box backgroundColor="gray.300" borderRadius={4} p={2} m={2}>
      {canDelete && (
        <Flex justifyContent="end">
          <IconButton
            p={0}
            icon={<FiX />}
            aria-label="remove"
            onClick={() => remove()}
            backgroundColor="transparent"
            isLoading={isLoading}
          />
        </Flex>
      )}
      {/* SHIPMENT */}
      {shipment.noJobsiteMaterial ? (
        // NO JOBSITE MATERIAL
        <>
          <Select
            name="jobsiteMaterialId"
            options={jobsiteMaterialOptions}
            placeholder="Material not listed"
            label="Material"
            isDisabled={isLoading || (!!deliveredMaterial && index > 0)}
            value={shipment.jobsiteMaterialId || undefined}
            errorMessage={errors?.jobsiteMaterialId}
            onChange={(e) => {
              updateJobsiteMaterial(e.target.value);
            }}
          />
          <SimpleGrid spacing={2} columns={[1, 1, 2]}>
            <NumberForm
              step={10}
              stepper
              label="Quantity"
              isDisabled={isLoading}
              value={shipment.quantity}
              errorMessage={errors?.quantity}
              onChange={(e) => updateQuantity(parseFloat(e))}
            />
            <Unit
              label="Units"
              value={shipment.unit || undefined}
              onChange={(e) => updateUnit(e.target.value)}
              errorMessage={errors?.unit}
            />
          </SimpleGrid>
          <SimpleGrid spacing={2} columns={[1, 1, 2]}>
            <MaterialSearch
              label="Received Material"
              isDisabled={isLoading}
              errorMessage={errors?.shipmentType}
              materialSelected={(material) => updateShipmentType(material.name)}
            />
            <CompanySearch
              label="Supplier"
              isDisabled={isLoading}
              errorMessage={errors?.supplier}
              companySelected={(company) => updateSupplier(company.name)}
            />
          </SimpleGrid>
        </>
      ) : (
        // JOBSITE MATERIAL
        <SimpleGrid spacing={2} columns={[1, 1, 2]}>
          <Select
            name="jobsiteMaterialId"
            options={jobsiteMaterialOptions}
            placeholder="Material not listed"
            label="Material"
            isDisabled={isLoading || (!!deliveredMaterial && index > 0)}
            value={shipment.jobsiteMaterialId || undefined}
            errorMessage={errors?.jobsiteMaterialId}
            onChange={(e) => {
              updateJobsiteMaterial(e.target.value);
            }}
          />
          <NumberForm
            step={10}
            stepper
            label="Quantity"
            isDisabled={isLoading}
            value={shipment.quantity}
            errorMessage={errors?.quantity}
            onChange={(e) => updateQuantity(parseFloat(e))}
          />
          {jobsiteMaterials
            .find((material) => shipment.jobsiteMaterialId === material._id)
            ?.deliveredRates.map((rate) => rate.title)}
        </SimpleGrid>
      )}

      <SimpleGrid spacing={2} columns={[1, 1, 2]}>
        <TextField
          label="Start Time (optional)"
          isDisabled={isLoading}
          value={shipment.startTime}
          bgColor="white"
          type="time"
          onChange={(e) => updateStartTime(e.target.value)}
          errorMessage={errors?.startTime}
        />
        <TextField
          label="End Time (optional)"
          isDisabled={isLoading}
          value={shipment.endTime}
          bgColor="white"
          type="time"
          onChange={(e) => updateEndTime(e.target.value)}
          errorMessage={errors?.endTime}
        />
      </SimpleGrid>
      {/* END SHIPMENT */}
    </Box>
  );
};

export default MaterialShipmentShipmentForm;
