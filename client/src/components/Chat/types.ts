export type Role = "user" | "assistant";

export interface ToolResult {
  toolName: string;
  result: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: string[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  model?: string;
  messageId?: string;       // MongoDB _id of the message subdocument
  rating?: "up" | "down";
  ratingReasons?: string[];
  ratingComment?: string;
}

export interface ConversationContext {
  type: "jobsite" | "tender";
  id: string;
  name: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  updatedAt: string;
  context?: ConversationContext;
}
