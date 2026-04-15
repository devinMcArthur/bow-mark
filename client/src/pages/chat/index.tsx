import React from "react";
import { NextPage } from "next";
import { Box } from "@chakra-ui/react";
import ChatPage from "../../components/Chat/ChatPage";
import Permission from "../../components/Common/Permission";
import { UserRoles } from "../../generated/graphql";
import { navbarHeight } from "../../constants/styles";

const ChatHubPage: NextPage = () => (
  <Permission minRole={UserRoles.Admin} type={null} showError>
    <Box position="fixed" top={navbarHeight} left={0} right={0} bottom={0} overflow="hidden">
      <ChatPage
        conversationsEndpoint="/api/conversations?scope=all"
        height="100%"
      />
    </Box>
  </Permission>
);

export default ChatHubPage;
