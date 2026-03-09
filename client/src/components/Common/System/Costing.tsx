import { Box, Divider, Flex, Heading, Stack } from "@chakra-ui/react";
import React from "react";
import { SystemSnippetFragment } from "../../../generated/graphql";
import Card from "../Card";
import InfoTooltip from "../Info";
import SystemInternalExpenseOverheadRate from "./InternalExpenseOverheadRate";

interface ISystemCosting {
  system: SystemSnippetFragment;
}

const SystemCosting = ({ system }: ISystemCosting) => {
  /**
   * ----- Hook Initialization -----
   */

  const [collapsed, setCollapsed] = React.useState(true);

  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      <Flex flexDir="row" justifyContent="flex-start">
        <Heading
          my="auto"
          ml={2}
          size="md"
          cursor="pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          Costing
        </Heading>
        <InfoTooltip
          m="auto"
          mx={1}
          description="A collection of settings for costing"
        />
      </Flex>
      {!collapsed && (
        <Box>
          <Divider my={2} />
          <Stack>
            <SystemInternalExpenseOverheadRate system={system} />
          </Stack>
        </Box>
      )}
    </Card>
  );
};

export default SystemCosting;
