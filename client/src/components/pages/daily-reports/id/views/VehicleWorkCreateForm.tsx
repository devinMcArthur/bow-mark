import {
  Box,
  Checkbox,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Text,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiX } from "react-icons/fi";

import {
  DailyReportFullDocument,
  DailyReportFullSnippetFragment,
  useDailyReportAddTemporaryVehicleMutation,
  useVehicleWorkCreateMutation,
  VehicleWorkCreateData,
} from "../../../../../generated/graphql";
import ErrorMessage from "../../../../Common/ErrorMessage";
import SubmitButton from "../../../../Common/forms/SubmitButton";
import TextField from "../../../../Common/forms/TextField";
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

const VehicleWorkCreateForm = ({
  dailyReport,
  closeForm,
}: IVehicleWorkCreateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [formData, setFormData] = React.useState<VehicleWorkCreateData[]>([
    {
      vehicles: [],
      jobs: [initialJob],
    },
  ]);

  const [generalError, setGeneralError] = React.useState<string>();

  const [formErrors, setFormErrors] = React.useState<FormErrors>([]);

  const [hasTriedSubmit, setHasTriedSubmit] = React.useState(false);

  const [addTempVehicle, { loading: tempVehicleLoading }] =
    useDailyReportAddTemporaryVehicleMutation();

  const [create, { loading }] = useVehicleWorkCreateMutation({
    refetchQueries: [DailyReportFullDocument],
  });

  /**
   * ----- Functions -----
   */

  const updateJobTitle = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const formDataCopy: VehicleWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      formDataCopy[dataIndex].jobs[jobIndex].jobTitle = value;

      setFormData(formDataCopy);
    },
    [formData]
  );

  const updateHours = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const formDataCopy: VehicleWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      formDataCopy[dataIndex].jobs[jobIndex].hours = parseFloat(value);

      setFormData(formDataCopy);
    },
    [formData]
  );

  const toggleVehicle = React.useCallback(
    (vehicleId: string, dataIndex: number) => {
      const formDataCopy: VehicleWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      const existingIndex = formDataCopy[dataIndex].vehicles.findIndex(
        (id) => id === vehicleId
      );

      if (existingIndex === -1)
        formDataCopy[dataIndex].vehicles.push(vehicleId);
      else formDataCopy[dataIndex].vehicles.splice(existingIndex, 1);

      setFormData(formDataCopy);
    },
    [formData]
  );

  const addJob = React.useCallback(
    (dataIndex: number) => {
      setHasTriedSubmit(false);

      const formDataCopy = [...formData];

      formDataCopy[dataIndex].jobs.push(initialJob);

      setFormData(formDataCopy);
    },
    [formData]
  );

  const removeJob = React.useCallback(
    (dataIndex: number, jobIndex: number) => {
      const formDataCopy = [...formData];

      formDataCopy[dataIndex].jobs.splice(jobIndex, 1);

      setFormData(formDataCopy);
    },
    [formData]
  );

  const addData = React.useCallback(() => {
    setHasTriedSubmit(false);
    const formDataCopy: VehicleWorkCreateData[] = JSON.parse(
      JSON.stringify(formData)
    );

    formDataCopy.push({
      vehicles: [],
      jobs: [initialJob],
    });

    setFormData(formDataCopy);
  }, [formData, setHasTriedSubmit]);

  const removeData = React.useCallback(
    (dataIndex: number) => {
      const formDataCopy: VehicleWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      formDataCopy.splice(dataIndex, 1);

      setFormData(formDataCopy);
    },
    [formData]
  );

  const checkErrors = React.useCallback(() => {
    const formErrors: FormErrors = [];
    let valid = true;
    for (let i = 0; i < formData.length; i++) {
      let vehicles: string | undefined = undefined,
        jobs: JobErrors[] = [];

      for (let j = 0; j < formData[i].jobs.length; j++) {
        jobs[j] = {
          jobTitle: undefined,
          hours: undefined,
        };

        if (!formData[i].jobs[j].hours) {
          jobs[j].hours = "please provide hours";
          valid = false;
        }
      }

      if (formData[i].vehicles.length === 0) {
        vehicles = "please select at least one vehicle";
        valid = false;
      }

      formErrors[i] = {
        jobs,
        vehicles,
      };
    }

    setFormErrors(formErrors);

    return valid;
  }, [formData]);

  const trySubmit = React.useCallback(() => {
    setHasTriedSubmit(true);

    if (checkErrors())
      create({
        variables: {
          dailyReportId: dailyReport._id,
          data: formData,
        },
      })
        .then(() => {
          toast({
            isClosable: true,
            description: "Successfully added employee work",
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
        <Box
          key={dataIndex}
          backgroundColor="gray.200"
          borderRadius={4}
          pr={2}
          py={2}
          m={2}
        >
          {formData.length > 1 && (
            <Flex justifyContent="end">
              <IconButton
                p={0}
                icon={<FiX />}
                aria-label="remove"
                onClick={() => removeData(dataIndex)}
                backgroundColor="transparent"
                right={0}
                isLoading={loading}
              />
            </Flex>
          )}

          {/* JOBS */}
          {data.jobs.map((job, jobIndex) => (
            <Box
              key={`${dataIndex}-${jobIndex}`}
              backgroundColor="gray.300"
              borderRadius={4}
              p={2}
              m={2}
            >
              {data.jobs.length > 1 && (
                <Flex justifyContent="end">
                  <IconButton
                    p={0}
                    icon={<FiX />}
                    aria-label="remove"
                    onClick={() => removeJob(dataIndex, jobIndex)}
                    backgroundColor="transparent"
                    isLoading={loading}
                  />
                </Flex>
              )}
              <SimpleGrid columns={[1, 1, 2]} spacing={2}>
                <TextField
                  label="Hours"
                  isDisabled={loading}
                  value={job.hours}
                  type="number"
                  bgColor="white"
                  errorMessage={formErrors[dataIndex]?.jobs[jobIndex]?.hours}
                  onChange={(e) =>
                    updateHours(e.target.value, dataIndex, jobIndex)
                  }
                />
                <TextField
                  label="Work Done (Optional)"
                  isDisabled={loading}
                  value={job.jobTitle || ""}
                  bgColor="white"
                  errorMessage={formErrors[dataIndex]?.jobs[jobIndex]?.jobTitle}
                  onChange={(e) =>
                    updateJobTitle(e.target.value, dataIndex, jobIndex)
                  }
                />
              </SimpleGrid>
            </Box>
          ))}
          <Box w="100%" px={2}>
            <IconButton
              w="100%"
              icon={<FiPlus />}
              aria-label="add-job"
              onClick={() => addJob(dataIndex)}
              backgroundColor="gray.300"
              isLoading={loading}
            />
          </Box>

          {/* VEHICLES */}
          <Heading ml={2} pt={2} size="sm" color="gray.600">
            Crew
          </Heading>
          {formErrors[dataIndex]?.vehicles && (
            <Text color="red.500">{formErrors[dataIndex]?.vehicles}</Text>
          )}
          <SimpleGrid columns={[2, 2, 4]} m={2} spacing={2}>
            {dailyReport.crew.vehicles.map((vehicle) => (
              <Checkbox
                key={vehicle._id}
                isChecked={data.vehicles.includes(vehicle._id)}
                onChange={() => toggleVehicle(vehicle._id, dataIndex)}
                isDisabled={loading}
              >
                {vehicle.name}
              </Checkbox>
            ))}
          </SimpleGrid>

          {/* TEMPORARY VEHICLES */}
          <Heading ml={2} pt={2} size="sm" color="gray.600">
            Temporary Vehicles
          </Heading>
          <Box my={2} mx={4}>
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
          <SimpleGrid columns={[2, 2, 4]} m={2} spacing={2}>
            {dailyReport.temporaryVehicles.map((vehicle) => (
              <Checkbox
                isChecked={data.vehicles.includes(vehicle._id)}
                onChange={() => toggleVehicle(vehicle._id, dataIndex)}
                key={vehicle._id}
                isDisabled={loading}
              >
                {vehicle.name}
              </Checkbox>
            ))}
          </SimpleGrid>
        </Box>
      ))}

      <Box w="100%" px={2}>
        <IconButton
          w="100%"
          icon={<FiPlus />}
          aria-label="add-data"
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

export default VehicleWorkCreateForm;
