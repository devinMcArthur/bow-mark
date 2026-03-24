import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  FormLabel,
  IconButton,
  Select,
  SimpleGrid,
  Text,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiPlus, FiTrash } from "react-icons/fi";

import { useJobsiteMaterialCreateForm } from "../../../forms/jobsiteMaterial";
import {
  JobsiteMaterialCostModel,
  JobsiteMaterialCostType,
  JobsiteMaterialCreateData,
  useJobsiteAddMaterialMutation,
} from "../../../generated/graphql";
import InfoTooltip from "../../Common/Info";
import SubmitButton from "../../Common/forms/SubmitButton";
import FormContainer from "../../Common/FormContainer";
import { emptyDraft, ScenarioDraft, ScenarioForm } from "./ScenariosList";

type CreateCostMode = "rateScenario" | "invoice";

interface IJobsiteMaterialCreate {
  jobsiteId: string;
  onSuccess?: () => void;
  truckingRates?: { title: string }[];
}

const JobsiteMaterialCreate = ({
  jobsiteId,
  onSuccess,
  truckingRates,
}: IJobsiteMaterialCreate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents, setValue } = useJobsiteMaterialCreateForm();

  const [create, { loading }] = useJobsiteAddMaterialMutation();

  const [costMode, setCostMode] = React.useState<CreateCostMode>("rateScenario");
  const [scenarios, setScenarios] = React.useState<ScenarioDraft[]>([]);
  const [addingScenario, setAddingScenario] = React.useState(false);
  const [newDraft, setNewDraft] = React.useState<ScenarioDraft>(emptyDraft());
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState<ScenarioDraft>(emptyDraft());

  /**
   * ----- Use-effects and other logic -----
   */

  // Keep the form's internal costType in sync so validation passes and
  // FormComponents.Delivered shows/hides correctly for invoice mode.
  React.useEffect(() => {
    setValue(
      "costType",
      costMode === "invoice"
        ? JobsiteMaterialCostType.Invoice
        : JobsiteMaterialCostType.Rate
    );
  }, [costMode, setValue]);

  /**
   * ----- Functions -----
   */

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

  const handleSubmit = React.useCallback(
    async (data: JobsiteMaterialCreateData) => {
      try {
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
      } catch (e: any) {
        toast({
          status: "error",
          title: "Error",
          description: e.message,
          isClosable: true,
        });
      }
    },
    [costMode, create, jobsiteId, onSuccess, scenarios, toast]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <>
      <FormComponents.Form submitHandler={handleSubmit}>
        <SimpleGrid spacing={2} columns={[1, 1, 2]}>
          <FormComponents.Material isLoading={loading} />
          <FormComponents.Supplier isLoading={loading} />
        </SimpleGrid>
        <SimpleGrid spacing={2} columns={[1, 1, 2]}>
          <FormComponents.Quantity isLoading={loading} />
          <FormComponents.Unit isLoading={loading} />
        </SimpleGrid>

        {/* Costing mode selector */}
        <Box mt={2}>
          <FormLabel mb={1} fontSize="sm">
            Costing Type
          </FormLabel>
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

        {/* Invoice mode */}
        {costMode === "invoice" && (
          <>
            <FormComponents.Delivered isLoading={loading} />
            <InfoTooltip
              mx={1}
              description="If delivered, it will be assumed that trucking is included in the invoice and it will not be reported separately."
            />
            <Center mt={2}>
              <Text fontWeight="bold" color="gray.600">
                Invoices can be added after creation
              </Text>
            </Center>
          </>
        )}

        <SubmitButton isLoading={loading} />
      </FormComponents.Form>

      {/* Rate Scenarios mode — outside the form to prevent focus loss on re-render */}
      {costMode === "rateScenario" && (
        <Box mt={2}>
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
              <FormContainer key={idx} border="1px solid" borderColor="gray.300" p={2} mt={1}>
                <Flex justifyContent="space-between" alignItems="center">
                  <Flex alignItems="center" gap={2}>
                    <Text fontWeight="semibold">{scenario.label}</Text>
                    {scenario.delivered && (
                      <Badge colorScheme="green">Delivered</Badge>
                    )}
                  </Flex>
                  <Flex gap={1}>
                    <IconButton
                      size="sm"
                      aria-label="edit scenario"
                      icon={<FiEdit />}
                      backgroundColor="transparent"
                      onClick={() => {
                        setEditDraft(scenario);
                        setEditingIdx(idx);
                      }}
                    />
                    <IconButton
                      size="sm"
                      aria-label="remove scenario"
                      icon={<FiTrash />}
                      backgroundColor="transparent"
                      onClick={() => handleRemoveScenario(idx)}
                    />
                  </Flex>
                </Flex>
                {scenario.rates.length > 0 && (
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {scenario.rates.length} rate{scenario.rates.length > 1 ? "s" : ""} · latest ${scenario.rates[scenario.rates.length - 1]?.rate}/t
                  </Text>
                )}
              </FormContainer>
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
            <Flex justifyContent="flex-end" mt={2}>
              <Button
                size="sm"
                leftIcon={<FiPlus />}
                onClick={() => setAddingScenario(true)}
              >
                Add Scenario
              </Button>
            </Flex>
          )}
        </Box>
      )}
    </>
  );
};

export default JobsiteMaterialCreate;
