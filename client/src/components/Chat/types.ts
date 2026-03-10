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
}

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  updatedAt: string;
}
