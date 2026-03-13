import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";
import ChatDrawer from "../Chat/ChatDrawer";

const FOREMAN_SUGGESTIONS = [
  "What do I need to know for today's work?",
  "Are there any safety requirements I should be aware of?",
  "What are the material or mix specifications for this job?",
  "What are the compaction or quality requirements?",
];

const PM_SUGGESTIONS = [
  "How is this jobsite performing financially?",
  "Summarize the key scope and contract requirements",
  "What are the specification requirements for this job?",
  "Compare this jobsite's productivity to similar jobs",
];

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
  const isPM = user?.role === UserRoles.Admin || user?.role === UserRoles.ProjectManager;

  const messageEndpoint = isPM
    ? "/api/pm-jobsite-chat/message"
    : "/api/foreman-jobsite-chat/message";

  const conversationsEndpoint = isPM
    ? `/conversations?jobsiteId=${jobsiteId}&chatType=jobsite-pm`
    : `/conversations?jobsiteId=${jobsiteId}&chatType=jobsite-foreman`;

  const suggestions = isPM ? PM_SUGGESTIONS : FOREMAN_SUGGESTIONS;

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
