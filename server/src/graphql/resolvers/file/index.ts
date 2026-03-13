import { File, FileClass, FileDocument } from "@models";
import { getFileSignedUrl } from "@utils/fileStorage";
import { FileUpload, GraphQLUpload } from "graphql-upload";

import {
  Arg,
  Authorized,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { FileCreateData } from "./mutations";

@Resolver(() => FileClass)
export default class FileResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => String)
  async buffer(@Root() file: FileDocument) {
    return file.getBuffer();
  }

  @FieldResolver(() => String)
  async downloadUrl(@Root() file: FileDocument) {
    return getFileSignedUrl(file._id?.toString());
  }

  /**
   * ----- Queries -----
   */

  @Query(() => FileClass)
  async file(@Arg("id") id: string) {
    return File.getById(id);
  }

  /**
   * ----- Mutations -----
   */

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => FileClass)
  async fileCreate(
    @Arg("data") data: FileCreateData
  ) {
    const upload: FileUpload = await data.file;
    const file = await File.createDocument({
      mimetype: upload.mimetype,
      stream: upload.createReadStream(),
      description: data.description,
    });
    return file;
  }
}
