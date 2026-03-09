import React from "react";

import { ContainerProps, Container as Cont } from "@chakra-ui/react";

const Container: React.FC<ContainerProps> = ({ children, ...props }) => {
  return (
    <Cont minW="80%" p={4} {...props}>
      {children}
    </Cont>
  );
};

export default Container;
