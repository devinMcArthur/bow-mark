import { CrewKind, CrewKindClass } from "@models";
import { ListOptionData } from "@typescript/graphql";
import { Id } from "@typescript/models";
import {
  Arg,
  Authorized,
  ID,
  Mutation,
  Query,
  Resolver,
} from "type-graphql";
import mutations, { CrewKindCreateData, CrewKindUpdateData } from "./mutations";

@Resolver(() => CrewKindClass)
export default class CrewKindResolver {
  /**
   * ----- Queries -----
   */

  @Query(() => CrewKindClass, { nullable: true })
  async crewKind(@Arg("id", () => ID) id: string) {
    return CrewKind.getById(id);
  }

  @Query(() => [CrewKindClass])
  async crewKinds(
    @Arg("options", () => ListOptionData, { nullable: true })
    options?: ListOptionData
  ) {
    return CrewKind.getList(options);
  }

  /**
   * ----- Mutations -----
   *
   * Admin-only. CrewKinds are a shared catalog referenced from rate buildup
   * templates; restricting mutations to Admin prevents random estimators from
   * polluting the list mid-bid.
   */

  @Authorized(["ADMIN"])
  @Mutation(() => CrewKindClass)
  async crewKindCreate(@Arg("data") data: CrewKindCreateData) {
    return mutations.create(data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => CrewKindClass)
  async crewKindUpdate(
    @Arg("id", () => ID) id: Id,
    @Arg("data") data: CrewKindUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => CrewKindClass)
  async crewKindArchive(@Arg("id", () => ID) id: Id) {
    return mutations.archive(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => CrewKindClass)
  async crewKindUnarchive(@Arg("id", () => ID) id: Id) {
    return mutations.unarchive(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => Boolean)
  async crewKindRemove(@Arg("id", () => ID) id: Id) {
    return mutations.remove(id);
  }
}
