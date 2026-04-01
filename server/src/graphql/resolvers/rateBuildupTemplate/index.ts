import { RateBuildupTemplate, RateBuildupTemplateClass } from "@models";
import { Arg, ID, Mutation, Query, Resolver } from "type-graphql";
import mutations, { SaveRateBuildupTemplateData } from "./mutations";

@Resolver(() => RateBuildupTemplateClass)
export default class RateBuildupTemplateResolver {
  @Query(() => [RateBuildupTemplateClass])
  async rateBuildupTemplates() {
    return RateBuildupTemplate.getAll();
  }

  @Mutation(() => RateBuildupTemplateClass)
  async saveRateBuildupTemplate(
    @Arg("data") data: SaveRateBuildupTemplateData
  ) {
    return mutations.save(data);
  }

  @Mutation(() => Boolean)
  async deleteRateBuildupTemplate(@Arg("id", () => ID) id: string) {
    return mutations.remove(id);
  }
}
