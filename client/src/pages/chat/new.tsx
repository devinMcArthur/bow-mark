import { NextPage } from "next";
import ChatPage from "../../components/Chat/ChatPage";
import Permission from "../../components/Common/Permission";
import { UserRoles } from "../../generated/graphql";

const NewChatPage: NextPage = () => (
  <Permission minRole={UserRoles.Admin} type={null} showError>
    <ChatPage />
  </Permission>
);

export default NewChatPage;
