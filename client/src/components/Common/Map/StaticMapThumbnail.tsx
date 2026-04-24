import React from "react";
import { Box, ResponsiveValue, Skeleton } from "@chakra-ui/react";

/**
 * Lightweight satellite thumbnail backed by the Google Maps Static API.
 * Renders as a single <img> request — no JS SDK, no interactive map
 * instance. Click anywhere on the image opens directions in Google
 * Maps (same destination as the hero's "Get directions" action), so
 * this doubles as a visual pre-flight check and a navigation jump-off.
 *
 * Returns null when the API key is missing or the image errors out
 * (e.g. quota exhausted, key restriction mismatch) — silent failure
 * keeps the rest of the hero functional.
 */

interface StaticMapThumbnailProps {
  latitude: number;
  longitude: number;
  /**
   * CSS height — accepts a string or a Chakra responsive object
   * (e.g. `{ base: "140px", md: "200px" }`). Defaults to 200px.
   */
  height?: ResponsiveValue<string>;
  /**
   * Google Maps zoom level (integer). 16 shows the jobsite + the
   * surrounding block/intersection — useful context for paving sites
   * which often span an intersection or street segment. Higher = more
   * zoomed in.
   */
  zoom?: number;
}

const StaticMapThumbnail: React.FC<StaticMapThumbnailProps> = ({
  latitude,
  longitude,
  height = "200px",
  zoom = 16,
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [loaded, setLoaded] = React.useState(false);
  const [errored, setErrored] = React.useState(false);

  if (!apiKey) return null;

  // 640×{height-spec} at scale=2 → up to 1280×{2*height} actual pixels
  // delivered. Google caps width at 1280 for our (non-premium) tier
  // regardless of the size param, so requesting larger doesn't help —
  // zoom level is the only real lever for what's visible. No marker;
  // jobsite is implicitly the center of the image.
  //
  // When `height` is a responsive object, we request the tallest
  // breakpoint's height — object-fit:cover crops cleanly on narrower
  // breakpoints, and fetching once at max height beats juggling per-
  // breakpoint URLs.
  const heightForRequest =
    typeof height === "string"
      ? height
      : typeof height === "object" && height !== null
        ? // pick the largest declared px value
          Object.values(height as Record<string, string>)
            .map((h) => parseInt(h) || 0)
            .reduce((max, v) => Math.max(max, v), 0) + "px"
        : "200px";
  const requestHeight = Math.max(
    160,
    Math.min(640, parseInt(heightForRequest) || 200)
  );
  const staticUrl =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${latitude},${longitude}` +
    `&zoom=${zoom}` +
    `&size=640x${requestHeight}` +
    `&scale=2` +
    `&maptype=satellite` +
    `&key=${apiKey}`;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  if (errored) return null;

  return (
    <Box
      as="a"
      href={directionsUrl}
      target="_blank"
      rel="noopener noreferrer"
      display="block"
      position="relative"
      h={height}
      w="100%"
      overflow="hidden"
      cursor="pointer"
      bg="gray.100"
    >
      {!loaded && (
        <Skeleton position="absolute" inset={0} h="100%" w="100%" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={staticUrl}
        alt="Jobsite satellite view"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: loaded ? "block" : "none",
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </Box>
  );
};

export default StaticMapThumbnail;
