import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";
import ChatDrawer from "../Chat/ChatDrawer";
import { getJobsiteChatConfig } from "../Chat/jobsiteChatConfig";

interface DailyReportChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobsiteId: string;
  jobsiteName: string;
}

const DailyReportChatDrawer = ({
  isOpen,
  onClose,
  jobsiteId,
  jobsiteName,
}: DailyReportChatDrawerProps) => {
  const { state: { user } } = useAuth();
  const { messageEndpoint, conversationsEndpoint, suggestions } =
    getJobsiteChatConfig(user?.role, jobsiteId);

  return (
    <ChatDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={jobsiteName}
      messageEndpoint={messageEndpoint}
      conversationsEndpoint={conversationsEndpoint}
      extraPayload={{ jobsiteId }}
      suggestions={suggestions}
      minRole={UserRoles.User}
    />
  );
};

export default DailyReportChatDrawer;
