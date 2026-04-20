import type {
  PresenceEntry,
  PresenceScope,
  PresenceHeartbeat,
} from "./types";

export type { PresenceEntry, PresenceScope, PresenceHeartbeat, PresenceActivity } from "./types";

/** 30 seconds — matches the client heartbeat cadence. */
export const PRESENCE_TTL_MS = 30_000;

const table = new Map<string, Map<string, PresenceEntry>>();
type Listener = (viewers: PresenceEntry[]) => void;
const listeners = new Map<string, Set<Listener>>();

function key(scope: PresenceScope): string {
  return `${scope.entityType}:${scope.entityId}`;
}

function now(): number {
  return Date.now();
}

function sweep(k: string): void {
  const inner = table.get(k);
  if (!inner) return;
  const cutoff = now() - PRESENCE_TTL_MS;
  let changed = false;
  for (const [userId, entry] of inner.entries()) {
    if (entry.lastSeen < cutoff) {
      inner.delete(userId);
      changed = true;
    }
  }
  if (inner.size === 0) table.delete(k);
  if (changed) emit(k);
}

function emit(k: string): void {
  const ls = listeners.get(k);
  if (!ls || ls.size === 0) return;
  const viewers = listFromKey(k);
  for (const l of ls) l(viewers);
}

function listFromKey(k: string): PresenceEntry[] {
  const inner = table.get(k);
  return inner ? Array.from(inner.values()) : [];
}

export function heartbeat(input: PresenceHeartbeat): void {
  const k = key(input);
  let inner = table.get(k);
  if (!inner) {
    inner = new Map();
    table.set(k, inner);
  }
  inner.set(input.userId, {
    userId: input.userId,
    activity: input.activity,
    lastSeen: now(),
  });
  emit(k);
}

export function listPresence(scope: PresenceScope): PresenceEntry[] {
  const k = key(scope);
  sweep(k);
  return listFromKey(k);
}

export function subscribeToPresence(
  scope: PresenceScope,
  listener: Listener
): () => void {
  const k = key(scope);
  let set = listeners.get(k);
  if (!set) {
    set = new Set();
    listeners.set(k, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(k);
  };
}

/** Test-only helper. */
export function clearPresence(): void {
  table.clear();
  listeners.clear();
}
