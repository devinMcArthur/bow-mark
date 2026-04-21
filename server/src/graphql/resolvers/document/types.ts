import { FileUpload, GraphQLUpload } from "graphql-upload";
import { Field, InputType, ID } from "type-graphql";

@InputType()
export class UploadDocumentInput {
  @Field(() => ID)
  public parentFileNodeId!: string;

  @Field(() => GraphQLUpload)
  public fileUpload!: FileUpload;

  @Field({ nullable: true })
  public displayName?: string;
}
