import React from "react";

import {
  Box,
  Flex,
  SimpleGrid,
  IconButton,
  useToast,
  Text,
  Heading,
} from "@chakra-ui/react";
import {
  DailyReportFullDocument,
  DailyReportFullSnippetFragment,
  EmployeeWorkCreateData,
  useDailyReportAddTemporaryEmployeeMutation,
  useEmployeeWorkCreateMutation,
} from "../../../../../generated/graphql";
import TextField from "../../../../Common/forms/TextField";
import convertHourToDate from "../../../../../utils/convertHourToDate";
import { FiPlus, FiX } from "react-icons/fi";
import Checkbox from "../../../../Common/forms/Checkbox";
import SubmitButton from "../../../../Common/forms/SubmitButton";
import ErrorMessage from "../../../../Common/ErrorMessage";
import dayjs from "dayjs";
import isEmpty from "../../../../../utils/isEmpty";
import EmployeeSearch from "../../../../Search/EmployeeSearch";
import EmployeeWorkSelect from "../../../../Common/forms/EmployeeWorkSelect";
import { useSystem } from "../../../../../contexts/System";

type JobErrors = { jobTitle?: string; startTime?: string; endTime?: string };

type FormErrors = {
  jobs: JobErrors[];
  employees?: string;
}[];

interface IEmployeeHourCreateForm {
  dailyReport: DailyReportFullSnippetFragment;
  closeForm?: () => void;
}

