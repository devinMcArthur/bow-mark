import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { AgentApiKeyDocument, AgentApiKeyModel } from "@models";
import { AgentScope } from "../schema";

const PREFIX_HEX_BYTES = 4; // 8 hex chars
const SECRET_HEX_BYTES = 24; // 48 hex chars
const KEY_PATTERN = /^agtkey_([a-f0-9]{8})_([a-f0-9]{48})$/i;

export interface MintKeyArgs {
  name: string;
  scope: AgentScope;
}

export interface MintKeyResult {
  rawKey: string;
  doc: AgentApiKeyDocument;
}

const randomHex = (bytes: number) => randomBytes(bytes).toString("hex");

const mint = async (
  Model: AgentApiKeyModel,
  { name, scope }: MintKeyArgs
): Promise<MintKeyResult> => {
  const prefix = randomHex(PREFIX_HEX_BYTES);
  const secret = randomHex(SECRET_HEX_BYTES);
  const rawKey = `agtkey_${prefix}_${secret}`;
  const keyHash = await bcrypt.hash(secret, 10);

  const doc = await Model.create({
    name,
    keyPrefix: prefix,
    keyHash,
    scope,
  });

  return { rawKey, doc };
};

const verify = async (
  Model: AgentApiKeyModel,
  rawKey: string
): Promise<AgentApiKeyDocument | null> => {
  const match = KEY_PATTERN.exec(rawKey);
  if (!match) return null;
  const [, prefix, secret] = match;

  const doc = await Model.findOne({ keyPrefix: prefix });
  if (!doc || doc.revokedAt) return null;

  const ok = await bcrypt.compare(secret, doc.keyHash);
  if (!ok) return null;

  Model.updateOne(
    { _id: doc._id },
    { $set: { lastUsedAt: new Date() } }
  )
    .exec()
    .catch(() => {});

  return doc;
};

const revoke = async (
  Model: AgentApiKeyModel,
  id: string | Types.ObjectId
): Promise<boolean> => {
  const res = await Model.updateOne(
    { _id: id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return res.modifiedCount === 1;
};

export default { mint, verify, revoke };
