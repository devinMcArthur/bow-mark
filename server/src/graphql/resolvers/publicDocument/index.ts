import { File, PublicDocument, PublicDocumentClass, PublicDocumentDocument } from "@models";
import { getFileSignedUrl } from "@utils/fileStorage";
import { isDocument } from "@typegoose/typegoose";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import {
  Arg,
  Authorized,
  Field,
  FieldResolver,
  InputType,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";

@InputType()
class PublicDocumentCreateData {
  @Field({ nullable: false })
  public slug!: string;

  @Field({ nullable: false })
  public title!: string;

  @Field({ nullable: true })
  public description?: string;

  @Field(() => GraphQLUpload, { nullable: false })
  public file!: FileUpload;
}

@InputType()
class PublicDocumentUpdateData {
  @Field({ nullable: true })
  public title?: string;

  @Field({ nullable: true })
  public description?: string;

  @Field(() => GraphQLUpload, { nullable: true })
  public file?: FileUpload;
}

@Resolver(() => PublicDocumentClass)
export default class PublicDocumentResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => String, { nullable: true })
  async fileUrl(@Root() doc: PublicDocumentDocument): Promise<string | null> {
    const file = isDocument(doc.file) ? doc.file : null;
    if (!file) return null;
    return (await getFileSignedUrl(file._id.toString())) as string;
  }

  /**
   * ----- Queries -----
   */

  @Authorized(["ADMIN", "PROJECT_MANAGER"])
  @Query(() => [PublicDocumentClass])
  async publicDocuments() {
    return PublicDocument.getAll();
  }

  /**
   * ----- Mutations -----
   */

  @Authorized(["ADMIN", "PROJECT_MANAGER"])
  @Mutation(() => PublicDocumentClass)
  async publicDocumentCreate(
    @Arg("data") data: PublicDocumentCreateData
  ): Promise<PublicDocumentDocument> {
    const fileUpload = await data.file;
    const file = await File.createDocument({
      mimetype: fileUpload.mimetype,
      stream: fileUpload.createReadStream(),
    });

    const doc = await PublicDocument.create({
      slug: data.slug.trim().toLowerCase(),
      title: data.title.trim(),
      description: data.description?.trim(),
      file: file._id,
      viewCount: 0,
    });

    doc.file = file;
    return doc;
  }

  @Authorized(["ADMIN", "PROJECT_MANAGER"])
  @Mutation(() => PublicDocumentClass)
  async publicDocumentUpdate(
    @Arg("id") id: string,
    @Arg("data") data: PublicDocumentUpdateData
  ): Promise<PublicDocumentDocument> {
    const doc = await PublicDocument.findById(id).populate("file");
    if (!doc) throw new Error("Public document not found");

    if (data.title !== undefined) doc.title = data.title.trim();
    if (data.description !== undefined) doc.description = data.description?.trim();

    if (data.file) {
      const fileUpload = await data.file;
      const newFile = await File.createDocument({
        mimetype: fileUpload.mimetype,
        stream: fileUpload.createReadStream(),
      });
      // Remove old file from storage
      if (isDocument(doc.file)) {
        await doc.file.fullRemove();
      }
      doc.file = newFile;
    }

    await doc.save();
    await doc.populate("file");
    return doc;
  }

  @Authorized(["ADMIN", "PROJECT_MANAGER"])
  @Mutation(() => Boolean)
  async publicDocumentDelete(@Arg("id") id: string): Promise<boolean> {
    const doc = await PublicDocument.findById(id).populate("file");
    if (!doc) throw new Error("Public document not found");

    if (isDocument(doc.file)) {
      await doc.file.fullRemove();
    }

    await doc.deleteOne();
    return true;
  }
}
