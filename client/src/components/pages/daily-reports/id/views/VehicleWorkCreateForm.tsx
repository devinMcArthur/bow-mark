import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  Text,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import {
  FiCheckSquare,
  FiPlus,
  FiSquare,
  FiTrash2,
} from "react-icons/fi";

import {
  DailyReportFullDocument,
  DailyReportFullSnippetFragment,
  useDailyReportAddTemporaryVehicleMutation,
  useVehicleWorkCreateMutation,
  VehicleWorkCreateData,
} from "../../../../../generated/graphql";
import ErrorMessage from "../../../../Common/ErrorMessage";
import VehicleSearch from "../../../../Search/VehicleSearch";

type JobErrors = { jobTitle?: string; hours?: string };

type FormErrors = {
  jobs: JobErrors[];
  vehicles?: string;
}[];

interface IVehicleWorkCreateForm {
  dailyReport: DailyReportFullSnippetFragment;
  closeForm?: () => void;
}

const initialJob = {
  jobTitle: "",
  hours: 1,
};

/** Compact uppercase label shared across polished forms. */
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

/**
 * Chip-style selector for vehicles — same pattern used for crew
 * selection in EmployeeHourCreateForm. Leading checkbox icon surfaces
 * the multi-select behavior; vehicle code is bolded ahead of the name
 * so the identifier you'd shout across a yard ("T-12!") pops first.
 */
const VehicleToggle: React.FC<{
  name: string;
  vehicleCode?: string | null;
  checked: boolean;
  onToggle: () => void;
  isDisabled?: boolean;
}> = ({ name, vehicleCode, checked, onToggle, isDisabled }) => (
  <Button
    onClick={onToggle}
    isDisabled={isDisabled}
    size="sm"
    w="100%"
    h="auto"
    minH="32px"
    py={1.5}
    whiteSpace="normal"
    textAlign="left"
    variant={checked ? "solid" : "outline"}
    colorScheme={checked ? "blue" : "gray"}
    justifyContent="flex-start"
    fontWeight="normal"
    bg={checked ? undefined : "white"}
    leftIcon={checked ? <FiCheckSquare /> : <FiSquare />}
    iconSpacing={2}
  >
    <Text as="span">
      {vehicleCode && (
        <Text as="span" fontWeight="bold">
          {vehicleCode}
        </Text>
      )}
      {vehicleCode && name ? " " : null}
      {name}
    </Text>
  </Button>
);

