import React from "react";

import {
  Flex,
  Heading,
  IconButton,
  ListItem,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import Card from "../Card";
import { SystemSnippetFragment } from "../../../generated/graphql";
import { CANONICAL_UNITS } from "../../../constants/units";
import { FiEdit, FiX } from "react-icons/fi";
import SystemUnitUpdate from "../../Forms/System/SystemUnitUpdate";
import Permission from "../Permission";
import InfoTooltip from "../Info";

interface ISystemUnits {
  system: SystemSnippetFragment;
}

const SystemUnits = ({ system }: ISystemUnits) => {
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
            Units
          </Heading>
          <InfoTooltip
            m="auto"
            mx={1}
            description="Units that can be selected throughout the app"
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
        <SystemUnitUpdate system={system} onSuccess={() => setEdit(false)} />
      )}
      {!collapsed && (
        <UnorderedList>
          {CANONICAL_UNITS.map((u) => (
            <ListItem key={u.code}>
              {u.label}{" "}
              <Text as="span" fontSize="xs" color="gray.500">({u.code})</Text>
            </ListItem>
          ))}
          {(system.unitExtras ?? []).map((unit, index) => (
            <ListItem key={`extra-${index}`}>{unit}</ListItem>
          ))}
        </UnorderedList>
      )}
    </Card>
  );
};

export default SystemUnits;
