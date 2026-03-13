import { ObjectType } from "type-graphql";
import { ConversationSchema } from "../schema";

@ObjectType()
export class ConversationClass extends ConversationSchema {}
