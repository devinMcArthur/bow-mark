import {
  Flex,
  Heading,
  IconButton,
  ListItem,
  UnorderedList,
} from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiX } from "react-icons/fi";
import { SystemSnippetFragment } from "../../../generated/graphql";
import SystemLaborTypesUpdate from "../../Forms/System/LaborTypes";
import Card from "../Card";
import Permission from "../Permission";

interface ISystemLaborTypes {
  system: SystemSnippetFragment;
}

const SystemLaborTypes = ({ system }: ISystemLaborTypes) => {
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
          Labor Types
        </Heading>
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
        <SystemLaborTypesUpdate
          system={system}
          onSuccess={() => setEdit(false)}
        />
      )}
      {!collapsed && (
        <UnorderedList>
          {system.laborTypes.map((type, index) => (
            <ListItem key={index}>{type}</ListItem>
          ))}
        </UnorderedList>
      )}
    </Card>
  );
};

export default SystemLaborTypes;
