import mongoose, { Schema, Document, Model } from "mongoose";

export interface IToolResult {
  toolName: string;
  result: string; // raw JSON string from MCP
}

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  toolResults?: IToolResult[];
}

export interface IChatConversation extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  aiModel: string;
  messages: IChatMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const ToolResultSchema = new Schema<IToolResult>(
  {
    toolName: { type: String, required: true },
    result: { type: String, required: true },
  },
  { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    model: { type: String },
    inputTokens: { type: Number },
    outputTokens: { type: Number },
    toolResults: { type: [ToolResultSchema], default: undefined },
  },
  { _id: false }
);

const ChatConversationSchema = new Schema<IChatConversation>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, default: "New conversation" },
    aiModel: { type: String, required: true },
    messages: { type: [ChatMessageSchema], default: [] },
    totalInputTokens: { type: Number, default: 0 },
    totalOutputTokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ChatConversation: Model<IChatConversation> =
  mongoose.models.ChatConversation ||
  mongoose.model<IChatConversation>("ChatConversation", ChatConversationSchema);
