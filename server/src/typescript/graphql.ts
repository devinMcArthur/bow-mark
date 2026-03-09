import { UserDocument } from "@models";
import { Request, Response } from "express";
import { Field, InputType } from "type-graphql";

export interface IContext {
  user?: UserDocument;
  req: Request;
  res: Response;
}

@InputType()
export class ListOptionData {
  @Field({ nullable: true })
  public pageLimit?: number;

  @Field({ nullable: true })
  public offset?: number;
}
