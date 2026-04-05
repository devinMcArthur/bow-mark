import * as React from "react";

import { Badge, Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { FiSearch, FiX } from "react-icons/fi";
import { useMediaQuery } from "@chakra-ui/media-query";

import { navbarHeight } from "../../constants/styles";
import useMounted from "../../hooks/useMounted";
import NavbarAccount from "./views/Account";
import NavbarSearch from "./views/Search";
import NavbarCreate from "./views/Create";
import NavbarChat from "./views/Chat";
import Development from "./views/Development";

const Navbar = () => {
  const router = useRouter();
  const { hasMounted } = useMounted();
  const [isDesktop] = useMediaQuery("(min-width: 580px)");
  const showDesktop = hasMounted ? isDesktop : true;
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <Box
      position="fixed"
      height={navbarHeight}
      width="100%"
      zIndex="998"
      bg="#334155"
      borderBottom="2px solid"
      borderColor="rgba(229,62,62,0.4)"
      boxShadow="0 1px 4px rgba(0,0,0,0.3)"
    >
      <Flex align="center" justify="space-between" h="100%" px={4}>

        {/* Mobile search — full-width overlay */}
        {!showDesktop && mobileSearchOpen ? (
          <Flex align="center" flex={1} gap={2}>
            <Box flex={1}>
              <NavbarSearch autoFocus />
            </Box>
            <IconButton
              aria-label="Close search"
              icon={<FiX size={16} />}
              size="sm"
              variant="ghost"
              color="whiteAlpha.800"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => setMobileSearchOpen(false)}
            />
          </Flex>
        ) : (
          <>
            {/* Brand */}
            <Flex align="center" gap={2} flexShrink={0} cursor="pointer" onClick={() => router.push("/")}>
              <Text
                fontWeight="800"
                fontSize={["xl", "2xl"]}
                color="red.400"
                letterSpacing="tight"
                lineHeight={1}
              >
                {process.env.NEXT_PUBLIC_APP_NAME}
              </Text>
              {isDev && (
                <Badge
                  colorScheme="yellow"
                  fontSize="9px"
                  px={1.5}
                  py={0.5}
                  borderRadius="sm"
                  letterSpacing="wider"
                >
                  DEV
                </Badge>
              )}
            </Flex>

            <Box flex={1} />

            {/* Actions */}
            <Flex align="center" gap={showDesktop ? 3 : 2}>
              {/* Search — desktop only */}
              {showDesktop && (
                <Box w="280px">
                  <NavbarSearch />
                </Box>
              )}
              {!showDesktop && (
                <IconButton
                  aria-label="Search"
                  icon={<FiSearch size={16} />}
                  size="sm"
                  variant="ghost"
                  color="whiteAlpha.800"
                  _hover={{ bg: "whiteAlpha.100", color: "white" }}
                  onClick={() => setMobileSearchOpen(true)}
                />
              )}
              <Development />
              <NavbarChat />
              <NavbarCreate />
              <NavbarAccount />
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  );
};

export default Navbar;
