import React from "react";

import { Center, CenterProps, Spinner } from "@chakra-ui/react";

const Loading = (props: CenterProps) => {
  return (
    <Center {...props}>
      <Spinner m="auto" />
    </Center>
  );
};

export default Loading;
