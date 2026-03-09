import React from "react";

import { Box } from "@chakra-ui/layout";
import { navbarHeight } from "../../constants/styles";
import { useRouter } from "next/router";
import { Icon, Spinner, Text } from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import { useAuth } from "../../contexts/Auth";

const MainPageContainer: React.FC = ({ children }) => {
  /**
   * ----- Hook Initialization -----
   */

  const router = useRouter();
  const { state } = useAuth();

  /**
   * ----- Rendering -----
   */

  if (state.serverUnreachable) {
    return (
      <Box
        display="flex"
        flexDir="column"
        alignItems="center"
        justifyContent="center"
        pt={navbarHeight}
        h="100vh"
        gap={3}
        color="gray.500"
      >
        <Spinner size="lg" />
        <Text fontSize="sm">Unable to reach the server — retrying…</Text>
      </Box>
    );
  }

  return (
    <Box
      id="prop-container"
      display="flex"
      flexDir="row"
      pt={navbarHeight}
      pr={"0"}
    >
      <Box
        onClick={() => router.back()}
        position="absolute"
        mt={1}
        ml={1}
        cursor="pointer"
      >
        <Icon as={FiArrowLeft} />
      </Box>
      {children}
    </Box>
  );
};

export default MainPageContainer;
