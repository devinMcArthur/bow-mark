import { Types } from "mongoose";

import { AgentApiKeyModel } from "@models";
import { AgentApiKeySchema, AgentScope } from "../schema";
import staticOps, { MintKeyArgs, MintKeyResult } from "./static";

export class AgentApiKeyClass extends AgentApiKeySchema {
  /**
   * Generate a fresh API key, store its bcrypt hash, and return the raw
   * key (which is shown to the operator once and never persisted).
   */
  public static async mint(
    this: AgentApiKeyModel,
    args: MintKeyArgs
  ): Promise<MintKeyResult> {
    return staticOps.mint(this, args);
  }

  /**
   * Look up an API key by its prefix and bcrypt-compare the secret.
   * Returns the persisted doc when valid; null when the key is malformed,
   * revoked, or doesn't match any stored hash.
   */
  public static async verify(
    this: AgentApiKeyModel,
    rawKey: string
  ) {
    return staticOps.verify(this, rawKey);
  }

  /**
   * Soft-revoke an API key by setting revokedAt. In-flight JWTs minted
   * before revocation continue to verify until they expire (~1h).
   */
  public static async revoke(
    this: AgentApiKeyModel,
    id: string | Types.ObjectId
  ) {
    return staticOps.revoke(this, id);
  }
}

export type { AgentScope };
