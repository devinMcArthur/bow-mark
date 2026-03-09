import { SearchClass } from "@graphql/types/search";
import { IContext } from "@typescript/graphql";
import { Arg, Ctx, Query, Resolver } from "type-graphql";

import queries from "./queries";

@Resolver(() => SearchClass)
export default class SearchResolver {
  /**
   * ----- Queries -----
   */

  @Query(() => [SearchClass])
  async search(
    @Arg("searchString") searchString: string,
    @Ctx() context: IContext
  ) {
    return queries.search(searchString, context);
  }
}
