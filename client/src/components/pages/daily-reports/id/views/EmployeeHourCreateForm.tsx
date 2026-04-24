import React from "react";

import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  SimpleGrid,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  DailyReportFullDocument,
  DailyReportFullSnippetFragment,
  EmployeeWorkCreateData,
  useDailyReportAddTemporaryEmployeeMutation,
  useEmployeeWorkCreateMutation,
} from "../../../../../generated/graphql";
import convertHourToDate from "../../../../../utils/convertHourToDate";
import { FiCheckSquare, FiPlus, FiSquare, FiTrash2 } from "react-icons/fi";
import EmployeeWorkSelect from "../../../../Common/forms/EmployeeWorkSelect";
import EmployeeSearch from "../../../../Search/EmployeeSearch";
import ErrorMessage from "../../../../Common/ErrorMessage";
import dayjs from "dayjs";
import isEmpty from "../../../../../utils/isEmpty";
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

/** Format a Date (or date-string) as HH:mm for <input type="time">. */
const toTimeInputValue = (val: Date | string | null | undefined): string => {
  if (!val) return "";
  const str = val instanceof Date ? val.toString() : String(val);
  const parsed = dayjs(str);
  if (!parsed.isValid()) return "";
  return parsed.format("HH:mm");
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
 * Chip-style selector for employees. Leading check-box icon makes its
 * "multi-select" nature obvious at a glance, the full button hitbox is
 * clearly clickable, and chips wrap naturally — on mobile that's
 * typically 2 per row, on desktop 4+, so large crews don't eat a full
 * column each.
 */
const EmployeeToggle: React.FC<{
  name: string;
  checked: boolean;
  onToggle: () => void;
  isDisabled?: boolean;
}> = ({ name, checked, onToggle, isDisabled }) => (
  <Button
    onClick={onToggle}
    isDisabled={isDisabled}
    size="sm"
    w="100%"
    // Let long names wrap onto two lines rather than truncate —
    // there's no tooltip affordance on mobile, so seeing the full
    // name at a glance matters more than uniform row heights.
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
    {name}
  </Button>
);

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

  const toast = useToast();

  const [formData, setFormData] = React.useState<EmployeeWorkCreateData[]>([
    { employees: [], jobs: [initialJob] },
  ]);
  const [generalError, setGeneralError] = React.useState<string>();
  const [formErrors, setFormErrors] = React.useState<FormErrors>([]);
  const [hasTriedSubmit, setHasTriedSubmit] = React.useState(false);

  const [addTempEmployee, { loading: tempEmployeeLoading }] =
    useDailyReportAddTemporaryEmployeeMutation();

  const [create, { loading }] = useEmployeeWorkCreateMutation({
    refetchQueries: [DailyReportFullDocument],
  });

  const updateJobTitle = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const copy: EmployeeWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      copy[dataIndex].jobs[jobIndex].jobTitle = value;
      setFormData(copy);
    },
    [formData]
  );

  const updateStartTime = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const copy: EmployeeWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      copy[dataIndex].jobs[jobIndex].startTime = isEmpty(value)
        ? null
        : convertHourToDate(value, dailyReport.date);
      setFormData(copy);
    },
    [dailyReport.date, formData]
  );

  const updateEndTime = React.useCallback(
    (value: string, dataIndex: number, jobIndex: number) => {
      const copy: EmployeeWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      copy[dataIndex].jobs[jobIndex].endTime = convertHourToDate(
        value,
        dailyReport.date
      );
      setFormData(copy);
    },
    [dailyReport.date, formData]
  );

  const toggleEmployee = React.useCallback(
    (employeeId: string, dataIndex: number) => {
      const copy: EmployeeWorkCreateData[] = JSON.parse(
        JSON.stringify(formData)
      );
      const idx = copy[dataIndex].employees.findIndex(
        (id) => id === employeeId
      );
      if (idx === -1) copy[dataIndex].employees.push(employeeId);
      else copy[dataIndex].employees.splice(idx, 1);
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
    [formData, initialJob]
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
    const copy: EmployeeWorkCreateData[] = JSON.parse(JSON.stringify(formData));
    copy.push({ employees: [], jobs: [initialJob] });
    setFormData(copy);
  }, [formData, initialJob]);

  const removeData = React.useCallback(
    (dataIndex: number) => {
      const copy: EmployeeWorkCreateData[] = JSON.parse(
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
      let employees: string | undefined;
      const jobs: JobErrors[] = [];
      for (let j = 0; j < formData[i].jobs.length; j++) {
        jobs[j] = {};
        if (isEmpty(formData[i].jobs[j].jobTitle)) {
          jobs[j].jobTitle = "please provide a job title";
          valid = false;
        }
        if (isEmpty(formData[i].jobs[j].startTime)) {
          jobs[j].startTime = "please provide a start time";
          valid = false;
        }
        if (isEmpty(formData[i].jobs[j].endTime)) {
          jobs[j].endTime = "please provide an end time";
          valid = false;
        }
      }
      if (formData[i].employees.length === 0) {
        employees = "please select at least one employee";
        valid = false;
      }
      errs[i] = { jobs, employees };
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

  React.useEffect(() => {
    if (hasTriedSubmit) checkErrors();
  }, [formData, hasTriedSubmit, checkErrors]);

  return (
    // Accent-tinted wrapper — subtle blue for "people/hours". my=2
    // separates the form from whatever sits above/below it.
    <Box bg="blue.50" p={1} borderRadius="md" my={2}>
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

                <Box mb={2}>
                  <FieldLabel>Work done</FieldLabel>
                  <EmployeeWorkSelect
                    isDisabled={loading}
                    value={job.jobTitle}
                    errorMessage={
                      formErrors[dataIndex]?.jobs[jobIndex]?.jobTitle
                    }
                    onChange={(e) =>
                      updateJobTitle(e.target.value, dataIndex, jobIndex)
                    }
                  />
                </Box>

                <SimpleGrid columns={2} spacing={3}>
                  <Box>
                    <FieldLabel>Start</FieldLabel>
                    <Input
                      type="time"
                      step={900}
                      isDisabled={loading}
                      value={toTimeInputValue(job.startTime)}
                      bg="white"
                      onChange={(e) =>
                        updateStartTime(e.target.value, dataIndex, jobIndex)
                      }
                      isInvalid={
                        !!formErrors[dataIndex]?.jobs[jobIndex]?.startTime
                      }
                    />
                    {formErrors[dataIndex]?.jobs[jobIndex]?.startTime && (
                      <Text fontSize="xs" color="red.500" mt={1}>
                        {formErrors[dataIndex]?.jobs[jobIndex]?.startTime}
                      </Text>
                    )}
                  </Box>
                  <Box>
                    <FieldLabel>End</FieldLabel>
                    <Input
                      type="time"
                      step={900}
                      isDisabled={loading}
                      value={toTimeInputValue(job.endTime)}
                      bg="white"
                      onChange={(e) =>
                        updateEndTime(e.target.value, dataIndex, jobIndex)
                      }
                      isInvalid={
                        !!formErrors[dataIndex]?.jobs[jobIndex]?.endTime
                      }
                    />
                    {formErrors[dataIndex]?.jobs[jobIndex]?.endTime && (
                      <Text fontSize="xs" color="red.500" mt={1}>
                        {formErrors[dataIndex]?.jobs[jobIndex]?.endTime}
                      </Text>
                    )}
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

          {/* Crew */}
          <Box mt={5}>
            <SectionLabel>Crew</SectionLabel>
            {formErrors[dataIndex]?.employees && (
              <Text color="red.500" fontSize="sm" mb={2}>
                {formErrors[dataIndex]?.employees}
              </Text>
            )}
            <SimpleGrid columns={2} spacing={2}>
              {dailyReport.crew.employees.map((employee) => (
                <EmployeeToggle
                  key={employee._id}
                  name={employee.name}
                  checked={data.employees.includes(employee._id)}
                  onToggle={() => toggleEmployee(employee._id, dataIndex)}
                  isDisabled={loading}
                />
              ))}
            </SimpleGrid>
          </Box>

          {/* Temporary Employees */}
          <Box mt={5}>
            <SectionLabel>Temporary employees</SectionLabel>
            <Box mb={3}>
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
            {dailyReport.temporaryEmployees.length > 0 && (
              <SimpleGrid columns={2} spacing={2}>
                {dailyReport.temporaryEmployees.map((employee) => (
                  <EmployeeToggle
                    key={employee._id}
                    name={employee.name}
                    checked={data.employees.includes(employee._id)}
                    onToggle={() => toggleEmployee(employee._id, dataIndex)}
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
        Add crew group
      </Button>

      <Button
        w="100%"
        colorScheme="blue"
        onClick={trySubmit}
        isLoading={loading}
      >
        Save employee hours
      </Button>
      </Flex>
    </Box>
  );
};

export default EmployeeHourCreateForm;
