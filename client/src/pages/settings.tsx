import { Breadcrumb, Flex, Heading, Icon } from "@chakra-ui/react";
import { FiSettings } from "react-icons/fi";
import ClientOnly from "../components/Common/ClientOnly";
import Container from "../components/Common/Container";
import SettingsClientContent from "../components/pages/settings/ClientContent";

const Settings = () => {
  return (
    <Container>
      <Flex flexDir="row" w={["25%", "8%"]} justifyContent="space-evenly">
        <Icon my="auto" as={FiSettings} />
        <Heading size="sm" color="gray.600">
          Settings
        </Heading>
      </Flex>
      <ClientOnly>
        <SettingsClientContent />
      </ClientOnly>
    </Container>
  );
};

export default Settings;
