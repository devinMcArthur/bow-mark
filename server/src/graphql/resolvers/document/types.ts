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

  /**
   * When true, the resulting FileNode is marked `systemManaged` — the
   * browser blocks user-initiated rename/move/trash on it. Used when
   * the upload is the authoritative attachment for a first-class record
   * (e.g. an invoice file) so tree-side edits can't silently drift from
   * the owning record.
   */
  @Field({ nullable: true })
  public systemManaged?: boolean;
}
