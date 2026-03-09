import React from "react";

import { Box, BoxProps } from "@chakra-ui/react";

const FormContainer: React.FC<BoxProps> = ({ children, ...props }) => {
  return (
    <Box backgroundColor="gray.200" borderRadius={4} p={2} m={2} {...props}>
      {children}
    </Box>
  );
};

export default FormContainer;
