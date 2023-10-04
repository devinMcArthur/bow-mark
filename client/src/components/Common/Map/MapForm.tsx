import React, { CSSProperties } from "react";
import { GoogleMap, useJsApiLoader, StandaloneSearchBox, Marker } from "@react-google-maps/api";
import Loading from "../Loading";

const inputStyle: CSSProperties = {
  boxSizing: `border-box`,
  border: `1px solid transparent`,
  width: `240px`,
  height: `32px`,
  padding: `0 12px`,
  borderRadius: `3px`,
  boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
  fontSize: `14px`,
  outline: `none`,
  textOverflow: `ellipses`,
  position: 'absolute',
  top: '10px',
  right: '10px'
};

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 50.72365709999999,
  lng: -113.9548447
};

interface MapFormProps {
  onPositionChange: (position: google.maps.LatLngLiteral) => void;
  value?: google.maps.LatLngLiteral;
}

const MapForm = ({ value, onPositionChange }: MapFormProps) => {
  /**
   * ----- Hook Initialization -----
   */

  const [map, setMap] = React.useState<google.maps.Map | null>(null);

  const searchBoxRef = React.useRef(null);

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
          }
        }
      });
    }

    setMap(map);
  }, [value]);

  const onUnmount = React.useCallback(function callback() {
    setMap(null);
  }, []);

  const onMapClick = React.useCallback((e) => {
    onPositionChange({
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    });
  }, [onPositionChange]);

  const onLoadSearchBox = React.useCallback((ref) => {
    searchBoxRef.current = ref;
  }, []);

  const onPlacesChanged = React.useCallback(() => {
    if (searchBoxRef.current) {
      // @ts-expect-error - SearchBox is not typed
      let places = searchBoxRef.current.getPlaces();
      if (places.length > 0) {
        let position = {
          lat: places[0].geometry.location.lat(),
          lng: places[0].geometry.location.lng()
        };
        onPositionChange(position);
        if (map) {
          map?.setCenter(position);
          map?.fitBounds(places[0].geometry.viewport);
        }
      }
    }
  }, [map, onPositionChange]);

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
      onClick={onMapClick}
    >
      <StandaloneSearchBox onLoad={onLoadSearchBox} onPlacesChanged={onPlacesChanged}>
        <input
          type='text'
          placeholder='Search map...'
          style={inputStyle}
        />
      </StandaloneSearchBox>
      <Marker position={value || center} />
    </GoogleMap >
  ) : <Loading />;
};

export default MapForm;
