import * as React from "react";
import { Box, BoxProps, Divider, Flex, useStyleConfig } from "@chakra-ui/react";

export interface ICard extends BoxProps {
  size?: "md";
  variant?: "full";
  heading?: React.ReactNode;
}

const Card: React.FC<ICard> = ({ size, children, heading, ...props }) => {
  const styles = useStyleConfig("Card", { size });

  return (
    <Box sx={styles} {...props}>
      {heading && (
        <Box m={-2} p={2} borderRadius="0.25em">
          {heading}
          <Divider mt={2} />
        </Box>
      )}
      <Flex flexDirection="column" pt={!!heading ? 2 : undefined}>
        {children}
      </Flex>
    </Box>
  );
};

export default Card;
