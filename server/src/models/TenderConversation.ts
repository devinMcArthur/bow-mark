import mongoose, { Schema, Document, Model } from "mongoose";
import { IChatMessage } from "./ChatConversation";

export interface ITenderConversation extends Document {
  tender: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  title: string;
  aiModel: string;
  messages: IChatMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const ToolResultSchema = new Schema(
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

const TenderConversationSchema = new Schema<ITenderConversation>(
  {
    tender: {
      type: Schema.Types.ObjectId,
      ref: "Tender",
      required: true,
      index: true,
    },
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

export const TenderConversation: Model<ITenderConversation> =
  mongoose.models.TenderConversation ||
  mongoose.model<ITenderConversation>(
    "TenderConversation",
    TenderConversationSchema
  );
