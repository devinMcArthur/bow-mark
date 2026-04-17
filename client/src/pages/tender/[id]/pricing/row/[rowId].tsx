// client/src/pages/tender/[id]/pricing/row/[rowId].tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Box, Button, Flex, Spinner, Text, Tooltip } from "@chakra-ui/react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useAuth } from "../../../../../contexts/Auth";
import { UserRoles } from "../../../../../generated/graphql";
import hasPermission from "../../../../../utils/hasPermission";
import ClientOnly from "../../../../../components/Common/ClientOnly";
import CalculatorCanvas from "../../../../../components/pages/developer/CalculatorCanvas";
import {
  CanvasDocument,
  RateBuildupSnapshot,
  snapshotToCanvasDoc,
  canvasDocToSnapshot,
  evaluateSnapshot,
} from "../../../../../components/pages/developer/CalculatorCanvas/canvasStorage";
import type { RateEntry } from "../../../../../components/TenderPricing/calculators/types";
import { navbarHeight } from "../../../../../constants/styles";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const SHEET_QUERY = gql`
  query TenderPricingSheetForRowEdit($tenderId: ID!) {
    tenderPricingSheet(tenderId: $tenderId) {
      _id
      rows {
        _id
        quantity
        rateBuildupSnapshots {
          snapshot
          memo
        }
      }
    }
  }
`;

const UPDATE_ROW = gql`
  mutation TenderRowSnapshotUpdate($sheetId: ID!, $rowId: ID!, $data: TenderPricingRowUpdateData!) {
    tenderPricingRowUpdate(sheetId: $sheetId, rowId: $rowId, data: $data) {
      _id
    }
  }
`;

// ─── Canvas height ────────────────────────────────────────────────────────────
// 36px combined header bar replaces both the page header and the CalculatorCanvas undo strip
const CANVAS_HEIGHT = `calc(100vh - ${navbarHeight} - 36px)`;

// ─── Page ────────────────────────────────────────────────────────────────────

const TenderRowCanvasPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();
  const { id: tenderId, rowId, quantity: quantityParam, unit: unitParam, snapshotIndex: snapshotIndexParam } = router.query;
  const urlQuantity = quantityParam ? parseFloat(quantityParam as string) : null;
  const urlUnit = typeof unitParam === "string" && unitParam ? unitParam : undefined;
  const snapshotIndex = snapshotIndexParam ? parseInt(snapshotIndexParam as string, 10) : 0;

  useEffect(() => {
    if (user === null) router.replace("/");
    else if (user !== undefined && !hasPermission(user.role, UserRoles.ProjectManager)) router.replace("/");
  }, [user, router]);

  const { data: sheetData, loading: sheetLoading } = useQuery(SHEET_QUERY, {
    variables: { tenderId },
    skip: !tenderId,
    fetchPolicy: "network-only",
  });
  const sheetId = sheetData?.tenderPricingSheet?._id ?? null;
  const matchedRow = sheetData?.tenderPricingSheet?.rows?.find(
    (r: any) => r._id === rowId
  );
  const serverQuantity: number = matchedRow?.quantity ?? 1;
  const rowQuantity = (urlQuantity !== null && !isNaN(urlQuantity) && urlQuantity > 0) ? urlQuantity : serverQuantity;
  const allEntries: { snapshot: string; memo?: string | null }[] = matchedRow?.rateBuildupSnapshots ?? [];

  const [updateRow] = useMutation(UPDATE_ROW);

  const [snapshot, setSnapshot] = useState<RateBuildupSnapshot | null>(null);

  useEffect(() => {
    const entry = allEntries[snapshotIndex];
    if (!entry?.snapshot) { setSnapshot(null); return; }
    try {
      const parsed: RateBuildupSnapshot = JSON.parse(entry.snapshot);
      setSnapshot({ ...parsed, outputDefs: parsed.outputDefs ?? [] });
    } catch {
      console.error("[TenderRowCanvasPage] Failed to parse snapshot JSON");
    }
  }, [sheetData, snapshotIndex]);

  // Debounced save to server
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowQuantityRef = useRef(rowQuantity);
  rowQuantityRef.current = rowQuantity;

  const allEntriesRef = useRef(allEntries);
  allEntriesRef.current = allEntries;

  const scheduleSave = useCallback(
    (updatedSnapshot: RateBuildupSnapshot) => {
      if (!sheetId || !rowId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const updatedJson = JSON.stringify(updatedSnapshot);
        const entries = allEntriesRef.current.map((e, i) =>
          i === snapshotIndex
            ? { snapshot: updatedJson, memo: e.memo ?? "" }
            : { snapshot: e.snapshot, memo: e.memo ?? "" }
        );

        let totalUP = 0;
        const allOutputs: any[] = [];
        for (const entry of entries) {
          try {
            const snap = JSON.parse(entry.snapshot) as RateBuildupSnapshot;
            const { unitPrice, outputs } = evaluateSnapshot(snap, rowQuantityRef.current, urlUnit);
            totalUP += unitPrice;
            allOutputs.push(...outputs);
          } catch {}
        }

        try {
          await updateRow({
            variables: {
              sheetId,
              rowId,
              data: {
                rateBuildupSnapshots: entries,
                unitPrice: totalUP || null,
                rateBuildupOutputs: allOutputs,
              },
            },
          });
        } catch (err) {
          console.error("[TenderRowCanvasPage] save failed", err);
        }
      }, 1500);
    },
    [sheetId, rowId, snapshotIndex, updateRow]
  );

  // Called when CalculatorCanvas makes a structural change (node/edge edits)
  const handleCanvasSave = useCallback(
    (updatedDoc: CanvasDocument) => {
      if (!snapshot) return;
      const updatedSnapshot = canvasDocToSnapshot(updatedDoc, snapshot);
      setSnapshot(updatedSnapshot);
      scheduleSave(updatedSnapshot);
    },
    [snapshot, scheduleSave]
  );

  // Called when LiveTestPanel changes params/tables/controllers
  const handleInputsChange = useCallback(
    (
      params: Record<string, number>,
      tables: Record<string, RateEntry[]>,
      controllers: Record<string, number | boolean | string[]>
    ) => {
      if (!snapshot) return;
      const updatedSnapshot: RateBuildupSnapshot = { ...snapshot, params, tables, controllers };
      setSnapshot(updatedSnapshot);
      scheduleSave(updatedSnapshot);
    },
    [snapshot, scheduleSave]
  );

  // Called when LiveTestPanel changes a param note
  const handleParamNoteChange = useCallback(
    (paramId: string, note: string) => {
      if (!snapshot) return;
      const updatedSnapshot: RateBuildupSnapshot = {
        ...snapshot,
        paramNotes: { ...snapshot.paramNotes, [paramId]: note },
      };
      setSnapshot(updatedSnapshot);
      scheduleSave(updatedSnapshot);
    },
    [snapshot, scheduleSave]
  );

  // Called when the estimator picks a material or crew kind for an Output node.
  const handleOutputChange = useCallback(
    (outputId: string, selection: { materialId?: string; crewKindId?: string }) => {
      if (!snapshot) return;
      const updatedSnapshot: RateBuildupSnapshot = {
        ...snapshot,
        outputs: { ...(snapshot.outputs ?? {}), [outputId]: selection },
      };
      setSnapshot(updatedSnapshot);
      scheduleSave(updatedSnapshot);
    },
    [snapshot, scheduleSave]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!user || !hasPermission(user.role, UserRoles.ProjectManager)) return null;

  const loading = sheetLoading;

  if (loading) {
    return (
      <Flex align="center" justify="center" h="100vh">
        <Spinner color="blue.500" />
      </Flex>
    );
  }

  if (!snapshot) {
    return (
      <Flex align="center" justify="center" h="100vh" direction="column" gap={3}>
        <Text color="gray.400">No rate buildup found for this row.</Text>
        <Button size="sm" onClick={() => router.push(`/tender/${tenderId}?row=${rowId}`)}>← Back to Pricing</Button>
      </Flex>
    );
  }

  const canvasDoc = snapshotToCanvasDoc(snapshot);

  return (
    <ClientOnly>
      <CalculatorCanvas
        key={`${rowId}-snapshot`}
        doc={canvasDoc}
        onSave={handleCanvasSave}
        unit={urlUnit}
        canvasHeight={CANVAS_HEIGHT}
        initialInputs={{ params: snapshot.params, tables: snapshot.tables, controllers: snapshot.controllers }}
        onInputsChange={handleInputsChange}
        paramNotes={snapshot.paramNotes}
        onParamNoteChange={handleParamNoteChange}
        outputs={snapshot.outputs}
        onOutputChange={handleOutputChange}
        initialQuantity={rowQuantity}
        renderToolbar={({ onUndo, onRedo, canUndo, canRedo }) => (
          <Flex
            align="center"
            gap={2}
            px={3}
            h="36px"
            bg="#1e293b"
            borderBottom="1px solid"
            borderColor="whiteAlpha.100"
            flexShrink={0}
            overflow="hidden"
          >
            <Button
              size="xs" variant="ghost" color="gray.400" _hover={{ color: "white" }}
              onClick={() => router.push(`/tender/${tenderId}?row=${rowId}`)}
              px={1} fontWeight="normal" fontSize="xs" flexShrink={0}
            >
              ← Back to Pricing
            </Button>
            <Box w="1px" h="16px" bg="whiteAlpha.300" flexShrink={0} />
            <Text fontSize="sm" fontWeight="semibold" color="white" noOfLines={1} flex={1} minW={0}>
              {snapshot.label}
            </Text>
            <Text fontSize="xs" color="gray.500" flexShrink={0} pr={1}>
              (line item buildup)
            </Text>
            <Box w="1px" h="16px" bg="whiteAlpha.200" flexShrink={0} />
            <Tooltip label="Undo (Ctrl+Z)" placement="bottom">
              <Button
                size="xs" variant="ghost" color="gray.400" _hover={{ color: "white" }}
                onClick={onUndo} isDisabled={!canUndo}
                fontFamily="mono" fontSize="md" px={2} flexShrink={0}
              >
                ↩
              </Button>
            </Tooltip>
            <Tooltip label="Redo (Ctrl+Y)" placement="bottom">
              <Button
                size="xs" variant="ghost" color="gray.400" _hover={{ color: "white" }}
                onClick={onRedo} isDisabled={!canRedo}
                fontFamily="mono" fontSize="md" px={2} flexShrink={0}
              >
                ↪
              </Button>
            </Tooltip>
          </Flex>
        )}
      />
    </ClientOnly>
  );
};

export default TenderRowCanvasPage;
