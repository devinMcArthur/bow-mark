import { Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiX } from "react-icons/fi";
import {
  SystemSnippetFragment,
  useJobsiteAddDefaultTruckingRateToAllMutation,
} from "../../../generated/graphql";
import SystemMaterialShipmentVehicleTypeUpdate from "../../Forms/System/SystemMaterialShipmentVehicleTypeUpdate";
import Card from "../Card";
import DefaultRatesTable from "../DefaultRatesTable";
import InfoTooltip from "../Info";
import Permission from "../Permission";
import PleaseWait from "../PleaseWait";
import TextLink from "../TextLink";

interface ISystemMaterialShipmentVehicleTypeDefaults {
  system: SystemSnippetFragment;
  showEditAllLink?: boolean;
  onPropogationSuccess?: () => void;
}

const SystemMaterialShipmentVehicleTypeDefaults = ({
  system,
  showEditAllLink = false,
  onPropogationSuccess,
}: ISystemMaterialShipmentVehicleTypeDefaults) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  const [collapsed, setCollapsed] = React.useState(true);

  const [propagate, { loading }] =
    useJobsiteAddDefaultTruckingRateToAllMutation();

  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      {loading && <PleaseWait />}
      <Flex flexDir="row" justifyContent="space-between">
        <Flex flexDir="row">
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
          <InfoTooltip
            m="auto"
            mx={1}
            description="The default values for Jobsite trucking rates"
          />
        </Flex>

        <Permission>
          <Flex flexDir="row">
            {edit && showEditAllLink && (
              <TextLink link={"/settings/trucking-rates"} m="auto" mr={2}>
                Edit All
              </TextLink>
            )}
            <IconButton
              aria-label="edit"
              icon={edit ? <FiX /> : <FiEdit />}
              backgroundColor="transparent"
              onClick={() => setEdit(!edit)}
            />
          </Flex>
        </Permission>
      </Flex>
      {edit && (
        <SystemMaterialShipmentVehicleTypeUpdate
          system={system}
          onSuccess={() => setEdit(false)}
        />
      )}
      {!collapsed && (
        <DefaultRatesTable
          ratePropagateButton
          defaultRates={system.materialShipmentVehicleTypeDefaults}
          onPropagate={(itemIndex, rateIndex) =>
            propagate({
              variables: {
                itemIndex,
                rateIndex,
              },
            }).then(() => {
              if (onPropogationSuccess) onPropogationSuccess();
            })
          }
          isLoading={loading}
        />
      )}
    </Card>
  );
};

export default SystemMaterialShipmentVehicleTypeDefaults;
