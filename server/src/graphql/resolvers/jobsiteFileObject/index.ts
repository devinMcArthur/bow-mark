import {
  File,
  FileClass,
  JobsiteFileObjectClass,
  JobsiteFileObjectDocument,
} from "@models";
import { FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(() => JobsiteFileObjectClass)
export default class JobsiteFileObjectResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => FileClass)
  async file(@Root() jobsiteFileObject: JobsiteFileObjectDocument) {
    return File.getById(jobsiteFileObject.file || "");
  }
}
