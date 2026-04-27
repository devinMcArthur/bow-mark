import { AgentApiKey, AgentApiKeyClass } from "@models";
import {
  Arg,
  Authorized,
  ID,
  Mutation,
  Query,
  Resolver,
} from "type-graphql";
import mutations, {
  AgentApiKeyMintInput,
  AgentApiKeyMintPayload,
} from "./mutations";

/**
 * Agent API keys are credentials for external automation that talks to
 * the MCP server without a User row. Management is gated to Developer
 * role — these keys grant scoped read or read+write access to the
 * entire MCP surface, so issuing them is a privileged operation.
 */
@Resolver(() => AgentApiKeyClass)
export default class AgentApiKeyResolver {
  /**
   * ----- Queries -----
   */

  @Authorized(["DEVELOPER"])
  @Query(() => [AgentApiKeyClass])
  async agentApiKeys() {
    return AgentApiKey.find({}).sort({ revokedAt: 1, createdAt: -1 });
  }

  /**
   * ----- Mutations -----
   */

  @Authorized(["DEVELOPER"])
  @Mutation(() => AgentApiKeyMintPayload)
  async agentApiKeyMint(@Arg("data") data: AgentApiKeyMintInput) {
    return mutations.mint(data);
  }

  @Authorized(["DEVELOPER"])
  @Mutation(() => Boolean)
  async agentApiKeyRevoke(@Arg("id", () => ID) id: string) {
    return mutations.revoke(id);
  }
}
