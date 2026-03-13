import ChatDrawer from "../Chat/ChatDrawer";

const DAILY_REPORT_SUGGESTIONS = [
  "What are the key requirements I should be aware of today?",
  "Are there any safety requirements in the jobsite documents?",
  "Summarize the specification for the work we're doing",
  "What materials or equipment are referenced in the documents?",
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
  return (
    <ChatDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={jobsiteName}
      messageEndpoint="/api/jobsite-chat/message"
      conversationsEndpoint={`/conversations?jobsiteId=${jobsiteId}`}
      extraPayload={{ jobsiteId }}
      suggestions={DAILY_REPORT_SUGGESTIONS}
    />
  );
};

export default DailyReportChatDrawer;
