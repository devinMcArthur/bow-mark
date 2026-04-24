import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import React from "react";
import { FiPackage, FiPlus, FiTrash2, FiTruck } from "react-icons/fi";
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
import Select, { ISelect } from "../../Common/forms/Select";
import TextField from "../../Common/forms/TextField";
import CompanySearch from "../../Search/CompanySearch";
import MaterialShipmentShipmentForm, { ShipmentErrors } from "./Shipment";

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Text
    fontSize="xs"
    fontWeight="semibold"
    color="gray.500"
    textTransform="uppercase"
    letterSpacing="wide"
    mb={2}
  >
    {children}
  </Text>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text
    as="label"
    display="block"
    fontSize="xs"
    fontWeight="semibold"
    color="gray.500"
    textTransform="uppercase"
    letterSpacing="wide"
    mb={1}
  >
    {children}
  </Text>
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
  groupIndex?: number;
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
  groupIndex,
  onChange,
  remove,
}: IMaterialShipmentDataForm) => {
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

  const selectedMaterial:
    | JobsiteMaterialForDailyReportSnippetFragment
    | undefined = React.useMemo(() => {
    const shipment = formData.shipments[0];
    if (!shipment || shipment.noJobsiteMaterial) return undefined;
    return jobsiteMaterials.find((m) => m._id === shipment.jobsiteMaterialId);
  }, [formData.shipments, jobsiteMaterials]);

  const isInvoiceModel =
    selectedMaterial?.costModel === JobsiteMaterialCostModel.Invoice;
  const isRateModel =
    selectedMaterial?.costModel === JobsiteMaterialCostModel.Rate;
  const isLegacy = !selectedMaterial?.costModel;

  const deliveredMaterial:
    | JobsiteMaterialForDailyReportSnippetFragment
    | undefined = React.useMemo(() => {
    if (!isLegacy) return undefined;
    if (
      selectedMaterial &&
      selectedMaterial.costType === JobsiteMaterialCostType.DeliveredRate
    )
      return selectedMaterial;
    return undefined;
  }, [isLegacy, selectedMaterial]);

  const selectedScenario = React.useMemo(() => {
    if (!isRateModel) return undefined;
    const scenarioId = formData.vehicleObject?.rateScenarioId;
    return selectedMaterial?.scenarios?.find((s) => s._id === scenarioId);
  }, [isRateModel, formData.vehicleObject?.rateScenarioId, selectedMaterial]);

  const isDeliveredScenario = selectedScenario?.delivered ?? false;
  const isPickupScenario =
    isRateModel && !!selectedScenario && !isDeliveredScenario;

  const isHourlyTruck = React.useMemo(() => {
    if (!isPickupScenario) return false;
    const rate = truckingRates.find(
      (r) => r._id === formData.vehicleObject?.truckingRateId
    );
    return rate?.rates?.[0]?.type === TruckingRateTypes.Hour;
  }, [isPickupScenario, truckingRates, formData.vehicleObject?.truckingRateId]);

  const showScenarioSelector =
    isRateModel && (selectedMaterial?.scenarios?.length ?? 0) > 0;
  const showVehicleSection = isLegacy || isPickupScenario;
  const shipmentStartEndTime: boolean | undefined = isLegacy
    ? undefined
    : isPickupScenario && isHourlyTruck
    ? true
    : false;

  const vehicleTypeOptions: ISelect["options"] = React.useMemo(() => {
    if (deliveredMaterial) {
      return deliveredMaterial.deliveredRates.map((rate) => ({
        title: rate.title,
        value: rate._id!,
      }));
    }
    return truckingRates.map((rate) => ({
      title: rate.title,
      value: rate._id!,
    }));
  }, [deliveredMaterial, truckingRates]);

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

  React.useEffect(() => {
    if (isRateModel && selectedMaterial?.scenarios?.[0]) {
      updateScenario(selectedMaterial.scenarios[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterial?._id]);

  const selectedScenarioId = formData.vehicleObject?.rateScenarioId;

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={3}
      bg="white"
    >
      {/* Header — group index + status badges + delete */}
      <Flex
        justify="space-between"
        align="center"
        mb={canDelete || deliveredMaterial || isInvoiceModel ? 2 : 0}
      >
        <Flex align="center" gap={2}>
          {canDelete && (
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">
              GROUP #{(groupIndex ?? 0) + 1}
            </Text>
          )}
          {deliveredMaterial && (
            <Badge colorScheme="green" fontSize="0.65rem" variant="subtle">
              Delivered
            </Badge>
          )}
          {isInvoiceModel && (
            <Badge colorScheme="orange" fontSize="0.65rem" variant="subtle">
              Invoice
            </Badge>
          )}
        </Flex>
        {canDelete && (
          <IconButton
            aria-label="Remove group"
            icon={<FiTrash2 />}
            size="sm"
            variant="ghost"
            color="gray.500"
            onClick={remove}
            isLoading={isLoading}
          />
        )}
      </Flex>

      {isInvoiceModel && (
        <Alert status="info" borderRadius="md" py={2} px={3} mb={3} fontSize="sm">
          <AlertIcon boxSize={4} />
          <AlertDescription>
            Invoiced material — enter quantity only.
          </AlertDescription>
        </Alert>
      )}

      {/* Shipments */}
      <SectionLabel>Shipments</SectionLabel>
      <Flex direction="column" gap={3}>
        {formData.shipments.map((shipment, shipmentIndex) => (
          <MaterialShipmentShipmentForm
            errors={errors?.shipments[shipmentIndex]}
            jobsiteMaterials={jobsiteMaterials}
            onChange={(s) => updateShipment(s, shipmentIndex)}
            dailyReportDate={dailyReportDate}
            shipment={shipment}
            key={shipmentIndex}
            canDelete={formData.shipments.length > 1}
            isLoading={isLoading}
            remove={() => removeShipment(shipmentIndex)}
            index={shipmentIndex}
            deliveredMaterial={deliveredMaterial}
            showStartEndTime={shipmentStartEndTime}
            afterMaterial={
              shipmentIndex === 0 && showScenarioSelector ? (
                <Box pt={3}>
                  <FieldLabel>Rate Scenario</FieldLabel>
                  <SimpleGrid
                    columns={Math.min(
                      selectedMaterial?.scenarios?.length ?? 0,
                      4
                    )}
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
                          borderColor={
                            isSelected ? `${scheme}.400` : "gray.200"
                          }
                          borderRadius="md"
                          p={2}
                          bg={isSelected ? `${scheme}.50` : "white"}
                          cursor={isLoading ? "not-allowed" : "pointer"}
                          opacity={isLoading ? 0.6 : 1}
                          transition="all 0.15s ease"
                          _hover={
                            isLoading
                              ? {}
                              : {
                                  borderColor: `${scheme}.300`,
                                  bg: `${scheme}.50`,
                                }
                          }
                          textAlign="left"
                          w="100%"
                        >
                          <Flex
                            alignItems="center"
                            gap={1.5}
                            mb={s.delivered ? 0.5 : 0}
                          >
                            <Box
                              as={s.delivered ? FiTruck : FiPackage}
                              color={
                                isSelected ? `${scheme}.500` : "gray.400"
                              }
                              flexShrink={0}
                            />
                            <Text
                              fontWeight="semibold"
                              fontSize="sm"
                              color={
                                isSelected ? `${scheme}.700` : "gray.700"
                              }
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
                    <Alert
                      status="success"
                      borderRadius="md"
                      py={2}
                      px={3}
                      mt={2}
                      fontSize="sm"
                    >
                      <AlertIcon boxSize={4} />
                      <AlertDescription>
                        Trucking is included in this rate — no vehicle info
                        needed.
                      </AlertDescription>
                    </Alert>
                  )}
                </Box>
              ) : undefined
            }
          />
        ))}
      </Flex>

      <Button
        mt={3}
        w="100%"
        variant="outline"
        bg="white"
        leftIcon={<FiPlus />}
        onClick={addShipment}
        isLoading={isLoading}
      >
        Add shipment
      </Button>

      {/* Vehicle */}
      {showVehicleSection && (
        <Box mt={5}>
          <SectionLabel>Vehicle</SectionLabel>
          <Flex direction="column" gap={3}>
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
            <SimpleGrid columns={[1, 2]} spacing={3}>
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
              />
              <TextField
                label="Vehicle Code"
                isDisabled={isLoading}
                value={formData.vehicleObject?.vehicleCode}
                errorMessage={errors?.vehicleObject?.vehicleCode}
                onChange={(e) => updateVehicleCode(e.target.value)}
              />
            </SimpleGrid>
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export default MaterialShipmentDataForm;
