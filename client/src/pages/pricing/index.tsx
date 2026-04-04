// src/pages/pricing/index.tsx
import React, { useEffect } from "react";
import { Box, Button, Flex, Heading, Text, Spinner, Badge } from "@chakra-ui/react";
import { useRouter } from "next/router";
import Container from "../../components/Common/Container";
import ClientOnly from "../../components/Common/ClientOnly";
import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";
import hasPermission from "../../utils/hasPermission";
import { useCanvasDocuments, CanvasDocument } from "../../components/pages/developer/CalculatorCanvas/canvasStorage";
import { unitLabel } from "../../constants/units";
import CanvasPreview from "./CanvasPreview";

const CARD_H = 92;

export function formatUpdatedAt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Updated today";
  if (diffDays === 1) return "Updated yesterday";
  if (diffDays < 30) return `Updated ${diffDays}d ago`;
  return `Updated ${d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: diffDays > 365 ? "numeric" : undefined })}`;
}

// ── TemplateCard (shared between list page and modal) ─────────────────────────

export interface TemplateCardProps {
  doc: CanvasDocument;
  index: number;
  cardH: number;
  /** Width in px of the canvas preview panel — must match the rendered container width. */
  previewW?: number;
  onClick: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ doc, index, cardH, previewW = 160, onClick }) => {
  const inputCount = doc.parameterDefs.length + doc.tableDefs.length;
  const hasGroups = doc.groupDefs.length > 0;
  const hasVariants = (doc.unitVariants ?? []).length > 0;
  const updatedLabel = formatUpdatedAt(doc.updatedAt);
  return (
    <Flex
      h={`${cardH}px`}
      borderTopWidth={index === 0 ? 0 : 1}
      borderColor="gray.100"
      cursor="pointer"
      bg="white"
      _hover={{ bg: "gray.50" }}
      transition="background 0.12s"
      onClick={onClick}
      overflow="hidden"
    >
      {/* Content */}
      <Flex flex={1} align="center" px={5} gap={4} minW={0} py={3}>
        <Box flex={1} minW={0}>
          <Text fontWeight="semibold" fontSize="sm" color="gray.800" noOfLines={1} mb={1.5}>
            {doc.label || "Untitled"}
          </Text>
          <Text fontSize="xs" color="gray.400">
            {inputCount} input{inputCount !== 1 ? "s" : ""}
            {" · "}
            {doc.formulaSteps.length} formula{doc.formulaSteps.length !== 1 ? "s" : ""}
            {hasGroups && ` · ${doc.groupDefs.length} group${doc.groupDefs.length !== 1 ? "s" : ""}`}
          </Text>
        </Box>
        <Flex direction="column" align="flex-end" justify="space-between" flexShrink={0} h="48px">
          <Flex>
            {hasVariants ? (
              doc.unitVariants!.map((v) => (
                <Badge key={v.unit} colorScheme="purple" variant="subtle" fontSize="xs" borderRadius="md" px={1.5} py={0.5} mr={1.5}>
                  {unitLabel(v.unit)}
                </Badge>
              ))
            ) : doc.defaultUnit && doc.defaultUnit !== "unit" ? (
              <Badge colorScheme="teal" variant="subtle" fontSize="xs" borderRadius="md" px={1.5} py={0.5}>
                {unitLabel(doc.defaultUnit)}
              </Badge>
            ) : null}
          </Flex>
          {updatedLabel && (
            <Text fontSize="xs" color="gray.300">{updatedLabel}</Text>
          )}
        </Flex>
      </Flex>

      {/* Canvas preview */}
      <Box w={`${previewW}px`} flexShrink={0} alignSelf="stretch" overflow="hidden">
        <CanvasPreview doc={doc} width={previewW} height={cardH} />
      </Box>
    </Flex>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const PricingPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();
  const { docs, loading, createDocument } = useCanvasDocuments();

  useEffect(() => {
    if (user === null) router.replace("/");
    else if (user !== undefined && !hasPermission(user.role, UserRoles.ProjectManager)) router.replace("/");
  }, [user, router]);

  if (!user || !hasPermission(user.role, UserRoles.ProjectManager)) return null;

  const handleNewTemplate = async () => {
    const newId = await createDocument();
    router.push(`/pricing/rate-builder/${newId}`);
  };

  return (
    <ClientOnly>
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
          <Flex justify="center" py={12}><Spinner color="teal.500" /></Flex>
        ) : docs.length === 0 ? (
          <Text color="gray.400" fontSize="sm">No templates yet.</Text>
        ) : (
          <Box borderWidth={1} borderColor="gray.200" rounded="lg" overflow="hidden" bg="white">
            {docs.map((doc, i) => <TemplateCard key={doc.id} doc={doc} index={i} cardH={CARD_H} previewW={180} onClick={() => router.push(`/pricing/rate-builder/${doc.id}`)} />)}
          </Box>
        )}
      </Container>
    </ClientOnly>
  );
};

export default PricingPage;
