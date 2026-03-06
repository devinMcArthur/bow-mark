import { Box, IconButton, Tooltip } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { FiMessageSquare } from "react-icons/fi";
import { useAuth } from "../../../contexts/Auth";
import { UserRoles } from "../../../generated/graphql";
import Permission from "../../Common/Permission";

const NavbarChat = () => {
  const {
    state: { user },
  } = useAuth();
  const router = useRouter();

  return React.useMemo(() => {
    if (!user) return null;
    return (
      <Permission minRole={UserRoles.ProjectManager}>
        <Box height="100%" pt={1}>
          <Tooltip label="Analytics Assistant" placement="bottom" hasArrow>
            <IconButton
              aria-label="Analytics Assistant"
              icon={<FiMessageSquare />}
              size="sm"
              backgroundColor="transparent"
              border="2px solid"
              borderColor="gray.700"
              _hover={{ backgroundColor: "rgba(113,128,150,0.1)" }}
              _focus={{ backgroundColor: "rgba(113,128,150,0.1)" }}
              _active={{ backgroundColor: "rgba(113,128,150,0.1)" }}
              onClick={() => router.push("/chat")}
            />
          </Tooltip>
        </Box>
      </Permission>
    );
  }, [user, router]);
};

export default NavbarChat;
