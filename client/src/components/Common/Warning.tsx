import { Box, Flex, Icon, Text, Tooltip } from "@chakra-ui/react";
import { RiErrorWarningLine } from "react-icons/ri";

interface IWarning {
  tooltip?: string;
  description?: string;
  onClick?: () => void;
}

const Warning = ({ tooltip, description, onClick }: IWarning) => {
  return (
    <Tooltip label={tooltip} m="auto">
      <Box
        cursor={onClick ? "pointer" : ""}
        display="flex"
        justifyContent="center"
        backgroundColor="red.500"
        h={8}
        borderRadius={4}
        m="auto"
        px={1}
        onClick={onClick}
      >
        <Flex>
          <Icon
            my="auto"
            aria-label="warning"
            color="white"
            boxSize={6}
            as={RiErrorWarningLine}
          />
          {description && (
            <Text
              pl={1}
              fontSize="sm"
              m="auto"
              color="white"
              fontWeight="bold"
              whiteSpace="nowrap"
            >
              {description}
            </Text>
          )}
        </Flex>
      </Box>
    </Tooltip>
  );
};

export default Warning;
