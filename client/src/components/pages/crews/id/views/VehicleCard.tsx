import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { FiTrash } from "react-icons/fi";
import {
  CrewFullSnippetFragment,
  useCrewRemoveVehicleMutation,
  VehicleCardSnippetFragment,
} from "../../../../../generated/graphql";
import createLink from "../../../../../utils/createLink";
import TextLink from "../../../../Common/TextLink";

interface IVehicleCard {
  vehicle: VehicleCardSnippetFragment;
  crew: CrewFullSnippetFragment;
}

const VehicleCard = ({ vehicle, crew }: IVehicleCard) => {
  const [remove, { loading: removeLoading }] = useCrewRemoveVehicleMutation({
    variables: {
      crewId: crew._id,
      vehicleId: vehicle._id,
    },
  });

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <Flex flexDir="row" justifyContent="space-between">
        <Box>
          <TextLink link={createLink.vehicle(vehicle._id)} fontWeight="bold">
            {vehicle.name} ({vehicle.vehicleCode})
          </TextLink>
          <Text>{vehicle.vehicleType}</Text>
        </Box>
        <IconButton
          onClick={() => window.confirm("Are you sure?") && remove()}
          isLoading={removeLoading}
          backgroundColor="transparent"
          aria-label="remove"
          icon={<FiTrash />}
        />
      </Flex>
    </Box>
  );
};

export default VehicleCard;
