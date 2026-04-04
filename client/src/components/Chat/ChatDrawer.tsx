import React from "react";
import {
  Box,
  CloseButton,
  Flex,
  Text,
  useMediaQuery,
} from "@chakra-ui/react";
import ChatPage from "./ChatPage";
import { UserRoles } from "../../generated/graphql";
import { navbarHeight } from "../../constants/styles";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  messageEndpoint: string;
  conversationsEndpoint: string;
  extraPayload?: Record<string, unknown>;
  suggestions?: string[];
  minRole?: UserRoles;
  onToolResult?: (toolName: string, result: string) => void;
  initialConversationId?: string;
}

const ChatDrawer = ({
  isOpen,
  onClose,
  title,
  messageEndpoint,
  conversationsEndpoint,
  extraPayload,
  suggestions,
  minRole = UserRoles.User,
  onToolResult,
  initialConversationId,
}: ChatDrawerProps) => {
  const [isDesktop] = useMediaQuery("(min-width: 768px)");

  React.useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const scrollY = parseInt(document.body.style.top || "0", 10) * -1;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    }
    return () => {
      const scrollY = parseInt(document.body.style.top || "0", 10) * -1;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.600"
        zIndex={3}
        onClick={onClose}
        opacity={isOpen ? 1 : 0}
        pointerEvents={isOpen ? "auto" : "none"}
        transition="opacity 0.3s ease"
      />

      {/* Slide panel — always mounted so ChatPage state is preserved */}
      <Box
        position="fixed"
        right={0}
        top={navbarHeight}
        h={`calc(100vh - ${navbarHeight})`}
        w={isDesktop ? "50vw" : "100vw"}
        zIndex={5}
        bg="white"
        display="flex"
        flexDir="column"
        boxShadow="-4px 0 16px rgba(0,0,0,0.15)"
        transform={isOpen ? "translateX(0)" : "translateX(100%)"}
        visibility={isOpen ? "visible" : "hidden"}
        transition={
          isOpen
            ? "transform 0.3s ease, visibility 0s linear 0s"
            : "transform 0.3s ease, visibility 0s linear 0.3s"
        }
      >
        <Flex
          px={4}
          py={3}
          borderBottomWidth="1px"
          borderColor="gray.200"
          align="center"
          justify="space-between"
          flexShrink={0}
        >
          <Text fontWeight="semibold" fontSize="md" noOfLines={1}>
            {title}
          </Text>
          <CloseButton onClick={onClose} />
        </Flex>
        <Box flex={1} overflow="hidden">
          <ChatPage
            messageEndpoint={messageEndpoint}
            conversationsEndpoint={conversationsEndpoint}
            extraPayload={extraPayload}
            suggestions={suggestions}
            disableRouting
            height="100%"
            minRole={minRole}
            onToolResult={onToolResult}
            initialConversationId={initialConversationId}
          />
        </Box>
      </Box>
    </>
  );
};

export default ChatDrawer;
