import React from "react";

import { Box, Heading, Text, useToast } from "@chakra-ui/react";
import { useVehicleCreateForm } from "../../../../../forms/vehicle";
import {
  CrewFullDocument,
  CrewFullSnippetFragment,
  useCrewAddVehicleMutation,
  UserRoles,
  useVehicleCreateMutation,
  VehicleCreateData,
} from "../../../../../generated/graphql";
import VehicleSearch from "../../../../Search/VehicleSearch";
import SubmitButton from "../../../../Common/forms/SubmitButton";
import Permission from "../../../../Common/Permission";

interface IVehicleAddForm {
  crew: CrewFullSnippetFragment;
  closeForm?: () => void;
}

const VehicleAddForm = ({ crew, closeForm }: IVehicleAddForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [add, { loading: addLoading }] = useCrewAddVehicleMutation();

  const [create, { loading: createLoading }] = useVehicleCreateMutation({
    refetchQueries: [CrewFullDocument],
  });

  const { FormComponents } = useVehicleCreateForm();

  /**
   * ----- Functions -----
   */

  const createSubmitHandler = React.useCallback(
    async (data: VehicleCreateData) => {
      try {
        // Create employee
        await create({
          variables: {
            data,
            crewId: crew._id,
          },
        });

        toast({
          title: "Success",
          description: "Successfully added a new vehicle",
          isClosable: true,
          status: "success",
        });

        if (closeForm) closeForm();
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          isClosable: true,
        });
      }
    },
    [closeForm, create, crew._id, toast]
  );

  /**
   * ----- Variables -----
   */

  const loading = React.useMemo(
    () => addLoading || createLoading,
    [addLoading, createLoading]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <Box p={2}>
      <VehicleSearch
        label="Add existing Vehicle"
        placeholder="Search vehicles"
        isDisabled={loading}
        vehicleSelected={(vehicle) => {
          add({
            variables: {
              crewId: crew._id,
              vehicleId: vehicle._id,
            },
          });
        }}
      />
      <Permission minRole={UserRoles.ProjectManager}>
        <Text color="gray.500" textAlign="center" my={2}>
          or
        </Text>
        <Box>
          <Heading size="sm" ml={1}>
            Add a new Vehicle
          </Heading>
          <FormComponents.Form submitHandler={createSubmitHandler}>
            <FormComponents.Name isLoading={loading} />
            <FormComponents.VehicleCode isLoading={loading} />
            <FormComponents.VehicleType isLoading={loading} />
            <SubmitButton isLoading={loading} />
          </FormComponents.Form>
        </Box>
      </Permission>
    </Box>
  );
};

export default VehicleAddForm;
