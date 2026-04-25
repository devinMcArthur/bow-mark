import React from "react";
import {
  Box,
  Button,
  Center,
  Checkbox,
  Flex,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  Text,
  useToast,
} from "@chakra-ui/react";
import { Controller } from "react-hook-form";
import { useJobsiteMaterialUpdateForm } from "../../../forms/jobsiteMaterial";
import {
  JobsiteMaterialCardSnippetFragment,
  JobsiteMaterialCostModel,
  JobsiteMaterialCostType,
  JobsiteMaterialUpdateData,
  useJobsiteMaterialUpdateMutation,
} from "../../../generated/graphql";
import CompanySearch from "../../Search/CompanySearch";
import Units from "../../Common/forms/Unit";
import JobsiteMaterialCostTypeForm from "./CostType";
import InfoTooltip from "../../Common/Info";
import JobsiteMaterialRatesForm from "./Rates";
import JobsiteMaterialDeliveredRatesForm, {
  IJobsiteMaterialDeliveredRateError,
} from "./DeliveredRates";
import ScenariosList from "./ScenariosList";

const formatThousands = (val: string | number | undefined): string => {
  if (val === undefined || val === null || val === "") return "";
  const stripped =
    typeof val === "string" ? val.replace(/,/g, "") : String(val);
  if (stripped === "" || stripped === "-") return stripped;
  const [whole, fraction] = stripped.split(".");
  const n = parseInt(whole, 10);
  if (Number.isNaN(n)) return stripped;
  const formattedWhole = n.toLocaleString("en-US");
  return fraction !== undefined ? `${formattedWhole}.${fraction}` : formattedWhole;
};
const parseThousands = (val: string): string => val.replace(/,/g, "");

interface IJobsiteMaterialUpdate {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  onSuccess?: () => void;
  truckingRates?: { title: string }[];
}

/** Compact uppercase label shared across jobsite-page forms. */
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

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <Text fontSize="xs" color="red.500" mt={1}>
      {message}
    </Text>
  ) : null;

const JobsiteMaterialUpdate = ({
  jobsiteMaterial,
  onSuccess,
  truckingRates,
}: IJobsiteMaterialUpdate) => {
  const toast = useToast();
  const [update, { loading }] = useJobsiteMaterialUpdateMutation();

  const { handleSubmit, control, setValue, costType } =
    useJobsiteMaterialUpdateForm({
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

  const onSubmit = React.useCallback(
    async (data: JobsiteMaterialUpdateData) => {
      try {
        const res = await update({
          variables: { id: jobsiteMaterial._id, data },
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
      } catch (e) {
        toast({
          status: "error",
          title: "Error",
          description: e instanceof Error ? e.message : "Unknown error",
          isClosable: true,
        });
      }
    },
    [jobsiteMaterial._id, onSuccess, toast, update]
  );

  const isScenarioModel =
    jobsiteMaterial.costModel === JobsiteMaterialCostModel.Rate;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Flex direction="column" gap={3}>
          {/* Supplier */}
          <Controller
            control={control}
            name="supplierId"
            render={({ field, fieldState }) => (
              <Box>
                <FieldLabel>Supplier</FieldLabel>
                <CompanySearch
                  {...field}
                  isDisabled={loading}
                  companySelected={(company) =>
                    setValue("supplierId", company._id)
                  }
                />
                <FieldError message={fieldState.error?.message} />
              </Box>
            )}
          />

          {/* Quantity + Unit */}
          <SimpleGrid columns={[1, 1, 2]} spacing={3}>
            <Controller
              control={control}
              name="quantity"
              render={({ field, fieldState }) => (
                <Box>
                  <FieldLabel>Quantity</FieldLabel>
                  <NumberInput
                    size="sm"
                    value={field.value?.toString() ?? ""}
                    isDisabled={loading}
                    isInvalid={!!fieldState.error}
                    format={formatThousands}
                    parse={parseThousands}
                    onChange={(valueAsString) => field.onChange(valueAsString)}
                    w="100%"
                  >
                    <NumberInputField />
                  </NumberInput>
                  <FieldError message={fieldState.error?.message} />
                </Box>
              )}
            />
            <Controller
              control={control}
              name="unit"
              render={({ field, fieldState }) => (
                <Box>
                  <FieldLabel>Unit</FieldLabel>
                  <Units
                    size="sm"
                    {...field}
                    isDisabled={loading}
                    errorMessage={fieldState.error?.message}
                  />
                </Box>
              )}
            />
          </SimpleGrid>

          {/* Cost type / delivered / rates (only for non-scenario materials) */}
          {!isScenarioModel && (
            <>
              <Controller
                control={control}
                name="costType"
                render={({ field }) => (
                  <Box>
                    <FieldLabel>Costing Type</FieldLabel>
                    <JobsiteMaterialCostTypeForm
                      size="sm"
                      {...field}
                      isDisabled={loading}
                    />
                  </Box>
                )}
              />

              {costType === JobsiteMaterialCostType.Invoice && (
                <Flex align="center" gap={2}>
                  <Controller
                    control={control}
                    name="delivered"
                    render={({ field }) => (
                      <Checkbox
                        isChecked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        isDisabled={loading}
                      >
                        Delivered
                      </Checkbox>
                    )}
                  />
                  <InfoTooltip description="If delivered, it will be assumed that trucking is included in the invoice and it will not be reported separately." />
                </Flex>
              )}

              {costType === JobsiteMaterialCostType.Rate && (
                <Controller
                  control={control}
                  name="rates"
                  render={({ field, fieldState }) => (
                    <Box>
                      <FieldLabel>Rates</FieldLabel>
                      <JobsiteMaterialRatesForm
                        {...field}
                        rates={field.value}
                        errors={fieldState.error as any}
                        isLoading={loading}
                      />
                    </Box>
                  )}
                />
              )}

              {costType === JobsiteMaterialCostType.DeliveredRate && (
                <Controller
                  control={control}
                  name="deliveredRates"
                  render={({ field, fieldState }) => (
                    <Box>
                      <FieldLabel>Delivered Rates</FieldLabel>
                      <JobsiteMaterialDeliveredRatesForm
                        {...field}
                        deliveredRates={field.value}
                        errors={
                          fieldState.error as
                            | IJobsiteMaterialDeliveredRateError[]
                            | undefined
                        }
                        titleName="Trucking Type"
                      />
                    </Box>
                  )}
                />
              )}

              {costType === JobsiteMaterialCostType.Invoice && (
                <Center
                  py={3}
                  bg="gray.50"
                  borderRadius="md"
                  fontSize="sm"
                  color="gray.600"
                >
                  Invoices can be added after update
                </Center>
              )}
            </>
          )}

          <Flex justify="flex-end" mt={2}>
            <Button
              type="submit"
              colorScheme="blue"
              size="sm"
              isLoading={loading}
            >
              Save material
            </Button>
          </Flex>
        </Flex>
      </form>

      {isScenarioModel && (
        <Box mt={5}>
          <ScenariosList
            jobsiteMaterial={jobsiteMaterial}
            onMutated={() => {}}
            truckingRates={truckingRates}
          />
        </Box>
      )}
    </>
  );
};

export default JobsiteMaterialUpdate;
