import { useState, useCallback, useRef, useEffect } from "react";
import { useApolloClient } from "@apollo/client";
import {
  RateBuildupTemplateFullSnippetFragment,
  RateBuildupTemplatesDocument,
  SaveRateBuildupTemplateDocument,
  DeleteRateBuildupTemplateDocument,
  SaveRateBuildupTemplateMutationVariables,
} from "../../../../generated/graphql";
import {
  Position,
  CanvasParameterDef,
  CanvasTableDef,
  CanvasFormulaStep,
  CanvasBreakdownDef,
  OutputDef,
  SpecialNodePositions,
} from "../../../../components/TenderPricing/calculators/types";

// ─── CanvasDocument ───────────────────────────────────────────────────────────

export type {
  GroupActivation,
  ControllerOption,
  UnitVariant,
  ControllerDef,
  GroupDef,
  CanvasDocument,
} from "./canvasTypes";
import type {
  CanvasDocument,
  GroupDef,
  ControllerDef,
  UnitVariant,
} from "./canvasTypes";

export {
  type PricingRowOutput,
  type RateBuildupSnapshot,
  isGroupActive,
  computeInactiveNodeIds,
  snapshotFromTemplate,
  snapshotToCanvasDoc,
  canvasDocToSnapshot,
  evaluateSnapshot,
  computeSnapshotUnitPrice,
} from "./snapshotEvaluator";

// ─── Serialise / deserialise ──────────────────────────────────────────────────

export { fragmentToDoc } from "./fragmentParser";
import { fragmentToDoc } from "./fragmentParser";

function omitTypename<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(omitTypename) as unknown as T;
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([k]) => k !== "__typename")
        .map(([k, v]) => [k, omitTypename(v)])
    ) as T;
  }
  return obj;
}

function docToVariables(
  doc: CanvasDocument,
  idRemap: Map<string, string>
): SaveRateBuildupTemplateMutationVariables {
  const serverId = idRemap.get(doc.id) ?? doc.id;
  const isNew = serverId.startsWith("new_");
  return {
    data: {
      id: isNew ? undefined : serverId,
      label: doc.label,
      defaultUnit: doc.defaultUnit,
      parameterDefs: omitTypename(doc.parameterDefs),
      tableDefs: omitTypename(doc.tableDefs),
      formulaSteps: omitTypename(doc.formulaSteps),
      breakdownDefs: omitTypename(doc.breakdownDefs),
      outputDefs: omitTypename(doc.outputDefs),
      specialPositions: JSON.stringify(doc.specialPositions),
      groupDefs: omitTypename(doc.groupDefs),
      controllerDefs: omitTypename(doc.controllerDefs).map((c) => ({
        ...c,
        defaultValue: typeof c.defaultValue === "boolean" ? (c.defaultValue ? 1 : 0) : c.defaultValue,
      })),
      unitVariants: (doc.unitVariants ?? []).map(({ unit, activatesGroupId, conversionFormula }) => ({
        unit,
        activatesGroupId,
        ...(conversionFormula ? { conversionFormula } : {}),
      })),
    },
  };
}

// ─── Blank document ───────────────────────────────────────────────────────────