const VehicleWorkCreateForm = ({
  dailyReport,
  closeForm,
}: IVehicleWorkCreateForm) => {
  const toast = useToast();

  const [formData, setFormData] = React.useState<VehicleWorkCreateData[]>([
    { vehicles: [], jobs: [initialJob] },
  ]);
  const [generalError, setGeneralError] = React.useState<string>();
  const [formErrors, setFormErrors] = React.useState<FormErrors>([]);
  const [hasTriedSubmit, setHasTriedSubmit] = React.useState(false);

  const [addTempVehicle, { loading: tempVehicleLoading }] =
    useDailyReportAddTemporaryVehicleMutation();

  const [create, { loading }] = useVehicleWorkCreateMutation({
    refetchQueries: [DailyReportFullDocument],
  });

  const updateJobTitle = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const copy: VehicleWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      copy[dataIndex].jobs[jobIndex].jobTitle = value;
      setFormData(copy);
    },
    [formData]
  );

  const updateHours = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const copy: VehicleWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      copy[dataIndex].jobs[jobIndex].hours = parseFloat(value);
      setFormData(copy);
    },
    [formData]
  );

  const toggleVehicle = React.useCallback(
    (vehicleId: string, dataIndex: number) => {
      const copy: VehicleWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      const idx = copy[dataIndex].vehicles.findIndex((id) => id === vehicleId);
      if (idx === -1) copy[dataIndex].vehicles.push(vehicleId);
      else copy[dataIndex].vehicles.splice(idx, 1);
      setFormData(copy);
    },
    [formData]
  );

  const addJob = React.useCallback(
    (dataIndex: number) => {
      setHasTriedSubmit(false);
      const copy = [...formData];
      copy[dataIndex].jobs.push(initialJob);
      setFormData(copy);
    },
    [formData]
  );

  const removeJob = React.useCallback(
    (dataIndex: number, jobIndex: number) => {
      const copy = [...formData];
      copy[dataIndex].jobs.splice(jobIndex, 1);
      setFormData(copy);
    },
    [formData]
  );

  const addData = React.useCallback(() => {
    setHasTriedSubmit(false);
    const copy: VehicleWorkCreateData[] = JSON.parse(JSON.stringify(formData));
    copy.push({ vehicles: [], jobs: [initialJob] });
    setFormData(copy);
  }, [formData]);

  const removeData = React.useCallback(
    (dataIndex: number) => {
      const copy: VehicleWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      copy.splice(dataIndex, 1);
      setFormData(copy);
    },
    [formData]
  );

  const checkErrors = React.useCallback(() => {
    const errs: FormErrors = [];
    let valid = true;
    for (let i = 0; i < formData.length; i++) {
      let vehicles: string | undefined;
      const jobs: JobErrors[] = [];
      for (let j = 0; j < formData[i].jobs.length; j++) {
        jobs[j] = {};
        if (!formData[i].jobs[j].hours) {
          jobs[j].hours = "please provide hours";
          valid = false;
        }
      }
      if (formData[i].vehicles.length === 0) {
        vehicles = "please select at least one vehicle";
        valid = false;
      }
      errs[i] = { jobs, vehicles };
    }
    setFormErrors(errs);
    return valid;
  }, [formData]);

  const trySubmit = React.useCallback(() => {
    setHasTriedSubmit(true);
    if (!checkErrors()) return;
    create({
      variables: { dailyReportId: dailyReport._id, data: formData },
    })
      .then(() => {
        toast({
          isClosable: true,
          description: "Successfully added vehicle work",
          status: "success",
          title: "Success",
        });
        setGeneralError(undefined);
        if (closeForm) closeForm();
      })
      .catch((err) => {
        setGeneralError(err.message);
      });
  }, [checkErrors, create, dailyReport._id, formData, toast, closeForm]);

  React.useEffect(() => {
    if (hasTriedSubmit) checkErrors();
  }, [formData, hasTriedSubmit, checkErrors]);

  return (
    // Accent-tinted wrapper — purple for equipment/vehicle hours.
    <Box bg="purple.50" p={1} borderRadius="md" my={2}>
      <Flex direction="column" gap={4}>
        {generalError && <ErrorMessage description={generalError} />}

      {formData.map((data, dataIndex) => (
        <Box
          key={dataIndex}
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={3}
          bg="white"
        >
          {formData.length > 1 && (
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500">
                GROUP #{dataIndex + 1}
              </Text>
              <IconButton
                aria-label="Remove group"
                icon={<FiTrash2 />}
                size="sm"
                variant="ghost"
                color="gray.500"
                onClick={() => removeData(dataIndex)}
                isLoading={loading}
              />
            </Flex>
          )}

          {/* Jobs */}
          <SectionLabel>Jobs</SectionLabel>
          <Flex direction="column" gap={3}>
            {data.jobs.map((job, jobIndex) => (
              <Box
                key={`${dataIndex}-${jobIndex}`}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                bg="gray.50"
                p={3}
              >
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontSize="xs" color="gray.500">
                    Job {jobIndex + 1}
                  </Text>
                  {data.jobs.length > 1 && (
                    <IconButton
                      aria-label="Remove job"
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      color="gray.500"
                      onClick={() => removeJob(dataIndex, jobIndex)}
                      isLoading={loading}
                    />
                  )}
                </Flex>

                <SimpleGrid columns={[1, 2]} spacing={3}>
                  <Box>
                    <FieldLabel>Hours</FieldLabel>
                    <NumberInput
                      min={0}
                      precision={2}
                      value={job.hours?.toString() ?? ""}
                      isDisabled={loading}
                      isInvalid={
                        !!formErrors[dataIndex]?.jobs[jobIndex]?.hours
                      }
                      onChange={(valueAsString) =>
                        updateHours(valueAsString, dataIndex, jobIndex)
                      }
                      w="100%"
                    >
                      <NumberInputField bg="white" />
                    </NumberInput>
                    {formErrors[dataIndex]?.jobs[jobIndex]?.hours && (
                      <Text fontSize="xs" color="red.500" mt={1}>
                        {formErrors[dataIndex]?.jobs[jobIndex]?.hours}
                      </Text>
                    )}
                  </Box>
                  <Box>
                    <FieldLabel>Work done (optional)</FieldLabel>
                    <Input
                      value={job.jobTitle || ""}
                      bg="white"
                      isDisabled={loading}
                      onChange={(e) =>
                        updateJobTitle(e.target.value, dataIndex, jobIndex)
                      }
                    />
                  </Box>
                </SimpleGrid>
              </Box>
            ))}
          </Flex>

          <Button
            mt={3}
            w="100%"
            variant="outline"
            bg="white"
            leftIcon={<FiPlus />}
            onClick={() => addJob(dataIndex)}
            isLoading={loading}
          >
            Add job
          </Button>

          {/* Vehicles */}
          <Box mt={5}>
            <SectionLabel>Vehicles</SectionLabel>
            {formErrors[dataIndex]?.vehicles && (
              <Text color="red.500" fontSize="sm" mb={2}>
                {formErrors[dataIndex]?.vehicles}
              </Text>
            )}
            <SimpleGrid columns={2} spacing={2}>
              {dailyReport.crew.vehicles.map((vehicle) => (
                <VehicleToggle
                  key={vehicle._id}
                  name={vehicle.name}
                  vehicleCode={vehicle.vehicleCode}
                  checked={data.vehicles.includes(vehicle._id)}
                  onToggle={() => toggleVehicle(vehicle._id, dataIndex)}
                  isDisabled={loading}
                />
              ))}
            </SimpleGrid>
          </Box>

          {/* Temporary Vehicles */}
          <Box mt={5}>
            <SectionLabel>Temporary vehicles</SectionLabel>
            <Box mb={3}>
              <VehicleSearch
                placeholder="Add temporary vehicle"
                vehicleSelected={(vehicle) =>
                  addTempVehicle({
                    variables: {
                      id: dailyReport._id,
                      vehicleId: vehicle._id,
                    },
                  })
                }
                isDisabled={tempVehicleLoading}
              />
            </Box>
            {dailyReport.temporaryVehicles.length > 0 && (
              <SimpleGrid columns={2} spacing={2}>
                {dailyReport.temporaryVehicles.map((vehicle) => (
                  <VehicleToggle
                    key={vehicle._id}
                    name={vehicle.name}
                    checked={data.vehicles.includes(vehicle._id)}
                    onToggle={() => toggleVehicle(vehicle._id, dataIndex)}
                    isDisabled={loading}
                  />
                ))}
              </SimpleGrid>
            )}
          </Box>
        </Box>
      ))}

      <Button
        w="100%"
        variant="outline"
        bg="white"
        leftIcon={<FiPlus />}
        onClick={addData}
        isLoading={loading}
      >
        Add vehicle group
      </Button>

      <Button
        w="100%"
        colorScheme="blue"
        onClick={trySubmit}
        isLoading={loading}
      >
        Save vehicle hours
      </Button>
      </Flex>
    </Box>
  );
};

export default VehicleWorkCreateForm;