const EmployeeHourCreateForm = ({
  dailyReport,
  closeForm,
}: IEmployeeHourCreateForm) => {
  const {
    state: { system },
  } = useSystem();

  const initialJob = React.useMemo(() => {
    const date = convertHourToDate(dayjs().format("HH:mm"), dailyReport.date);

    return {
      jobTitle: system?.laborTypes[0] || "",
      startTime: date,
      endTime: date,
    };
  }, [dailyReport.date, system?.laborTypes]);

  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [formData, setFormData] = React.useState<EmployeeWorkCreateData[]>([
    {
      employees: [],
      jobs: [initialJob],
    },
  ]);

  const [generalError, setGeneralError] = React.useState<string>();

  const [formErrors, setFormErrors] = React.useState<FormErrors>([]);

  const [hasTriedSubmit, setHasTriedSubmit] = React.useState(false);

  const [addTempEmployee, { loading: tempEmployeeLoading }] =
    useDailyReportAddTemporaryEmployeeMutation();

  const [create, { loading }] = useEmployeeWorkCreateMutation({
    refetchQueries: [DailyReportFullDocument],
  });

  /**
   * ----- Functions -----
   */

  const updateJobTitle = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const formDataCopy: EmployeeWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      formDataCopy[dataIndex].jobs[jobIndex].jobTitle = value;

      setFormData(formDataCopy);
    },
    [formData]
  );

  const updateStartTime = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const formDataCopy: EmployeeWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      let startTime = isEmpty(value)
        ? null
        : convertHourToDate(value, dailyReport.date);
      formDataCopy[dataIndex].jobs[jobIndex].startTime = startTime;

      setFormData(formDataCopy);
    },
    [dailyReport.date, formData]
  );

  const updateEndTime = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const formDataCopy: EmployeeWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      formDataCopy[dataIndex].jobs[jobIndex].endTime = convertHourToDate(
        value,
        dailyReport.date
      );

      setFormData(formDataCopy);
    },
    [dailyReport.date, formData]
  );

  const toggleEmployee = React.useCallback(
    (employeeId: string, dataIndex: number) => {
      const formDataCopy: EmployeeWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );

      const existingIndex = formDataCopy[dataIndex].employees.findIndex(
        (id) => id === employeeId
      );

      if (existingIndex === -1)
        formDataCopy[dataIndex].employees.push(employeeId);
      else formDataCopy[dataIndex].employees.splice(existingIndex, 1);

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
    [formData, initialJob]
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
    const formDataCopy: EmployeeWorkCreateData[] = JSON.parse(
      JSON.stringify(formData)
    );

    formDataCopy.push({
      employees: [],
      jobs: [initialJob],
    });

    setFormData(formDataCopy);
  }, [formData, setHasTriedSubmit, initialJob]);

  const removeData = React.useCallback(
    (dataIndex: number) => {
      const formDataCopy: EmployeeWorkCreateData[] = JSON.parse(
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
      let employees: string | undefined = undefined,
        jobs: JobErrors[] = [];

      for (let j = 0; j < formData[i].jobs.length; j++) {
        jobs[j] = {
          jobTitle: undefined,
          startTime: undefined,
          endTime: undefined,
        };

        if (isEmpty(formData[i].jobs[j].jobTitle)) {
          jobs[j].jobTitle = "please provide a job title";
          valid = false;
        }

        if (isEmpty(formData[i].jobs[j].startTime)) {
          jobs[j].startTime = "please provide a start time";
          valid = false;
        }

        if (isEmpty(formData[i].jobs[j].endTime)) {
          jobs[j].endTime = "please provide a end time";
          valid = false;
        }
      }

      if (formData[i].employees.length === 0) {
        employees = "please select at least one employee";
        valid = false;
      }

      formErrors[i] = {
        jobs,
        employees,
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
          p={2}
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
              <EmployeeWorkSelect
                label="Work Done"
                isDisabled={loading}
                value={job.jobTitle}
                errorMessage={formErrors[dataIndex]?.jobs[jobIndex]?.jobTitle}
                onChange={(e) =>
                  updateJobTitle(e.target.value, dataIndex, jobIndex)
                }
              />
              <SimpleGrid spacing={2} columns={[1, 1, 2]}>
                <TextField
                  label="Start Time"
                  isDisabled={loading}
                  value={job.startTime}
                  bgColor="white"
                  type="time"
                  step={900}
                  onChange={(e) =>
                    updateStartTime(e.target.value, dataIndex, jobIndex)
                  }
                  errorMessage={
                    formErrors[dataIndex]?.jobs[jobIndex]?.startTime
                  }
                />
                <TextField
                  label="End Time"
                  isDisabled={loading}
                  value={job.endTime}
                  bgColor="white"
                  type="time"
                  step={900}
                  onChange={(e) =>
                    updateEndTime(e.target.value, dataIndex, jobIndex)
                  }
                  errorMessage={formErrors[dataIndex]?.jobs[jobIndex]?.endTime}
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

          {/* EMPLOYEES */}
          <Heading ml={2} pt={2} size="sm" color="gray.600">
            Crew
          </Heading>
          {formErrors[dataIndex]?.employees && (
            <Text color="red.500">{formErrors[dataIndex]?.employees}</Text>
          )}
          <SimpleGrid columns={[2, 2, 4]} m={2} spacing={2}>
            {dailyReport.crew.employees.map((employee) => (
              <Checkbox
                isChecked={data.employees.includes(employee._id)}
                onChange={() => toggleEmployee(employee._id, dataIndex)}
                key={employee._id}
                isDisabled={loading}
              >
                {employee.name}
              </Checkbox>
            ))}
          </SimpleGrid>

          {/* TEMPORARY EMPLOYEES */}
          <Heading ml={2} pt={2} size="sm" color="gray.600">
            Temporary Employees
          </Heading>
          <Box my={2} mx={4}>
            <EmployeeSearch
              placeholder="Add temporary employee"
              employeeSelected={(employee) =>
                addTempEmployee({
                  variables: {
                    id: dailyReport._id,
                    employeeId: employee._id,
                  },
                })
              }
              isDisabled={tempEmployeeLoading}
            />
          </Box>
          <SimpleGrid columns={[2, 2, 4]} m={2} spacing={2}>
            {dailyReport.temporaryEmployees.map((employee) => (
              <Checkbox
                isChecked={data.employees.includes(employee._id)}
                onChange={() => toggleEmployee(employee._id, dataIndex)}
                key={employee._id}
                isDisabled={loading}
              >
                {employee.name}
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

export default EmployeeHourCreateForm;