function blankDocument(): CanvasDocument {
  return {
    id: `new_${Date.now()}`,
    label: "New Template",
    defaultUnit: "unit",
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [],
    breakdownDefs: [],
    outputDefs: [],
    specialPositions: {
      quantity: { x: 100, y: 200 },
      unitPrice: { x: 700, y: 200 },
    },
    groupDefs: [],
    controllerDefs: [],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const HISTORY_LIMIT = 50;
const DEBOUNCE_MS = 1500;

export function useCanvasDocuments() {
  const client = useApolloClient();
  const [docs, setDocs] = useState<CanvasDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-doc undo/redo stacks keyed by doc ID
  const undoStacks = useRef<Map<string, CanvasDocument[]>>(new Map());
  const redoStacks = useRef<Map<string, CanvasDocument[]>>(new Map());
  const [historyVersion, setHistoryVersion] = useState(0);
  const bumpVersion = () => setHistoryVersion((v) => v + 1);

  // Pending debounce timers keyed by doc ID
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Track temp-id → real-id after first server save
  const idRemap = useRef<Map<string, string>>(new Map());

  // ── Initial load from server ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    client
      .query({ query: RateBuildupTemplatesDocument, fetchPolicy: "network-only" })
      .then(({ data }) => {
        if (cancelled) return;
        const serverDocs = (data?.rateBuildupTemplates ?? []).map(fragmentToDoc);
        setDocs(serverDocs.length > 0 ? serverDocs : [blankDocument()]);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDocs([blankDocument()]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Background save (debounced) ─────────────────────────────────────────────
  const scheduleSave = useCallback(
    (doc: CanvasDocument) => {
      const existing = saveTimers.current.get(doc.id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(async () => {
        saveTimers.current.delete(doc.id);
        try {
          const result = await client.mutate({
            mutation: SaveRateBuildupTemplateDocument,
            variables: docToVariables(doc, idRemap.current),
          });
          const saved = result.data?.saveRateBuildupTemplate;
          if (!saved) return;
          const realId = saved._id;
          // Record the temp→real mapping so future saves use the correct server ID.
          // We do NOT remap in state — the temp ID stays as the stable in-memory key.
          if (doc.id !== realId) {
            idRemap.current.set(doc.id, realId);
          }
        } catch (err) {
          console.error("[canvasStorage] save failed", err);
        }
      }, DEBOUNCE_MS);
      saveTimers.current.set(doc.id, timer);
    },
    [client]
  );

  // ── Public API ──────────────────────────────────────────────────────────────

  const canUndo = useCallback(
    (docId: string) => (undoStacks.current.get(docId)?.length ?? 0) > 0,
    [historyVersion] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const canRedo = useCallback(
    (docId: string) => (redoStacks.current.get(docId)?.length ?? 0) > 0,
    [historyVersion] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const saveDocument = useCallback(
    (updated: CanvasDocument) => {
      setDocs((prev) => {
        const current = prev.find((d) => d.id === updated.id);
        if (current) {
          const stack = undoStacks.current.get(updated.id) ?? [];
          undoStacks.current.set(updated.id, [
            ...stack.slice(-(HISTORY_LIMIT - 1)),
            current,
          ]);
          redoStacks.current.set(updated.id, []);
        }
        const next = prev.map((d) => (d.id === updated.id ? updated : d));
        scheduleSave(updated);
        return next;
      });
      bumpVersion();
    },
    [scheduleSave]
  );

  const createDocument = useCallback(async (): Promise<string> => {
    const doc = blankDocument();
    // Save immediately (not debounced) so we get the real server ID back.
    const result = await client.mutate({
      mutation: SaveRateBuildupTemplateDocument,
      variables: docToVariables(doc, idRemap.current),
    });
    const saved = result.data?.saveRateBuildupTemplate;
    const realId = saved?._id ?? doc.id;
    if (realId !== doc.id) {
      idRemap.current.set(doc.id, realId);
    }
    setDocs((prev) => [...prev, doc]);
    return realId;
  }, [client]);

  const forkDocument = useCallback(
    async (sourceId: string): Promise<string | null> => {
      const source = docs.find((d) => d.id === sourceId);
      if (!source) return null;
      const forked: CanvasDocument = {
        ...source,
        id: `new_${Date.now()}`,
        label: `${source.label} (copy)`,
      };
      // Save immediately so we get the real server ID back.
      const result = await client.mutate({
        mutation: SaveRateBuildupTemplateDocument,
        variables: docToVariables(forked, idRemap.current),
      });
      const saved = result.data?.saveRateBuildupTemplate;
      const realId = saved?._id ?? forked.id;
      if (realId !== forked.id) {
        idRemap.current.set(forked.id, realId);
      }
      setDocs((prev) => [...prev, forked]);
      return realId;
    },
    [docs, client]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      setDocs((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d.id !== id);
      });
      const timer = saveTimers.current.get(id);
      if (timer) { clearTimeout(timer); saveTimers.current.delete(id); }
      const serverId = idRemap.current.get(id) ?? id;
      if (!serverId.startsWith("new_")) {
        try {
          await client.mutate({
            mutation: DeleteRateBuildupTemplateDocument,
            variables: { id: serverId },
          });
        } catch (err) {
          console.error("[canvasStorage] delete failed", err);
        }
      }
    },
    [client]
  );

  const undo = useCallback(
    (docId: string) => {
      const stack = undoStacks.current.get(docId) ?? [];
      if (stack.length === 0) return;
      const previous = stack[stack.length - 1];
      undoStacks.current.set(docId, stack.slice(0, -1));
      setDocs((prev) => {
        const current = prev.find((d) => d.id === docId);
        if (current) {
          const redoStack = redoStacks.current.get(docId) ?? [];
          redoStacks.current.set(docId, [...redoStack, current]);
        }
        const next = prev.map((d) => (d.id === docId ? previous : d));
        scheduleSave(previous);
        return next;
      });
      bumpVersion();
    },
    [scheduleSave]
  );

  const redo = useCallback(
    (docId: string) => {
      const stack = redoStacks.current.get(docId) ?? [];
      if (stack.length === 0) return;
      const nextState = stack[stack.length - 1];
      redoStacks.current.set(docId, stack.slice(0, -1));
      setDocs((prev) => {
        const current = prev.find((d) => d.id === docId);
        if (current) {
          const undoStack = undoStacks.current.get(docId) ?? [];
          undoStacks.current.set(docId, [...undoStack, current]);
        }
        const next = prev.map((d) => (d.id === docId ? nextState : d));
        scheduleSave(nextState);
        return next;
      });
      bumpVersion();
    },
    [scheduleSave]
  );

  return {
    docs,
    loading,
    saveDocument,
    createDocument,
    forkDocument,
    deleteDocument,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
