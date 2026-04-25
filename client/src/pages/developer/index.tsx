// client/src/pages/developer/index.tsx
import {
  Box,
  Icon,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { gql, useQuery } from "@apollo/client";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { FiTool } from "react-icons/fi";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import RatingsReview from "../../components/pages/developer/RatingsReview";
import FileBrowser from "../../components/FileBrowser";
import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";

const FILE_NODE_ROOT = gql`
  query FileNodeRoot {
    fileNodeRoot {
      _id
    }
  }
`;

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

  const [tabIndex, setTabIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = parseInt(localStorage.getItem("developer:tab") ?? "0", 10);
    return Number.isNaN(saved) || saved > 1 ? 0 : saved;
  });

  const handleTabChange = React.useCallback((i: number) => {
    setTabIndex(i);
    localStorage.setItem("developer:tab", String(i));
  }, []);

  const rootQuery = useQuery<{ fileNodeRoot: { _id: string } | null }>(
    FILE_NODE_ROOT
  );

  if (!user || user.role !== UserRoles.Developer) return null;

  return (
    <Container>
      <Box display="flex" gap={2} mb={6} alignItems="center">
        <Icon as={FiTool} />
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--chakra-colors-gray-600)" }}>
          Developer Tools
        </h3>
      </Box>
      <ClientOnly>
        {/* @ts-ignore chakra tab union types */}
        <Tabs variant="enclosed" colorScheme="blue" index={tabIndex} onChange={handleTabChange}>
          <TabList>
            <Tab>Ratings Review</Tab>
            <Tab>File Browser</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <RatingsReview />
            </TabPanel>
            <TabPanel px={0}>
              {rootQuery.loading && <Spinner />}
              {rootQuery.error && (
                <Text color="red.500">
                  Failed to load filesystem root: {rootQuery.error.message}
                </Text>
              )}
              {!rootQuery.loading && !rootQuery.data?.fileNodeRoot && (
                <Text color="orange.500">Filesystem root not bootstrapped.</Text>
              )}
              {rootQuery.data?.fileNodeRoot && (
                <FileBrowser
                  rootId={rootQuery.data.fileNodeRoot._id}
                  breadcrumbMode="global"
                  pinRoot={false}
                  compact={false}
                />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ClientOnly>
    </Container>
  );
};

export default DeveloperPage;
