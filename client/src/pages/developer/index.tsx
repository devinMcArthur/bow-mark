// client/src/pages/developer/index.tsx
import {
  Flex,
  Heading,
  Icon,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { FiTool } from "react-icons/fi";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import RatingsReview from "../../components/pages/developer/RatingsReview";
import CalculatorTemplates from "../../components/pages/developer/CalculatorTemplates";
import CalculatorCanvas from "../../components/pages/developer/CalculatorCanvas";
import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";

const DeveloperPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (user === null) {
      router.replace("/");
    } else if (user !== undefined && user.role !== UserRoles.Developer) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || user.role !== UserRoles.Developer) return null;

  return (
    <Container>
      <Flex flexDir="row" w="auto" gap={2} mb={6}>
        <Icon my="auto" as={FiTool} />
        <Heading size="sm" color="gray.600">
          Developer Tools
        </Heading>
      </Flex>
      <ClientOnly>
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Ratings Review</Tab>
            <Tab>Calculator Templates</Tab>
            <Tab>Canvas</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <RatingsReview />
            </TabPanel>
            <TabPanel px={0}>
              <CalculatorTemplates />
            </TabPanel>
            <TabPanel px={0}>
              <CalculatorCanvas />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ClientOnly>
    </Container>
  );
};

export default DeveloperPage;
