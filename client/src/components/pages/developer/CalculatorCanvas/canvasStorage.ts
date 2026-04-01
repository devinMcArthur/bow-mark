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
  ParameterDef,
  TableDef,
  FormulaStep,
  BreakdownDef,
  IntermediateDef,
  CalculatorInputs,
} from "../../../../components/TenderPricing/calculators/types";

// ─── CanvasDocument ───────────────────────────────────────────────────────────

export interface GroupDef {
  id: string;
  label: string;
  parentGroupId?: string;
  memberIds: string[]; // ordered list: param/table/formula step/sub-group IDs
}

// CanvasDocument is the in-memory representation used by the canvas.
// `defaultInputs`, `nodePositions`, and `groupDefs` are kept as parsed objects
// here; they are JSON-serialised only when sent to / received from the server.
export interface CanvasDocument {
  id: string; // MongoDB _id (or a temp "new_<timestamp>" before first save)
  label: string;
  defaultUnit: string;
  parameterDefs: ParameterDef[];
  tableDefs: TableDef[];
  formulaSteps: FormulaStep[];
  breakdownDefs: BreakdownDef[];
  intermediateDefs: IntermediateDef[];
  defaultInputs: CalculatorInputs;
  nodePositions: Record<string, { x: number; y: number; w?: number; h?: number }>;
  groupDefs: GroupDef[];
}

// ─── Serialise / deserialise ──────────────────────────────────────────────────

function fragmentToDoc(f: RateBuildupTemplateFullSnippetFragment): CanvasDocument {
  let defaultInputs: CalculatorInputs = { params: {}, tables: {} };
  let nodePositions: Record<string, { x: number; y: number }> = {
    quantity: { x: 100, y: 200 },
    unitPrice: { x: 700, y: 200 },
  };
  try { defaultInputs = JSON.parse(f.defaultInputs); } catch { /* ignore */ }
  try { nodePositions = JSON.parse(f.nodePositions); } catch { /* ignore */ }
  let groupDefs: GroupDef[] = [];
  try { groupDefs = JSON.parse((f as any).groupDefs ?? '[]'); } catch { /* ignore */ }
  return {
    id: f._id,
    label: f.label,
    defaultUnit: f.defaultUnit ?? "unit",
    parameterDefs: (f.parameterDefs ?? []) as ParameterDef[],
    tableDefs: (f.tableDefs ?? []) as TableDef[],
    formulaSteps: (f.formulaSteps ?? []) as FormulaStep[],
    breakdownDefs: (f.breakdownDefs ?? []) as BreakdownDef[],
    intermediateDefs: (f.intermediateDefs ?? []) as IntermediateDef[],
    defaultInputs,
    nodePositions,
    groupDefs,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      intermediateDefs: omitTypename(doc.intermediateDefs),
      defaultInputs: JSON.stringify(doc.defaultInputs),
      nodePositions: JSON.stringify(doc.nodePositions),
      groupDefs: JSON.stringify(doc.groupDefs),
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
    intermediateDefs: [],
    defaultInputs: { params: {}, tables: {} },
    nodePositions: {
      quantity: { x: 100, y: 200 },
      unitPrice: { x: 700, y: 200 },
    },
    groupDefs: [],
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
    setDocs((prev) => {
      scheduleSave(doc);
      return [...prev, doc];
    });
    return doc.id;
  }, [scheduleSave]);

  const forkDocument = useCallback(
    async (sourceId: string): Promise<string | null> => {
      const source = docs.find((d) => d.id === sourceId);
      if (!source) return null;
      const forked: CanvasDocument = {
        ...source,
        id: `new_${Date.now()}`,
        label: `${source.label} (copy)`,
      };
      setDocs((prev) => {
        scheduleSave(forked);
        return [...prev, forked];
      });
      return forked.id;
    },
    [docs, scheduleSave]
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
