import React from "react";
import { NextPage } from "next";
import ChatPage from "../../components/Chat/ChatPage";

const ChatHubPage: NextPage = () => (
  <ChatPage conversationsEndpoint="/conversations?scope=all" />
);

export default ChatHubPage;
