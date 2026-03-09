import { Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiX } from "react-icons/fi";
import { SystemSnippetFragment } from "../../../generated/graphql";
import SystemCompanyVehicleTypeUpdate from "../../Forms/System/SystemCompanyVehicleTypeUpdate";
import Card from "../Card";
import DefaultRatesTable from "../DefaultRatesTable";
import InfoTooltip from "../Info";
import Permission from "../Permission";

interface ISystemCompanyVehicleTypeDefaults {
  system: SystemSnippetFragment;
}

const SystemCompanyVehicleTypeDefaults = ({
  system,
}: ISystemCompanyVehicleTypeDefaults) => {
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
        <Flex flexDir="row">
          <Heading
            my="auto"
            ml={2}
            size="md"
            w="100%"
            cursor="pointer"
            onClick={() => setCollapsed(!collapsed)}
          >
            Company Vehicle Type Rates
          </Heading>
          <InfoTooltip
            m="auto"
            mx={1}
            description="A catalog of vehicle types that can be selected for internal company vehicles. Also includes a default rate that will be used if a vehicles rate is not individually set."
          />
        </Flex>
        <Permission>
          <IconButton
            aria-label="edit"
            icon={edit ? <FiX /> : <FiEdit />}
            backgroundColor="transparent"
            onClick={() => setEdit(!edit)}
          />
        </Permission>
      </Flex>
      {edit && (
        <SystemCompanyVehicleTypeUpdate
          system={system}
          onSuccess={() => setEdit(false)}
        />
      )}
      {!collapsed && (
        <DefaultRatesTable defaultRates={system.companyVehicleTypeDefaults} />
      )}
    </Card>
  );
};

export default SystemCompanyVehicleTypeDefaults;
