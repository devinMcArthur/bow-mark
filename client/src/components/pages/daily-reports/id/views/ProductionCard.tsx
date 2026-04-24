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
  Textarea,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { Controller } from "react-hook-form";
import { FiEdit, FiTrash, FiX } from "react-icons/fi";
import { useProductionUpdateForm } from "../../../../../forms/production";

import {
  DailyReportFullDocument,
  ProductionCardSnippetFragment,
  ProductionUpdateData,
  useProductionDeleteMutation,
  useProductionUpdateMutation,
} from "../../../../../generated/graphql";
import convertHourToDate from "../../../../../utils/convertHourToDate";
import hourString from "../../../../../utils/hourString";
import Units from "../../../../Common/forms/Unit";
import Permission from "../../../../Common/Permission";

interface IProductionCard {
  production: ProductionCardSnippetFragment;
  dailyReportDate: Date;
  editPermission?: boolean;
}

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text
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

const toTimeInputValue = (val: Date | string | null | undefined): string => {
  if (!val) return "";
  const str = val instanceof Date ? val.toString() : String(val);
  const parsed = dayjs(str);
  if (!parsed.isValid()) return "";
  return parsed.format("HH:mm");
};

const ProductionCard = ({
  production,
  dailyReportDate,
  editPermission,
}: IProductionCard) => {
  const [edit, setEdit] = React.useState(false);

  const { handleSubmit, control } = useProductionUpdateForm({
    defaultValues: {
      jobTitle: production.jobTitle,
      quantity: production.quantity,
      unit: production.unit,
      startTime: production.startTime,
      endTime: production.endTime,
      description: production.description,
    },
  });

  const [update, { loading }] = useProductionUpdateMutation();

  const [remove] = useProductionDeleteMutation({
    variables: { id: production._id },
    refetchQueries: [DailyReportFullDocument],
  });

  const submitUpdate = React.useCallback(
    (data: ProductionUpdateData) => {
      const startTime = convertHourToDate(data.startTime, dailyReportDate);
      const endTime = convertHourToDate(data.endTime, dailyReportDate);
      update({
        variables: {
          id: production._id,
          data: { ...data, startTime, endTime },
        },
      }).then(() => setEdit(false));
    },
    [dailyReportDate, production._id, update]
  );

  const hours = React.useMemo(() => {
    return Math.abs(
      dayjs(production.endTime).diff(production.startTime, "hours")
    );
  }, [production.endTime, production.startTime]);

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <Box display="flex" flexDir="row" justifyContent="space-between">
        <Box>
          <Text>
            <b>{production.jobTitle}</b>
            {" - "}
            {production.quantity} {production.unit}
          </Text>
          <Text>
            {dayjs(production.startTime).format("h:mm a")} -{" "}
            {dayjs(production.endTime).format("h:mm a")} ({hours}{" "}
            {hourString(hours)})
          </Text>
        </Box>
        <Box display="flex" flexDir="row">
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
        </Box>
      </Box>

      {edit && (
        <Box bg="green.50" p={1} borderRadius="md" my={2}>
          <form onSubmit={handleSubmit(submitUpdate)}>
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
                      bg="white"
                      isDisabled={loading}
                      isInvalid={!!fieldState.error}
                    />
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
                        <NumberInputField bg="white" />
                      </NumberInput>
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
                      bg="white"
                      isDisabled={loading}
                      isInvalid={!!fieldState.error}
                    />
                  </Box>
                )}
              />

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

export default ProductionCard;
