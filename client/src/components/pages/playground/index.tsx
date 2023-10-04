import { Box, Heading } from "@chakra-ui/react";
import React from "react";

import Container from "../../Common/Container";
import MapForm from "../../Common/Map/MapForm";
import MapDisplay from "../../Common/Map/MapDisplay";

const center = {
  lat: 50.72365709999999,
  lng: -113.9548447
};

const PlaygroundClientOnly = () => {
  /**
   * ----- Hook Initialization -----
   */

  const [position, setPosition] = React.useState(center);

  /**
   * ----- Render -----
   */

  return (
    <Container>
      <Box>
        <Heading>Maps Demo</Heading>
      </Box>
      <Box w="100%" h="25rem">
        <MapForm value={position} onPositionChange={(position) => setPosition(position)} />
      </Box>
      <Box w="100%" h="25rem" mt={12}>
        <MapDisplay value={position} placeName="Office" />
      </Box>
    </Container>
  );
};

export default PlaygroundClientOnly;
