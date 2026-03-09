import { FileUpload, GraphQLUpload } from "graphql-upload";
import { Field, InputType } from "type-graphql";

@InputType()
export class FileCreateData {
  @Field(() => GraphQLUpload, { nullable: false })
  public file!: FileUpload;

  @Field({ nullable: true })
  public description?: string;
}
