import { ProductionClass } from "@models";
import { Arg, Authorized, Mutation, Resolver } from "type-graphql";
import mutations, {
  ProductionCreateData,
  ProductionUpdateData,
} from "./mutations";

@Resolver(() => ProductionClass)
export default class ProductionResolver {
  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => ProductionClass)
  async productionCreate(
    @Arg("dailyReportId") dailyReportId: string,
    @Arg("data") data: ProductionCreateData
  ) {
    return mutations.create(dailyReportId, data);
  }

  @Authorized()
  @Mutation(() => ProductionClass)
  async productionUpdate(
    @Arg("id") id: string,
    @Arg("data") data: ProductionUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized()
  @Mutation(() => String)
  async productionDelete(@Arg("id") id: string) {
    return mutations.remove(id);
  }
}
