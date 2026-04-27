import {
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Flex,
  IconButton,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Text,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import { Controller } from "react-hook-form";
import { FiEdit, FiPlus, FiTrash2 } from "react-icons/fi";

import { useJobsiteMaterialCreateForm } from "../../../forms/jobsiteMaterial";
import {
  JobsiteMaterialCostModel,
  JobsiteMaterialCostType,
  JobsiteMaterialCreateData,
  useJobsiteAddMaterialMutation,
} from "../../../generated/graphql";
import InfoTooltip from "../../Common/Info";
import MaterialSearch from "../../Search/MaterialSearch";
import CompanySearch from "../../Search/CompanySearch";
import Units from "../../Common/forms/Unit";
import {
  formatThousands,
  parseThousands,
  THOUSANDS_PATTERN,
} from "../../../utils/numberFormat";
import { emptyDraft, ScenarioDraft, ScenarioForm } from "./ScenariosList";

type CreateCostMode = "rateScenario" | "invoice";

interface IJobsiteMaterialCreate {
  jobsiteId: string;
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

const JobsiteMaterialCreate = ({
  jobsiteId,
  onSuccess,
  truckingRates,
}: IJobsiteMaterialCreate) => {
  const toast = useToast();
  const { handleSubmit, control, setValue } = useJobsiteMaterialCreateForm();
  const [create, { loading }] = useJobsiteAddMaterialMutation();

  const [costMode, setCostMode] =
    React.useState<CreateCostMode>("rateScenario");
  const [scenarios, setScenarios] = React.useState<ScenarioDraft[]>([]);
  const [addingScenario, setAddingScenario] = React.useState(false);
  const [newDraft, setNewDraft] = React.useState<ScenarioDraft>(emptyDraft());
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState<ScenarioDraft>(emptyDraft());

  // Keep the form's internal costType in sync so validation passes and
  // the Delivered field shows/hides correctly for invoice mode.
  React.useEffect(() => {
    setValue(
      "costType",
      costMode === "invoice"
        ? JobsiteMaterialCostType.Invoice
        : JobsiteMaterialCostType.Rate
    );
  }, [costMode, setValue]);

  const handleAddScenario = React.useCallback(() => {
    setScenarios((prev) => [...prev, newDraft]);
    setNewDraft(emptyDraft());
    setAddingScenario(false);
  }, [newDraft]);

  const handleSaveEdit = React.useCallback(() => {
    if (editingIdx === null) return;
    setScenarios((prev) => {
      const next = [...prev];
      next[editingIdx] = editDraft;
      return next;
    });
    setEditingIdx(null);
  }, [editDraft, editingIdx]);

  const handleRemoveScenario = React.useCallback((idx: number) => {
    setScenarios((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const onSubmit = React.useCallback(
    async (data: JobsiteMaterialCreateData) => {
      try {
        if (costMode === "rateScenario") {
          const invalid = scenarios.find((s) => s.delivered && !s.label);
          if (invalid) {
            toast({
              status: "error",
              title: "Missing trucking type",
              description:
                "A delivered scenario must have a trucking type selected.",
              isClosable: true,
            });
            return;
          }
        }
        const submitData: JobsiteMaterialCreateData =
          costMode === "rateScenario"
            ? {
                ...data,
                costType: JobsiteMaterialCostType.Rate,
                costModel: JobsiteMaterialCostModel.Rate,
                rates: [],
                deliveredRates: [],
                scenarios: scenarios.map(({ label, delivered, rates }) => ({
                  label,
                  delivered,
                  rates: rates.map(({ date, rate, estimated }) => ({
                    date,
                    rate,
                    estimated,
                  })),
                })),
              }
            : data;

        const res = await create({
          variables: { jobsiteId, data: submitData },
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
      } catch (e) {
        toast({
          status: "error",
          title: "Error",
          description: e instanceof Error ? e.message : "Unknown error",
          isClosable: true,
        });
      }
    },
    [costMode, create, jobsiteId, onSuccess, scenarios, toast]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Flex direction="column" gap={3}>
        {/* Material + Supplier */}
        <SimpleGrid columns={[1, 1, 2]} spacing={3}>
          <Controller
            control={control}
            name="materialId"
            render={({ field, fieldState }) => (
              <Box>
                <FieldLabel>Material</FieldLabel>
                <MaterialSearch
                  {...field}
                  isDisabled={loading}
                  materialSelected={(material) =>
                    setValue("materialId", material._id)
                  }
                />
                <FieldError message={fieldState.error?.message} />
              </Box>
            )}
          />
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
        </SimpleGrid>

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
                  pattern={THOUSANDS_PATTERN}
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

        {/* Costing mode */}
        <Box>
          <FieldLabel>Costing Type</FieldLabel>
          <Select
            size="sm"
            value={costMode}
            onChange={(e) => setCostMode(e.target.value as CreateCostMode)}
            isDisabled={loading}
          >
            <option value="rateScenario">Rate Scenarios</option>
            <option value="invoice">Invoices</option>
          </Select>
        </Box>

        {/* Invoice mode meta */}
        {costMode === "invoice" && (
          <>
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
            <Center
              py={3}
              bg="gray.50"
              borderRadius="md"
              fontSize="sm"
              color="gray.600"
            >
              Invoices can be added after creation
            </Center>
          </>
        )}

        {/* Rate Scenarios — rendered inside the form so save triggers include
            the scenario list. Kept above the submit button. */}
        {costMode === "rateScenario" && (
          <Box>
            <FieldLabel>Rate Scenarios</FieldLabel>
            <Flex direction="column" gap={2}>
              {scenarios.map((scenario, idx) =>
                editingIdx === idx ? (
                  <ScenarioForm
                    key={idx}
                    draft={editDraft}
                    onChange={setEditDraft}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingIdx(null)}
                    isLoading={false}
                    truckingRates={truckingRates}
                  />
                ) : (
                  <Box
                    key={idx}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    p={3}
                  >
                    <Flex justifyContent="space-between" alignItems="center">
                      <Flex alignItems="center" gap={2}>
                        <Text fontWeight="semibold">{scenario.label}</Text>
                        {scenario.delivered && (
                          <Badge colorScheme="green" variant="subtle">
                            Delivered
                          </Badge>
                        )}
                      </Flex>
                      <Flex gap={1}>
                        <IconButton
                          size="xs"
                          aria-label="edit scenario"
                          icon={<FiEdit />}
                          variant="ghost"
                          onClick={() => {
                            setEditDraft(scenario);
                            setEditingIdx(idx);
                          }}
                        />
                        <IconButton
                          size="xs"
                          aria-label="remove scenario"
                          icon={<FiTrash2 />}
                          variant="ghost"
                          color="gray.500"
                          onClick={() => handleRemoveScenario(idx)}
                        />
                      </Flex>
                    </Flex>
                    {scenario.rates.length > 0 && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {scenario.rates.length} rate
                        {scenario.rates.length > 1 ? "s" : ""} · latest $
                        {scenario.rates[scenario.rates.length - 1]?.rate}/t
                      </Text>
                    )}
                  </Box>
                )
              )}

              {addingScenario ? (
                <ScenarioForm
                  draft={newDraft}
                  onChange={setNewDraft}
                  onSave={handleAddScenario}
                  onCancel={() => {
                    setAddingScenario(false);
                    setNewDraft(emptyDraft());
                  }}
                  isLoading={false}
                  truckingRates={truckingRates}
                />
              ) : (
                <Flex justifyContent="flex-start">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<FiPlus />}
                    onClick={() => setAddingScenario(true)}
                  >
                    Add scenario
                  </Button>
                </Flex>
              )}
            </Flex>
          </Box>
        )}

        <Flex justify="flex-end" mt={2}>
          <Button
            type="submit"
            colorScheme="blue"
            size="sm"
            isLoading={loading}
          >
            Create material
          </Button>
        </Flex>
      </Flex>
    </form>
  );
};

export default JobsiteMaterialCreate;
