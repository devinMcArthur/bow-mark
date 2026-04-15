import { EnrichedFile } from "@models";
import { EnrichedFileSchema } from "../../../models/EnrichedFile/schema";
import { Id } from "@typescript/models";
import { Arg, Authorized, ID, Query, Resolver } from "type-graphql";

@Resolver(() => EnrichedFileSchema)
export default class EnrichedFileResolver {
  /**
   * Fetch a single EnrichedFile by ID, with the underlying File ref populated
   * so callers (e.g. ChatDrawer's DocumentViewerModal) can read mimetype +
   * filename without a follow-up query.
   *
   * Auth: any authenticated user. The actual file content endpoint
   * (`/api/enriched-files/:id`) only validates the JWT — it does not
   * enforce per-file ACLs — so this query matches that posture.
   */
  @Authorized()
  @Query(() => EnrichedFileSchema, { nullable: true })
  async enrichedFile(@Arg("id", () => ID) id: Id) {
    return EnrichedFile.getById(id);
  }
}
