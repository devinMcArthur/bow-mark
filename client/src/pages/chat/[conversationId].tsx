import { NextPage } from "next";
import { useRouter } from "next/router";
import { Box } from "@chakra-ui/react";
import ChatPage from "../../components/Chat/ChatPage";
import { navbarHeight } from "../../constants/styles";

const ChatConversationPage: NextPage = () => {
  const router = useRouter();
  const { conversationId } = router.query;

  // Wait until the router is ready (query params populated)
  if (!router.isReady || typeof conversationId !== "string") return null;

  return (
    <Box position="fixed" top={navbarHeight} left={0} right={0} bottom={0} overflow="hidden">
      <ChatPage
        initialConversationId={conversationId}
        conversationsEndpoint="/conversations?scope=all"
        height="100%"
      />
    </Box>
  );
};

export default ChatConversationPage;
