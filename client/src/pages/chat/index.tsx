import React from "react";
import { NextPage } from "next";
import { Box } from "@chakra-ui/react";
import ChatPage from "../../components/Chat/ChatPage";
import { navbarHeight } from "../../constants/styles";

const ChatHubPage: NextPage = () => (
  <Box position="fixed" top={navbarHeight} left={0} right={0} bottom={0} overflow="hidden">
    <ChatPage
      conversationsEndpoint="/api/conversations?scope=all"
      height="100%"
    />
  </Box>
);

export default ChatHubPage;
