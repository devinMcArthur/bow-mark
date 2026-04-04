import * as React from "react";

import { Box, Stack, Heading } from "@chakra-ui/react";

import { navbarHeight } from "../../constants/styles";
import { useMediaQuery } from "@chakra-ui/media-query";

import TextLink from "../Common/TextLink";
import useMounted from "../../hooks/useMounted";
import NavbarAccount from "./views/Account";
import NavbarSearch from "./views/Search";
import NavbarCreate from "./views/Create";
import NavbarChat from "./views/Chat";
import Development from "./views/Development";

const Navbar = () => {
  /**
   * ----- Hook Initialization -----
   */

  const { hasMounted } = useMounted();
  const [isLargerThan480] = useMediaQuery("(min-width: 580px)");

  /**
   * ----- Variables -----
   */

  const isLarger = hasMounted ? isLargerThan480 : true;

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <Box
      shadow="bottomShadow"
      p={1}
      position="fixed"
      height={navbarHeight}
      width="100%"
      zIndex="998"
      backgroundColor={isDev ? "green.700" : "red.500"}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        minW="80%"
        margin="0 auto"
        height="100%"
      >
        <TextLink
          color="black"
          link={"/"}
          marginY="auto"
          height="100%"
          pt={1}
          ml={4}
        >
          <Heading
            as="h4"
            fontSize={["xl", "2xl", "3xl"]}
            h="100%"
            p="auto"
            mt={[1, 0]}
          >
            {process.env.NEXT_PUBLIC_APP_NAME}
          </Heading>
        </TextLink>
        <NavbarSearch />
        <Stack
          spacing={isLarger ? 6 : 2}
          direction="row"
          mr={4}
          height="100%"
          pt={isLarger ? 1 : 1}
        >
          <Development />
          <NavbarChat />
          <NavbarCreate />

          <NavbarAccount />
        </Stack>
      </Box>
    </Box>
  );
};

export default Navbar;
