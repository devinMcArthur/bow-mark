import type {
  PresenceEntry,
  PresenceScope,
  PresenceHeartbeat,
} from "./types";

export type { PresenceEntry, PresenceScope, PresenceHeartbeat, PresenceActivity } from "./types";

/** 30 seconds — matches the client heartbeat cadence. */
export const PRESENCE_TTL_MS = 30_000;

/** How often the background sweeper checks every watched key for expired
 *  entries. Without this, subscribers that only listen (and never query
 *  via listPresence) never observe the transition to "empty" — they just
 *  see the last pre-expiry state forever. Half the TTL gives bounded
 *  latency between actual expiry and consumer notification. */
export const PRESENCE_SWEEP_INTERVAL_MS = Math.floor(PRESENCE_TTL_MS / 2);

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

// Background sweeper — fires on every SWEEP_INTERVAL_MS to expire stale
// entries even when no one calls listPresence. Lazy-started on the first
// heartbeat so module import alone doesn't leak a timer; stopped when
// the table + listeners are both empty.
let sweepTimer: ReturnType<typeof setInterval> | null = null;

function sweepAll(): void {
  for (const k of Array.from(table.keys())) sweep(k);
  if (table.size === 0 && listeners.size === 0) stopSweeper();
}

function startSweeper(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(sweepAll, PRESENCE_SWEEP_INTERVAL_MS);
  // Don't keep the Node event loop alive just for presence sweeping.
  const t = sweepTimer as unknown as { unref?: () => void };
  if (typeof t.unref === "function") t.unref();
}

function stopSweeper(): void {
  if (!sweepTimer) return;
  clearInterval(sweepTimer);
  sweepTimer = null;
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
  startSweeper();
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
  stopSweeper();
}
