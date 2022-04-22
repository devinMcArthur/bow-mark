import { Box, Text } from "@chakra-ui/react";
import GoogleMapReact from "google-map-react";
import React from "react";

interface IMapPin extends GoogleMapReact.Coords {
  pinText?: string | null;
}

const MapPin = ({ pinText }: IMapPin) => {
  return (
    <Box
      display="inline-flex"
      flexDir="column"
      transform="translate(-50%, -80%)"
    >
      <Box backgroundColor="red.500" borderRadius={4} p={1}>
        <Text whiteSpace="nowrap">{pinText}</Text>
      </Box>
      <svg
        // display="relative"
        height="20px"
        viewBox="0 100 400 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M 100 100 L 300 100 L 200 300 z" fill="#E53E3E" />
      </svg>
    </Box>
  );
};

interface IMap {
  pinText?: string | null;
  selectedLocation?: (location: GoogleMapReact.Coords) => void;
}

const Map = ({ pinText, selectedLocation }: IMap) => {
  const [pin, setPin] = React.useState<GoogleMapReact.Coords>();

  return (
    <Box w="100%" h="25em">
      <GoogleMapReact
        defaultCenter={{
          lat: 50.7233063,
          lng: -113.9544752,
        }}
        defaultZoom={11}
        bootstrapURLKeys={{ key: "<API_KEY>>" }}
        onClick={(e) => {
          if (selectedLocation) selectedLocation({ lat: e.lat, lng: e.lng });
          setPin({ lat: e.lat, lng: e.lng });
        }}
        yesIWantToUseGoogleMapApiInternals
      >
        {pin && <MapPin {...pin} pinText={pinText} />}
      </GoogleMapReact>
    </Box>
  );
};

export default Map;
