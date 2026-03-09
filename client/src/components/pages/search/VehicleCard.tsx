import { Flex, Icon, Text } from "@chakra-ui/react";
import { FiTruck } from "react-icons/fi";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";
import TextLink from "../../Common/TextLink";

interface IVehicleSearchCard {
  vehicle: {
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
  };
}

const VehicleSearchCard = ({ vehicle }: IVehicleSearchCard) => {
  return (
    <Card
      heading={
        <Flex flexDir="row" justifyContent="space-between">
          <TextLink
            fontSize="lg"
            fontWeight="bold"
            link={createLink.vehicle(vehicle._id)}
          >
            {vehicle.name}
          </TextLink>
          <Icon as={FiTruck} />
        </Flex>
      }
    >
      <Text>
        <Text fontWeight="bold" as="span">
          Vehicle Code:{" "}
        </Text>
        {vehicle.vehicleCode}
      </Text>
      <Text>
        <Text fontWeight="bold" as="span">
          Vehicle Type:{" "}
        </Text>
        {vehicle.vehicleType}
      </Text>
    </Card>
  );
};

export default VehicleSearchCard;
