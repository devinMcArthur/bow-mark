import {
  Box,
  Button,
  Flex,
  Input,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { Controller } from "react-hook-form";
import { useProductionCreateForm } from "../../../../../forms/production";

import {
  DailyReportFullDocument,
  DailyReportFullSnippetFragment,
  ProductionCreateData,
  useProductionCreateMutation,
} from "../../../../../generated/graphql";
import convertHourToDate from "../../../../../utils/convertHourToDate";
import Units from "../../../../Common/forms/Unit";

interface IProductionCreateForm {
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

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <Text fontSize="xs" color="red.500" mt={1}>
      {message}
    </Text>
  ) : null;

const ProductionCreateForm = ({
  dailyReport,
  closeForm,
}: IProductionCreateForm) => {
  const toast = useToast();

  const { handleSubmit, control } = useProductionCreateForm();

  const [create, { loading }] = useProductionCreateMutation({
    refetchQueries: [DailyReportFullDocument],
  });

  const submitCreation = React.useCallback(
    (data: ProductionCreateData) => {
      const startTime = convertHourToDate(data.startTime, dailyReport.date);
      const endTime = convertHourToDate(data.endTime, dailyReport.date);
      create({
        variables: {
          dailyReportId: dailyReport._id,
          data: { ...data, startTime, endTime },
        },
      }).then(() => {
        toast({
          title: "Success",
          description: "Production successfully created",
          isClosable: true,
          status: "success",
        });
        if (closeForm) closeForm();
      });
    },
    [closeForm, create, dailyReport._id, dailyReport.date, toast]
  );

  return (
    <form onSubmit={handleSubmit(submitCreation)}>
      {/* Accent-tinted wrapper — green for production output. */}
      <Box bg="green.50" p={1} borderRadius="md" my={2}>
        <Flex direction="column" gap={4}>
          {/* White card wraps the inputs so they have a consistent
              container color — matches the per-group cards used in
              EmployeeHour/VehicleWork/MaterialShipment. */}
          <Box
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={3}
            bg="white"
          >
          <Flex direction="column" gap={3}>
            <Controller
              control={control}
              name="jobTitle"
              render={({ field, fieldState }) => (
                <Box>
                  <FieldLabel>Work done</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    isDisabled={loading}
                    isInvalid={!!fieldState.error}
                  />
                  <FieldError message={fieldState.error?.message} />
                </Box>
              )}
            />

            <SimpleGrid columns={[1, 2]} spacing={3}>
              <Controller
                control={control}
                name="quantity"
                render={({ field, fieldState }) => (
                  <Box>
                    <FieldLabel>Quantity</FieldLabel>
                    <NumberInput
                      min={0}
                      value={field.value?.toString() ?? ""}
                      isDisabled={loading}
                      isInvalid={!!fieldState.error}
                      onChange={(valueAsString) =>
                        field.onChange(valueAsString)
                      }
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
                      {...field}
                      isDisabled={loading}
                      errorMessage={fieldState.error?.message}
                    />
                  </Box>
                )}
              />
            </SimpleGrid>

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
                      isDisabled={loading}
                      isInvalid={!!fieldState.error}
                      value={toTimeInputValue(field.value)}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                    <FieldError message={fieldState.error?.message} />
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
                      isDisabled={loading}
                      isInvalid={!!fieldState.error}
                      value={toTimeInputValue(field.value)}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                    <FieldError message={fieldState.error?.message} />
                  </Box>
                )}
              />
            </SimpleGrid>

            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <Box>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                    isDisabled={loading}
                    isInvalid={!!fieldState.error}
                  />
                  <FieldError message={fieldState.error?.message} />
                </Box>
              )}
            />
          </Flex>
        </Box>

        <Button
          type="submit"
          w="100%"
          colorScheme="blue"
          isLoading={loading}
        >
          Save production
        </Button>
        </Flex>
      </Box>
    </form>
  );
};

export default ProductionCreateForm;
