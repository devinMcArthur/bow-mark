import { Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiX } from "react-icons/fi";
import { VehicleFullSnippetFragment } from "../../../../generated/graphql";
import Card from "../../../Common/Card";
import RatesTable from "../../../Common/RatesTable";
import VehicleRateUpdate from "../../../Forms/Vehicle/VehicleRateUpdate";

interface IVehicleRates {
  vehicle: VehicleFullSnippetFragment;
}

const VehicleRates = ({ vehicle }: IVehicleRates) => {
  /**
   * ------ Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between">
        <Heading size="md">Rates</Heading>
        <IconButton
          aria-label="edit"
          icon={edit ? <FiX /> : <FiEdit />}
          backgroundColor="transparent"
          onClick={() => setEdit(!edit)}
        />
      </Flex>
      <RatesTable rates={vehicle.rates} />
      {edit && (
        <VehicleRateUpdate vehicle={vehicle} onSuccess={() => setEdit(false)} />
      )}
    </Card>
  );
};

export default VehicleRates;
