import { Flex, Heading, Icon } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { FiTool } from "react-icons/fi";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import RatingsReview from "../../components/pages/developer/RatingsReview";
import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";

const DeveloperPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // user === undefined means still loading; null means not logged in
    if (user === null) {
      router.replace("/");
    } else if (user !== undefined && user.role !== UserRoles.Developer) {
      router.replace("/");
    }
  }, [user, router]);

  // Show nothing while auth resolves or redirecting
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
        <RatingsReview />
      </ClientOnly>
    </Container>
  );
};

export default DeveloperPage;
