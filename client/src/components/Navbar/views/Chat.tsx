import { IconButton, Tooltip } from "@chakra-ui/react";
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
      <Permission minRole={UserRoles.Admin}>
        <Tooltip label="Analytics Assistant" placement="bottom" hasArrow>
          <IconButton
            aria-label="Analytics Assistant"
            icon={<FiMessageSquare size={16} />}
            size="sm"
            variant="ghost"
            color="whiteAlpha.800"
            _hover={{ bg: "whiteAlpha.100", color: "white" }}
            _active={{ bg: "whiteAlpha.200" }}
            onClick={() => router.push("/chat")}
          />
        </Tooltip>
      </Permission>
    );
  }, [user, router]);
};

export default NavbarChat;
