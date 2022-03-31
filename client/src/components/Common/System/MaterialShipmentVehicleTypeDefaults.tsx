import { Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiX } from "react-icons/fi";
import { SystemSnippetFragment } from "../../../generated/graphql";
import SystemMaterialShipmentVehicleTypeUpdate from "../../Forms/System/SystemMaterialShipmentVehicleTypeUpdate";
import Card from "../Card";
import DefaultRatesTable from "../DefaultRatesTable";

interface ISystemMaterialShipmentVehicleTypeDefaults {
  system: SystemSnippetFragment;
}

const SystemMaterialShipmentVehicleTypeDefaults = ({
  system,
}: ISystemMaterialShipmentVehicleTypeDefaults) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  const [collapsed, setCollapsed] = React.useState(true);

  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between">
        <Heading
          my="auto"
          ml={2}
          size="md"
          w="100%"
          cursor="pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          Material Shipment Trucking Rates
        </Heading>
        <IconButton
          aria-label="edit"
          icon={edit ? <FiX /> : <FiEdit />}
          backgroundColor="transparent"
          onClick={() => setEdit(!edit)}
        />
      </Flex>
      {edit && (
        <SystemMaterialShipmentVehicleTypeUpdate
          system={system}
          onSuccess={() => setEdit(false)}
        />
      )}
      {!collapsed && (
        <DefaultRatesTable
          defaultRates={system.materialShipmentVehicleTypeDefaults}
        />
      )}
    </Card>
  );
};

export default SystemMaterialShipmentVehicleTypeDefaults;
