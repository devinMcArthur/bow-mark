/**
 * Ring-buffer-style bounded queue used by domainEventStream.
 *
 * Unbounded queues in live-tail resolvers are an OOM vector: a slow or
 * paused WS subscriber + `fullDocument: "updateLookup"` = burst load that
 * grows without bound (each entry carries a full Mongoose document).
 *
 * Policy: drop-oldest. When push() fills the queue, the oldest item is
 * discarded and `droppedCount` increments. Callers can surface the
 * dropped counter in a diagnostic event so consumers know they missed
 * updates and should refetch.
 */
export interface BoundedQueue<T> {
  push(item: T): void;
  shift(): T | undefined;
  readonly size: number;
  readonly droppedCount: number;
}

export function createBoundedQueue<T>(maxSize: number): BoundedQueue<T> {
  if (maxSize <= 0) throw new Error("maxSize must be positive");
  const buf: T[] = [];
  let dropped = 0;
  return {
    push(item: T) {
      if (buf.length >= maxSize) {
        buf.shift();
        dropped += 1;
      }
      buf.push(item);
    },
    shift() {
      return buf.shift();
    },
    get size() {
      return buf.length;
    },
    get droppedCount() {
      return dropped;
    },
  };
}
