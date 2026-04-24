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
import dayjs from "dayjs";
import React from "react";
import { Controller } from "react-hook-form";
import { FiEdit, FiTrash, FiX } from "react-icons/fi";
import { useEmployeeWorkUpdateForm } from "../../../../../forms/employeeWork";

import {
  DailyReportFullDocument,
  EmployeeWorkCardSnippetFragment,
  EmployeeWorkUpdateData,
  useEmployeeWorkDeleteMutation,
  useEmployeeWorkUpdateMutation,
} from "../../../../../generated/graphql";
import convertHourToDate from "../../../../../utils/convertHourToDate";
import formatNumber from "../../../../../utils/formatNumber";
import hourString from "../../../../../utils/hourString";
import EmployeeWorkSelect from "../../../../Common/forms/EmployeeWorkSelect";
import Permission from "../../../../Common/Permission";

interface IEmployeeWorkCard {
  employeeWork: EmployeeWorkCardSnippetFragment;
  dailyReportDate: Date;
  editPermission?: boolean;
}

/** Compact uppercase label. */
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

/** Format a Date/date-string as HH:mm for <input type="time">. */
const toTimeInputValue = (val: Date | string | null | undefined): string => {
  if (!val) return "";
  const str = val instanceof Date ? val.toString() : String(val);
  const parsed = dayjs(str);
  if (!parsed.isValid()) return "";
  return parsed.format("HH:mm");
};

const EmployeeWorkCard = ({
  employeeWork,
  dailyReportDate,
  editPermission,
}: IEmployeeWorkCard) => {
  const toast = useToast();
  const [edit, setEdit] = React.useState(false);

  const [update, { loading }] = useEmployeeWorkUpdateMutation();
  const [remove] = useEmployeeWorkDeleteMutation({
    variables: { id: employeeWork._id },
    refetchQueries: [DailyReportFullDocument],
  });

  const { handleSubmit, control } = useEmployeeWorkUpdateForm({
    defaultValues: {
      jobTitle: employeeWork.jobTitle,
      startTime: employeeWork.startTime,
      endTime: employeeWork.endTime,
    },
  });

  const submitUpdate = React.useCallback(
    (data: EmployeeWorkUpdateData) => {
      const startTime = convertHourToDate(data.startTime, dailyReportDate);
      const endTime = convertHourToDate(data.endTime, dailyReportDate);
      update({
        variables: {
          id: employeeWork._id,
          data: { ...data, startTime, endTime },
        },
      })
        .then(() => setEdit(false))
        .catch((err) => {
          toast({
            isClosable: true,
            description: err.message,
            status: "error",
            title: "Error",
          });
        });
    },
    [dailyReportDate, employeeWork._id, toast, update]
  );

  const hours = React.useMemo(() => {
    return (
      dayjs(employeeWork.endTime).diff(employeeWork.startTime, "minutes") / 60
    );
  }, [employeeWork.endTime, employeeWork.startTime]);

  return (
    <Box p={2} w="100%" key={employeeWork._id} border="1px solid lightgray">
      <Box display="flex" flexDir="row" justifyContent="space-between">
        <Box>
          <Text>
            <Text as="span" fontWeight="bold">
              {employeeWork.jobTitle}
            </Text>{" "}
            - {employeeWork.employee.name}
          </Text>
          <Text>
            {dayjs(employeeWork.startTime).format("h:mm a")} -{" "}
            {dayjs(employeeWork.endTime).format("h:mm a")} (
            {formatNumber(hours)} {hourString(hours)})
          </Text>
        </Box>
        <Flex flexDir="row">
          <Permission otherCriteria={editPermission}>
            {edit && (
              <IconButton
                backgroundColor="transparent"
                icon={<FiTrash />}
                aria-label="delete"
                onClick={() => window.confirm("Are you sure?") && remove()}
              />
            )}
            <IconButton
              backgroundColor="transparent"
              icon={edit ? <FiX /> : <FiEdit />}
              aria-label="edit"
              onClick={() => setEdit(!edit)}
            />
          </Permission>
        </Flex>
      </Box>

      {edit && (
        <Box bg="blue.50" p={1} borderRadius="md" my={2}>
          <form onSubmit={handleSubmit(submitUpdate)}>
            <Flex direction="column" gap={3}>
              <Controller
                control={control}
                name="jobTitle"
                render={({ field, fieldState }) => (
                  <Box>
                    <FieldLabel>Work done</FieldLabel>
                    <EmployeeWorkSelect
                      {...field}
                      isDisabled={loading}
                      errorMessage={fieldState.error?.message}
                    />
                  </Box>
                )}
              />
              <SimpleGrid columns={2} spacing={3}>
                <Controller
                  control={control}
                  name="startTime"
                  render={({ field, fieldState }) => (
                    <Box>
                      <FieldLabel>Start</FieldLabel>
                      <Input
                        type="time"
                        step={900}
                        bg="white"
                        isDisabled={loading}
                        isInvalid={!!fieldState.error}
                        value={toTimeInputValue(field.value)}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </Box>
                  )}
                />
                <Controller
                  control={control}
                  name="endTime"
                  render={({ field, fieldState }) => (
                    <Box>
                      <FieldLabel>End</FieldLabel>
                      <Input
                        type="time"
                        step={900}
                        bg="white"
                        isDisabled={loading}
                        isInvalid={!!fieldState.error}
                        value={toTimeInputValue(field.value)}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </Box>
                  )}
                />
              </SimpleGrid>
              <Button
                type="submit"
                w="100%"
                colorScheme="blue"
                isLoading={loading}
              >
                Save changes
              </Button>
            </Flex>
          </form>
        </Box>
      )}
    </Box>
  );
};

export default EmployeeWorkCard;
