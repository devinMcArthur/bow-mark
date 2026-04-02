// src/pages/pricing/rate-builder/[id].tsx
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Box, Button, Flex, Text, Tooltip } from "@chakra-ui/react";
import { useAuth } from "../../../contexts/Auth";
import { UserRoles } from "../../../generated/graphql";
import hasPermission from "../../../utils/hasPermission";
import ClientOnly from "../../../components/Common/ClientOnly";
import CalculatorCanvas from "../../../components/pages/developer/CalculatorCanvas";
import {
  CanvasDocument,
  useCanvasDocuments,
} from "../../../components/pages/developer/CalculatorCanvas/canvasStorage";
import { navbarHeight } from "../../../constants/styles";

// Page header is 36px; CalculatorCanvas has its own 28px undo/redo strip
const CANVAS_HEIGHT = `calc(100vh - ${navbarHeight} - 36px)`;

const RateBuildupEditorPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const { docs, loading, saveDocument, forkDocument, deleteDocument } = useCanvasDocuments();

  useEffect(() => {
    if (user === null) router.replace("/");
    else if (user !== undefined && !hasPermission(user.role, UserRoles.ProjectManager)) router.replace("/");
  }, [user, router]);

  const doc: CanvasDocument | null = (docs.find((d) => d.id === id) ?? null);

  const [nameEditValue, setNameEditValue] = useState<string | null>(null);

  const handleNameBlur = useCallback(() => {
    if (nameEditValue === null || !doc) return;
    const trimmed = nameEditValue.trim();
    if (trimmed && trimmed !== doc.label) saveDocument({ ...doc, label: trimmed });
    setNameEditValue(null);
  }, [nameEditValue, doc, saveDocument]);

  const handleFork = useCallback(async () => {
    if (!doc) return;
    const newId = await forkDocument(doc.id);
    if (newId) router.push(`/pricing/rate-builder/${newId}`);
  }, [doc, forkDocument, router]);

  const handleDelete = useCallback(async () => {
    if (!doc) return;
    if (docs.length <= 1) { window.alert("Cannot delete the only template."); return; }
    if (!window.confirm(`Delete "${doc.label}"? This cannot be undone.`)) return;
    await deleteDocument(doc.id);
    router.push("/pricing");
  }, [doc, docs.length, deleteDocument, router]);

  if (!user || !hasPermission(user.role, UserRoles.ProjectManager)) return null;
  if (!id || typeof id !== "string") return null;
  if (loading) return <Flex align="center" justify="center" h="100vh"><Text color="gray.400" fontSize="sm">Loading…</Text></Flex>;
  if (!doc) return <Flex align="center" justify="center" h="100vh"><Text color="gray.400" fontSize="sm">Template not found.</Text></Flex>;

  return (
    <ClientOnly>
      <Box w="100%" overflow="hidden">
        {/* Page header */}
        <Flex
          align="center"
          gap={2}
          px={3}
          h="36px"
          bg="#1e293b"
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          flexShrink={0}
        >
          <Button
            size="xs" variant="ghost" color="gray.400" _hover={{ color: "white" }}
            onClick={() => router.push("/pricing")}
            px={1} fontWeight="normal" fontSize="xs"
          >
            ← Pricing
          </Button>
          <Box w="1px" h="16px" bg="whiteAlpha.300" />
          {nameEditValue !== null ? (
            <input
              autoFocus
              value={nameEditValue}
              onChange={(e) => setNameEditValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setNameEditValue(null);
              }}
              style={{
                background: "transparent", border: "none",
                borderBottom: "1px solid #4a5568", color: "#f1f5f9",
                fontSize: "13px", fontWeight: 600, fontFamily: "inherit",
                outline: "none", padding: "1px 4px", minWidth: 180,
              }}
            />
          ) : (
            <Text
              fontSize="sm" fontWeight="semibold" color="white"
              cursor="text" _hover={{ color: "gray.200" }}
              onClick={() => setNameEditValue(doc.label)}
              userSelect="none"
            >
              {doc.label}
            </Text>
          )}
          <Box flex={1} />
          <Box w="1px" h="16px" bg="whiteAlpha.200" />
          <Tooltip label="Duplicate this template" placement="bottom">
            <Button size="xs" variant="ghost" color="gray.400" _hover={{ color: "white" }} onClick={handleFork}>
              Fork
            </Button>
          </Tooltip>
          <Tooltip label="Delete this template" placement="bottom">
            <Button size="xs" variant="ghost" color="red.400" _hover={{ color: "red.300" }} onClick={handleDelete}>
              Delete
            </Button>
          </Tooltip>
        </Flex>

        {/* Canvas — key on doc.id so internal undo/redo stacks reset on doc change */}
        <CalculatorCanvas
          key={doc.id}
          doc={doc}
          onSave={saveDocument}
          canvasHeight={CANVAS_HEIGHT}
        />
      </Box>
    </ClientOnly>
  );
};

export default RateBuildupEditorPage;
