import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Flex,
  IconButton,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiTruck, FiX } from "react-icons/fi";
import { FiPackage } from "react-icons/fi";
import { MaterialShipmentVehicleTypes } from "../../../constants/select";
import {
  JobsiteMaterialCostModel,
  JobsiteMaterialCostType,
  JobsiteMaterialForDailyReportSnippetFragment,
  MaterialShipmentCreateData,
  MaterialShipmentShipmentData,
  MaterialShipmentVehicleObjectData,
  TruckingRateTypes,
  TruckingTypeRateSnippetFragment,
} from "../../../generated/graphql";
import isEmpty from "../../../utils/isEmpty";
import ContactOffice from "../../Common/ContactOffice";
import FormContainer from "../../Common/FormContainer";
import Select, { ISelect } from "../../Common/forms/Select";
import TextField from "../../Common/forms/TextField";
import CompanySearch from "../../Search/CompanySearch";
import MaterialShipmentShipmentForm, { ShipmentErrors } from "./Shipment";

const SectionDivider = ({ label }: { label: string }) => (
  <Flex alignItems="center" gap={2} px={1} pt={2} pb={1}>
    <Box h="1px" flex={1} bg="gray.300" />
    <Text
      fontSize="xs"
      fontWeight="bold"
      color="gray.400"
      textTransform="uppercase"
      letterSpacing="wider"
    >
      {label}
    </Text>
    <Box h="1px" flex={1} bg="gray.300" />
  </Flex>
);

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
  jobsiteMaterials: JobsiteMaterialForDailyReportSnippetFragment[];
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

  // The material selected on the first shipment row drives the costing mode.
  const selectedMaterial: JobsiteMaterialForDailyReportSnippetFragment | undefined =
    React.useMemo(() => {
      const shipment = formData.shipments[0];
      if (!shipment || shipment.noJobsiteMaterial) return undefined;
      return jobsiteMaterials.find((m) => m._id === shipment.jobsiteMaterialId);
    }, [formData.shipments, jobsiteMaterials]);

  // Costing mode
  const isInvoiceModel = selectedMaterial?.costModel === JobsiteMaterialCostModel.Invoice;
  const isRateModel = selectedMaterial?.costModel === JobsiteMaterialCostModel.Rate;
  const isLegacy = !selectedMaterial?.costModel;

  // Legacy: delivered material pre-fills source/vehicleType from supplier + deliveredRates
  const deliveredMaterial: JobsiteMaterialForDailyReportSnippetFragment | undefined =
    React.useMemo(() => {
      if (!isLegacy) return undefined;
      if (
        selectedMaterial &&
        selectedMaterial.costType === JobsiteMaterialCostType.DeliveredRate
      )
        return selectedMaterial;
      return undefined;
    }, [isLegacy, selectedMaterial]);

  // Rate model: which scenario is currently selected
  const selectedScenario = React.useMemo(() => {
    if (!isRateModel) return undefined;
    const scenarioId = formData.vehicleObject?.rateScenarioId;
    return selectedMaterial?.scenarios?.find((s) => s._id === scenarioId);
  }, [isRateModel, formData.vehicleObject?.rateScenarioId, selectedMaterial]);

  const isDeliveredScenario = selectedScenario?.delivered ?? false;
  const isPickupScenario = isRateModel && !!selectedScenario && !isDeliveredScenario;

  // For pickup: is the selected trucking rate type hourly?
  const isHourlyTruck = React.useMemo(() => {
    if (!isPickupScenario) return false;
    const rate = truckingRates.find(
      (r) => r._id === formData.vehicleObject?.truckingRateId
    );
    return rate?.rates?.[0]?.type === TruckingRateTypes.Hour;
  }, [isPickupScenario, truckingRates, formData.vehicleObject?.truckingRateId]);

  // Rendering decisions
  const showScenarioSelector =
    isRateModel && (selectedMaterial?.scenarios?.length ?? 0) > 0;
  const showVehicleSection = isLegacy || isPickupScenario;
  // undefined = legacy (show as optional); true = show as required; false = hide
  const shipmentStartEndTime: boolean | undefined = isLegacy
    ? undefined
    : isPickupScenario && isHourlyTruck
    ? true
    : false;

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

  const updateScenario = React.useCallback(
    (scenarioId: string) => {
      // For rate-model scenarios the rate is carried by rateScenarioId, not
      // truckingRateId. Don't inherit vehicleType/truckingRateId from
      // initialVehicleObject — those are legacy-only defaults and would silently
      // bypass the "vehicle type required" validation for pickup scenarios.
      // Preserve source/vehicleCode so switching scenarios doesn't wipe user input.
      const existing = formDataCopy.vehicleObject;
      formDataCopy.vehicleObject = {
        source: existing?.source ?? "",
        vehicleCode: existing?.vehicleCode ?? "",
        vehicleType: existing?.vehicleType ?? "",
        rateScenarioId: scenarioId,
      };

      onChange(formDataCopy);
    },
    [formDataCopy, onChange]
  );

  /**
   * ----- Use-effects and other logic -----
   */

  // Legacy delivered material: auto-fill source and vehicle type from the material
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

  // Rate model: auto-select the first scenario when the material changes
  React.useEffect(() => {
    if (isRateModel && selectedMaterial?.scenarios?.[0]) {
      updateScenario(selectedMaterial.scenarios[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterial?._id]);

  /**
   * ----- Rendering -----
   */

  const selectedScenarioId = formData.vehicleObject?.rateScenarioId;

  return (
    <FormContainer>
      {/* ── HEADER ─────────────────────────────────────── */}
      <Flex justifyContent="space-between" alignItems="center" px={1} pb={1}>
        <Flex alignItems="center" gap={2}>
          {deliveredMaterial && (
            <Badge colorScheme="green" fontSize="xs" px={2} py={0.5}>
              Delivered
            </Badge>
          )}
          {isInvoiceModel && (
            <Badge colorScheme="orange" fontSize="xs" px={2} py={0.5}>
              Invoice
            </Badge>
          )}
        </Flex>
        {canDelete && (
          <IconButton
            p={0}
            size="sm"
            icon={<FiX />}
            aria-label="remove"
            onClick={() => remove()}
            variant="ghost"
            isLoading={isLoading}
          />
        )}
      </Flex>

      {/* Callout for invoice model */}
      {isInvoiceModel && (
        <Alert status="info" borderRadius={6} py={2} px={3} mx={1} mb={3} fontSize="sm">
          <AlertIcon boxSize={4} />
          <AlertDescription>
            Invoiced material — enter quantity only.
          </AlertDescription>
        </Alert>
      )}

      {/* ── SHIPMENTS ──────────────────────────────────── */}
      <SectionDivider label="Shipment" />
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
          showStartEndTime={shipmentStartEndTime}
          afterMaterial={shipmentIndex === 0 && showScenarioSelector ? (
            <Box py={2}>
              <Text
                fontSize="xs"
                fontWeight="bold"
                color="gray.500"
                textTransform="uppercase"
                letterSpacing="wider"
                mb={2}
              >
                Rate Scenario
              </Text>
              <SimpleGrid
                columns={Math.min((selectedMaterial?.scenarios?.length ?? 0), 4)}
                spacing={2}
              >
                {(selectedMaterial?.scenarios ?? []).map((s) => {
                  const isSelected = s._id === selectedScenarioId;
                  const scheme = s.delivered ? "green" : "blue";
                  return (
                    <Box
                      key={s._id}
                      as="button"
                      type="button"
                      onClick={() => !isLoading && updateScenario(s._id)}
                      border="2px solid"
                      borderColor={isSelected ? `${scheme}.400` : "gray.300"}
                      borderRadius={8}
                      p={3}
                      bg={isSelected ? `${scheme}.50` : "white"}
                      cursor={isLoading ? "not-allowed" : "pointer"}
                      opacity={isLoading ? 0.6 : 1}
                      transition="all 0.15s ease"
                      _hover={
                        isLoading
                          ? {}
                          : { borderColor: `${scheme}.300`, bg: `${scheme}.50` }
                      }
                      textAlign="left"
                      w="100%"
                    >
                      <Flex alignItems="center" gap={1} mb={s.delivered ? 1 : 0}>
                        <Box
                          as={s.delivered ? FiTruck : FiPackage}
                          color={isSelected ? `${scheme}.500` : "gray.400"}
                          flexShrink={0}
                        />
                        <Text
                          fontWeight="semibold"
                          fontSize="sm"
                          color={isSelected ? `${scheme}.700` : "gray.700"}
                          noOfLines={1}
                        >
                          {s.label}
                        </Text>
                      </Flex>
                      {s.delivered && (
                        <Text fontSize="xs" color="green.600">
                          Trucking included
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </SimpleGrid>
              {isDeliveredScenario && (
                <Alert status="success" borderRadius={6} py={2} px={3} mt={2} fontSize="sm">
                  <AlertIcon boxSize={4} />
                  <AlertDescription>
                    Trucking is included in this rate — no vehicle info needed.
                  </AlertDescription>
                </Alert>
              )}
            </Box>
          ) : undefined}
        />
      ))}
      <Box w="100%" px={2} pb={1}>
        <IconButton
          w="100%"
          icon={<FiPlus />}
          aria-label="add-shipment"
          onClick={() => addShipment()}
          backgroundColor="gray.300"
          isLoading={isLoading}
        />
      </Box>

      {/* ── VEHICLE ────────────────────────────────────── */}
      {showVehicleSection && (
        <>
          <SectionDivider label="Vehicle" />
          <SimpleGrid spacing={2} columns={[1, 1, 3]} px={2} pb={2}>
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
        </>
      )}
    </FormContainer>
  );
};

export default MaterialShipmentDataForm;
