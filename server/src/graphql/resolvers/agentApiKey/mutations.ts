import {
  AgentApiKey,
  AgentApiKeyClass,
  AgentApiKeyDocument,
  AgentScope,
} from "@models";
import { Field, InputType, ObjectType } from "type-graphql";

@InputType()
export class AgentApiKeyMintInput {
  @Field({ nullable: false })
  public name!: string;

  // Plain string at the GraphQL boundary; resolved against the
  // "read" | "readwrite" union before persistence.
  @Field({ nullable: false })
  public scope!: string;
}

@ObjectType()
export class AgentApiKeyMintPayload {
  // The raw API key — only ever returned on the mint mutation. Once
  // dismissed by the operator it cannot be recovered; only its bcrypt
  // hash remains in the database.
  @Field({ nullable: false })
  public rawKey!: string;

  @Field(() => AgentApiKeyClass, { nullable: false })
  public apiKey!: AgentApiKeyDocument;
}

const mint = async (
  data: AgentApiKeyMintInput
): Promise<AgentApiKeyMintPayload> => {
  if (data.scope !== "read" && data.scope !== "readwrite") {
    throw new Error("scope must be 'read' or 'readwrite'");
  }

  const { rawKey, doc } = await AgentApiKey.mint({
    name: data.name,
    scope: data.scope as AgentScope,
  });

  return { rawKey, apiKey: doc };
};

const revoke = async (id: string): Promise<boolean> => {
  return AgentApiKey.revoke(id);
};

export default { mint, revoke };
