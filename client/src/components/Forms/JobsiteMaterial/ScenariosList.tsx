import React from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  IconButton,
  Input,
  Select,
  Text,
  useToast,
} from "@chakra-ui/react";
import { FiCheck, FiEdit, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import {
  JobsiteMaterialCardSnippetFragment,
  RateScenarioClass,
  useJobsiteMaterialScenarioAddMutation,
  useJobsiteMaterialScenarioRemoveMutation,
  useJobsiteMaterialScenarioUpdateMutation,
} from "../../../generated/graphql";
import JobsiteMaterialRatesForm from "./Rates";

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

export interface ScenarioDraft {
  label: string;
  delivered: boolean;
  rates: { date: any; rate: number; estimated: boolean }[];
}

export const emptyDraft = (): ScenarioDraft => ({
  label: "Pickup",
  delivered: false,
  rates: [{ date: new Date().toISOString().split("T")[0], rate: 0, estimated: false }],
});

interface IScenarioForm {
  draft: ScenarioDraft;
  onChange: (draft: ScenarioDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
  truckingRates?: { title: string }[];
}

export const ScenarioForm = ({
  draft,
  onChange,
  onSave,
  onCancel,
  isLoading,
  truckingRates,
}: IScenarioForm) => (
  <Box
    borderWidth="1px"
    borderColor="blue.300"
    borderRadius="md"
    bg="blue.50"
    p={3}
  >
    <Flex direction="column" gap={3}>
      <Checkbox
        isChecked={draft.delivered}
        onChange={(e) => {
          const delivered = e.target.checked;
          onChange({ ...draft, delivered, label: delivered ? "" : "Pickup" });
        }}
        isDisabled={isLoading}
      >
        Delivered (trucking included in rate)
      </Checkbox>
      {draft.delivered && (
        <Box>
          <FieldLabel>Trucking Type</FieldLabel>
          {truckingRates && truckingRates.length > 0 ? (
            <Select
              size="sm"
              value={draft.label}
              onChange={(e) => onChange({ ...draft, label: e.target.value })}
              isDisabled={isLoading}
              backgroundColor="white"
            >
              <option value="">Select type</option>
              {truckingRates.map((r) => (
                <option key={r.title} value={r.title}>
                  {r.title}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              size="sm"
              value={draft.label}
              onChange={(e) => onChange({ ...draft, label: e.target.value })}
              placeholder="e.g. Tandem Delivered, T&P Delivered"
              isDisabled={isLoading}
              backgroundColor="white"
            />
          )}
        </Box>
      )}
      <Box>
        <FieldLabel>Rates</FieldLabel>
        <JobsiteMaterialRatesForm
          rates={draft.rates as any}
          onChange={(rates) => onChange({ ...draft, rates: rates as any })}
          isLoading={isLoading}
        />
      </Box>
      <Flex justifyContent="flex-end" gap={2} mt={1}>
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<FiX />}
          onClick={onCancel}
          isDisabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          colorScheme="blue"
          leftIcon={<FiCheck />}
          onClick={onSave}
          isLoading={isLoading}
          isDisabled={draft.delivered && !draft.label}
        >
          Save scenario
        </Button>
      </Flex>
    </Flex>
  </Box>
);

interface IScenarioCard {
  scenario: RateScenarioClass;
  jobsiteMaterialId: string;
  onMutated: (updated: JobsiteMaterialCardSnippetFragment) => void;
  truckingRates?: { title: string }[];
}

const ScenarioCard = ({ scenario, jobsiteMaterialId, onMutated, truckingRates }: IScenarioCard) => {
  const toast = useToast();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<ScenarioDraft>({
    label: scenario.label,
    delivered: scenario.delivered,
    rates: scenario.rates as any,
  });

  const [update, { loading: updateLoading }] = useJobsiteMaterialScenarioUpdateMutation();
  const [remove, { loading: removeLoading }] = useJobsiteMaterialScenarioRemoveMutation();

  const handleSave = React.useCallback(async () => {
    try {
      const res = await update({
        variables: {
          id: jobsiteMaterialId,
          scenarioId: scenario._id,
          data: {
            label: draft.label,
            delivered: draft.delivered,
            rates: draft.rates.map(({ date, rate, estimated }) => ({
              date,
              rate,
              estimated,
            })),
          },
        },
      });
      if (res.data?.jobsiteMaterialScenarioUpdate) {
        onMutated(res.data.jobsiteMaterialScenarioUpdate as any);
        setEditing(false);
      }
    } catch (e: any) {
      toast({ status: "error", title: "Error", description: e.message, isClosable: true });
    }
  }, [draft, jobsiteMaterialId, onMutated, scenario._id, toast, update]);

  const handleRemove = React.useCallback(async () => {
    if (!window.confirm(`Remove scenario "${scenario.label}"?`)) return;
    try {
      const res = await remove({
        variables: { id: jobsiteMaterialId, scenarioId: scenario._id },
      });
      if (res.data?.jobsiteMaterialScenarioRemove) {
        onMutated(res.data.jobsiteMaterialScenarioRemove as any);
      }
    } catch (e: any) {
      toast({ status: "error", title: "Error", description: e.message, isClosable: true });
    }
  }, [jobsiteMaterialId, onMutated, remove, scenario._id, scenario.label, toast]);

  if (editing) {
    return (
      <ScenarioForm
        draft={draft}
        onChange={setDraft}
        onSave={handleSave}
        onCancel={() => {
          setDraft({ label: scenario.label, delivered: scenario.delivered, rates: scenario.rates as any });
          setEditing(false);
        }}
        isLoading={updateLoading}
        truckingRates={truckingRates}
      />
    );
  }

  return (
    <Box
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
            onClick={() => setEditing(true)}
          />
          <IconButton
            size="xs"
            aria-label="remove scenario"
            icon={<FiTrash2 />}
            variant="ghost"
            color="gray.500"
            onClick={handleRemove}
            isLoading={removeLoading}
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
  );
};

interface IScenariosListProps {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  onMutated: (updated: JobsiteMaterialCardSnippetFragment) => void;
  truckingRates?: { title: string }[];
}

const ScenariosList = ({ jobsiteMaterial, onMutated, truckingRates }: IScenariosListProps) => {
  const toast = useToast();
  const [adding, setAdding] = React.useState(false);
  const [addDraft, setAddDraft] = React.useState<ScenarioDraft>(emptyDraft());

  const [add, { loading: addLoading }] = useJobsiteMaterialScenarioAddMutation();

  const handleAdd = React.useCallback(async () => {
    try {
      const res = await add({
        variables: {
          id: jobsiteMaterial._id,
          data: {
            label: addDraft.label,
            delivered: addDraft.delivered,
            rates: addDraft.rates.map(({ date, rate, estimated }) => ({
              date,
              rate,
              estimated,
            })),
          },
        },
      });
      if (res.data?.jobsiteMaterialScenarioAdd) {
        onMutated(res.data.jobsiteMaterialScenarioAdd as any);
        setAdding(false);
        setAddDraft(emptyDraft());
      }
    } catch (e: any) {
      toast({ status: "error", title: "Error", description: e.message, isClosable: true });
    }
  }, [add, addDraft, jobsiteMaterial._id, onMutated, toast]);

  const scenarios = jobsiteMaterial.scenarios ?? [];

  return (
    <Box>
      <Heading
        fontSize="xs"
        fontWeight="semibold"
        color="gray.500"
        textTransform="uppercase"
        letterSpacing="wide"
        mb={2}
      >
        Rate Scenarios
      </Heading>

      {scenarios.length === 0 && !adding && (
        <Text color="gray.500" fontSize="sm" mb={2}>
          No scenarios yet — add one below.
        </Text>
      )}

      <Flex direction="column" gap={2}>
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario._id}
            scenario={scenario}
            jobsiteMaterialId={jobsiteMaterial._id}
            onMutated={onMutated}
            truckingRates={truckingRates}
          />
        ))}

        {adding ? (
          <ScenarioForm
            draft={addDraft}
            onChange={setAddDraft}
            onSave={handleAdd}
            onCancel={() => {
              setAdding(false);
              setAddDraft(emptyDraft());
            }}
            isLoading={addLoading}
            truckingRates={truckingRates}
          />
        ) : (
          <Flex justifyContent="flex-start" mt={1}>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FiPlus />}
              onClick={() => setAdding(true)}
            >
              Add scenario
            </Button>
          </Flex>
        )}
      </Flex>
    </Box>
  );
};

export default ScenariosList;
