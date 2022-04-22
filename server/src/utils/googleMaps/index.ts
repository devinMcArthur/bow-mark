import { LatLng } from "@googlemaps/google-maps-services-js";
import googleMapsClient from "./client";

/**
 * Google Console: https://console.cloud.google.com/google/maps-apis/api-list?authuser=1&project=bow-mark
 */

const address = (location: LatLng) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      console.log(location);

      const response = await googleMapsClient.nearestRoads({
        params: {
          points: [JSON.parse(JSON.stringify(location))],
          key: "AIzaSyCEjnNgpYxg6b5PsuD09mwZmW8CIno6PkA",
        },
      });

      console.log(response.data);

      resolve();
    } catch (e: any) {
      console.log(e);
      reject(e);
    }
  });
};

export default {
  address,
};
