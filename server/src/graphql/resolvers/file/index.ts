import { File, FileClass, FileDocument } from "@models";
import { getFileSignedUrl } from "@utils/fileStorage";

import { Arg, FieldResolver, Query, Resolver, Root } from "type-graphql";

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
}
