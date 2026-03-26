import { MockedProvider } from "@apollo/client/testing";
import { ChakraProvider } from "@chakra-ui/react";
import { beforeMount } from "@playwright/experimental-ct-react17/hooks";
import React from "react";

beforeMount(async ({ App }) => {
  return (
    <MockedProvider mocks={[]} addTypename={false}>
      <ChakraProvider>
        <App />
      </ChakraProvider>
    </MockedProvider>
  );
});
