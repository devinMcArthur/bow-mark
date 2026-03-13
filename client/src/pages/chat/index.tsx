import React from "react";
import { NextPage } from "next";
import { Box } from "@chakra-ui/react";
import ChatPage from "../../components/Chat/ChatPage";
import { navbarHeight } from "../../constants/styles";

const ChatHubPage: NextPage = () => (
  <Box h={`calc(100vh - ${navbarHeight})`} overflow="hidden" flex={1}>
    <ChatPage
      conversationsEndpoint="/conversations?scope=all"
      height="100%"
    />
  </Box>
);

export default ChatHubPage;
