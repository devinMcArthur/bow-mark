import { NextPage } from "next";
import { useRouter } from "next/router";
import ChatPage from "../../components/Chat/ChatPage";

const ChatConversationPage: NextPage = () => {
  const router = useRouter();
  const { conversationId } = router.query;

  // Wait until the router is ready (query params populated)
  if (!router.isReady || typeof conversationId !== "string") return null;

  return <ChatPage initialConversationId={conversationId} />;
};

export default ChatConversationPage;
