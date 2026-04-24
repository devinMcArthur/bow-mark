import React from "react";

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
} from "@chakra-ui/react";
import { Controller } from "react-hook-form";
import { FiEdit, FiTrash, FiX } from "react-icons/fi";
import { useVehicleWorkUpdateForm } from "../../../../../forms/vehicleWork";
import {
  DailyReportFullDocument,
  useVehicleWorkDeleteMutation,
  useVehicleWorkUpdateMutation,
  VehicleWorkCardSnippetFragment,
  VehicleWorkUpdateData,
} from "../../../../../generated/graphql";
import hourString from "../../../../../utils/hourString";
import Permission from "../../../../Common/Permission";

interface IVehicleWorkCard {
  vehicleWork: VehicleWorkCardSnippetFragment;
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

const VehicleWorkCard = ({ vehicleWork, editPermission }: IVehicleWorkCard) => {
  const [edit, setEdit] = React.useState(false);

  const [update, { loading }] = useVehicleWorkUpdateMutation();
  const [remove] = useVehicleWorkDeleteMutation({
    variables: { id: vehicleWork._id },
    refetchQueries: [DailyReportFullDocument],
  });

  const { handleSubmit, control } = useVehicleWorkUpdateForm({
    defaultValues: {
      jobTitle: vehicleWork.jobTitle,
      hours: vehicleWork.hours,
    },
  });

  const submitHandler = React.useCallback(
    (data: VehicleWorkUpdateData) => {
      update({
        variables: { id: vehicleWork._id, data },
      }).then(() => {
        setEdit(false);
      });
    },
    [update, vehicleWork._id]
  );

  const vehicleName = vehicleWork.vehicle
    ? vehicleWork.vehicle.name
    : "Not Found";

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <Box display="flex" flexDir="row" justifyContent="space-between">
        <Box>
          <Text>
            {vehicleWork.jobTitle ? (
              <>
                <b>{vehicleWork.jobTitle}</b> - {vehicleName}
              </>
            ) : (
              <b>{vehicleName}</b>
            )}
          </Text>
          <Text>
            {vehicleWork.hours} {hourString(vehicleWork.hours)}
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
              aria-label="edit"
              icon={edit ? <FiX /> : <FiEdit />}
              onClick={() => setEdit(!edit)}
            />
          </Permission>
        </Box>
      </Box>

      {edit && (
        <Box bg="purple.50" p={1} borderRadius="md" my={2}>
          <form onSubmit={handleSubmit(submitHandler)}>
            <Flex direction="column" gap={3}>
              <SimpleGrid columns={[1, 2]} spacing={3}>
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
                <Controller
                  control={control}
                  name="hours"
                  render={({ field, fieldState }) => (
                    <Box>
                      <FieldLabel>Hours</FieldLabel>
                      <NumberInput
                        min={0}
                        precision={2}
                        value={field.value?.toString() ?? ""}
                        isDisabled={loading}
                        isInvalid={!!fieldState.error}
                        onChange={(valueAsString) =>
                          field.onChange(parseFloat(valueAsString))
                        }
                        w="100%"
                      >
                        <NumberInputField bg="white" />
                      </NumberInput>
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

export default VehicleWorkCard;
