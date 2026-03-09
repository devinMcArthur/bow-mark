import React from "react";
import { Box, Flex } from "@chakra-ui/react";
import { UserRoles, UserTypes } from "../../generated/graphql";
import Permission from "./Permission";

interface ITextGrid {
  rows: {
    title: React.ReactNode;
    text: React.ReactNode;
    permission?: UserRoles;
    permissionType?: UserTypes;
  }[];
}

const TextGrid = ({ rows }: ITextGrid) => {
  const titles = React.useMemo(() => {
    return rows.map((row) => row.title);
  }, [rows]);
  const texts = React.useMemo(() => {
    return rows.map((row) => row.text);
  }, [rows]);

  return (
    <Flex flexDir="row">
      <Flex flexDir="column" mr={2}>
        {titles.map((title, index) => (
          <Permission
            key={index}
            minRole={rows[index].permission || UserRoles.User}
            type={rows[index].permissionType || null}
          >
            <Box my="2px" h="100%" py="auto">
              {title}
            </Box>
          </Permission>
        ))}
      </Flex>
      <Flex flexDir="column">
        {texts.map((text, index) => (
          <Permission
            key={index}
            minRole={rows[index].permission || UserRoles.User}
            type={rows[index].permissionType || null}
          >
            <Box my="2px" h="100%" py="auto">
              {text}
            </Box>
          </Permission>
        ))}
      </Flex>
    </Flex>
  );
};

export default TextGrid;
