import { Box, Center, Heading } from "@chakra-ui/react";
import TextLink from "../components/Common/TextLink";

const FourOhFour = () => {
  return (
    <Center w="100%" h="90vh">
      <Box>
        <Heading m="auto">This page could not be found</Heading>
        <TextLink link="/">Back Home</TextLink>
      </Box>
    </Center>
  );
};

export default FourOhFour;
