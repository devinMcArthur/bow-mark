import { UserRoles } from "../../generated/graphql";

export const FOREMAN_CHAT_SUGGESTIONS = [
  "What do I need to know for today's work?",
  "Are there any safety requirements I should be aware of?",
  "What are the material or mix specifications for this job?",
  "What are the compaction or quality requirements?",
];

export const PM_CHAT_SUGGESTIONS = [
  "How is this jobsite performing financially?",
  "Summarize the key scope and contract requirements",
  "What are the specification requirements for this job?",
  "Compare this jobsite's productivity to similar jobs",
];

export function getJobsiteChatConfig(
  userRole: UserRoles | null | undefined,
  jobsiteId: string
): {
  messageEndpoint: string;
  conversationsEndpoint: string;
  suggestions: string[];
} {
  const isPM =
    userRole === UserRoles.Admin || userRole === UserRoles.ProjectManager;
  return {
    messageEndpoint: isPM
      ? "/api/pm-jobsite-chat/message"
      : "/api/foreman-jobsite-chat/message",
    conversationsEndpoint: isPM
      ? `/api/conversations?jobsiteId=${jobsiteId}&chatType=jobsite-pm`
      : `/api/conversations?jobsiteId=${jobsiteId}&chatType=jobsite-foreman`,
    suggestions: isPM ? PM_CHAT_SUGGESTIONS : FOREMAN_CHAT_SUGGESTIONS,
  };
}
