// src/pages/pricing/index.tsx
import React from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import Container from "../../components/Common/Container";
import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";
import hasPermission from "../../utils/hasPermission";
import { useCanvasDocuments } from "../../components/pages/developer/CalculatorCanvas/canvasStorage";

const PricingPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();
  const { docs, loading, createDocument } = useCanvasDocuments();

  React.useEffect(() => {
    if (user === null) {
      router.replace("/");
    } else if (user !== undefined && !hasPermission(user.role, UserRoles.ProjectManager)) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || !hasPermission(user.role, UserRoles.ProjectManager)) return null;

  const handleNewTemplate = async () => {
    const newId = await createDocument();
    router.push(`/pricing/rate-builder/${newId}`);
  };

  return (
    <Container>
      <Flex align="center" justify="space-between" mb={6}>
        <Box>
          <Heading size="md" color="gray.800">Rate Builder</Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Reusable pricing templates for tender estimates
          </Text>
        </Box>
        <Button colorScheme="teal" size="sm" onClick={handleNewTemplate}>
          + New Template
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}>
          <Spinner color="teal.500" />
        </Flex>
      ) : docs.length === 0 ? (
        <Text color="gray.400" fontSize="sm">No templates yet.</Text>
      ) : (
        <Box borderWidth={1} borderColor="gray.200" rounded="lg" overflow="hidden">
          {docs.map((doc, i) => {
            const paramCount = doc.parameterDefs.length;
            const tableCount = doc.tableDefs.length;
            const formulaCount = doc.formulaSteps.length;
            return (
              <Flex
                key={doc.id}
                align="center"
                px={4}
                py={3}
                borderTopWidth={i === 0 ? 0 : 1}
                borderColor="gray.100"
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => router.push(`/pricing/rate-builder/${doc.id}`)}
                gap={3}
              >
                <Box w="3px" h="32px" bg="teal.400" borderRadius="full" flexShrink={0} />
                <Box flex={1} minW={0}>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.800" noOfLines={1}>
                    {doc.label || "Untitled"}
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt={0.5}>
                    {paramCount} param{paramCount !== 1 ? "s" : ""} ·{" "}
                    {tableCount} table{tableCount !== 1 ? "s" : ""} ·{" "}
                    {formulaCount} formula{formulaCount !== 1 ? "s" : ""}
                  </Text>
                </Box>
              </Flex>
            );
          })}
        </Box>
      )}
    </Container>
  );
};

export default PricingPage;
