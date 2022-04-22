import googleMaps from "@utils/googleMaps";
import { Arg, Query, Resolver } from "type-graphql";

@Resolver()
export default class MapResolver {
  @Query(() => Boolean)
  async test(@Arg("lat") lat: number, @Arg("lng") lng: number) {
    await googleMaps.address({ lat, lng });

    return true;
  }
}
