import { prop } from "@typegoose/typegoose";

export type AgentScope = "read" | "readwrite";

export class AgentApiKeySchema {
  @prop({ required: true, minlength: 1, trim: true })
  public name!: string;

  @prop({ required: true, index: true, unique: true })
  public keyPrefix!: string;

  @prop({ required: true })
  public keyHash!: string;

  @prop({ required: true, enum: ["read", "readwrite"] as const })
  public scope!: AgentScope;

  @prop({ default: null })
  public lastUsedAt?: Date | null;

  @prop({ default: null })
  public revokedAt?: Date | null;
}
