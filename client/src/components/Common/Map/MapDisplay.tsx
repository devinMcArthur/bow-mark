import React from "react";
import { GoogleMap, useJsApiLoader, InfoBox } from "@react-google-maps/api";
import Loading from "../Loading";
import { Box, Text } from "@chakra-ui/react";
import TextLink from "../TextLink";

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 50.72365709999999,
  lng: -113.9548447
};

interface MapDisplayProps {
  value?: google.maps.LatLngLiteral;
  placeName?: string;
}

const MapDisplay = ({ value, placeName }: MapDisplayProps) => {
  /**
   * ----- Hook Initialization -----
   */

  const [map, setMap] = React.useState<google.maps.Map | null>(null);

  const [place, setPlace] = React.useState<google.maps.places.PlaceResult | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"]
  });

  /**
   * ----- Functions -----
   */

  const onLoad = React.useCallback(function callback(map) {
    if (value) {
      const geoCoder = new window.google.maps.Geocoder();
      geoCoder.geocode({ location: value }, (results, status) => {
        if (status === 'OK') {
          if (results && results[0]) {
            map.fitBounds(results[0].geometry.viewport);
            setPlace(results[0]);
          }
        }
      });
    }

    setMap(map);
  }, [value]);

  const onUnmount = React.useCallback(function callback() {
    setMap(null);
  }, []);

  /**
   * ----- Effects -----
   */

  React.useEffect(() => {
    if (value && map) {
      const geoCoder = new window.google.maps.Geocoder();
      geoCoder.geocode({ location: value }, (results, status) => {
        if (status === 'OK') {
          if (results && results[0]) {
            map.fitBounds(results[0].geometry.viewport);
            setPlace(results[0]);
          }
        }
      });
    }
  }, [value, map]);

  /**
   * ----- Render -----
   */

  return isLoaded ? (
    <GoogleMap
      onLoad={onLoad}
      onUnmount={onUnmount}
      mapContainerStyle={containerStyle}
      center={value || center}
      zoom={10}
    >
      {place && (
        <InfoBox position={place.geometry?.location}>
          <Box p={2} bgColor="gray.600" textColor="white" borderRadius="0 12px 12px 12px" borderColor="gray.400" borderWidth={1} borderStyle="solid">
            {placeName && <Text fontSize="lg" fontWeight="bold">{placeName}</Text>}
            <Text fontSize="md">{place.formatted_address}</Text>
            {place.geometry?.location && (
              <TextLink textColor="blue.100" fontSize="md" link={`https://www.google.com/maps/search/?api=1&query=${place.geometry?.location.lat()},${place.geometry?.location.lng()}`} isExternal>
                Directions
              </TextLink>
            )}
          </Box>
        </InfoBox>
      )}
    </GoogleMap >
  ) : <Loading />;
};

export default MapDisplay;
