import { NextPage } from "next";
import { useRouter } from "next/router";
import { Box } from "@chakra-ui/react";
import ChatPage from "../../components/Chat/ChatPage";
import Permission from "../../components/Common/Permission";
import { UserRoles } from "../../generated/graphql";
import { navbarHeight } from "../../constants/styles";

const ChatConversationPage: NextPage = () => {
  const router = useRouter();
  const { conversationId } = router.query;

  // Wait until the router is ready (query params populated)
  if (!router.isReady || typeof conversationId !== "string") return null;

  return (
    <Permission minRole={UserRoles.Admin} type={null} showError>
      <Box position="fixed" top={navbarHeight} left={0} right={0} bottom={0} overflow="hidden">
        <ChatPage
          initialConversationId={conversationId}
          conversationsEndpoint="/api/conversations?scope=all"
          height="100%"
        />
      </Box>
    </Permission>
  );
};

export default ChatConversationPage;
