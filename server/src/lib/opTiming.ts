/**
 * In-memory ring buffer + Apollo Server plugin for GraphQL operation timings.
 *
 * Development-focused: no persistence, no external sink, just a circular
 * window of recent ops readable via `/api/developer/slow-ops`. Useful when
 * diagnosing "why is the app slow right now" without standing up a full
 * observability stack.
 */

import { ApolloServerPlugin, GraphQLRequestContextWillSendResponse } from "apollo-server-plugin-base";

interface OpSample {
  operationName: string;
  durationMs: number;
  status: "ok" | "error";
  timestamp: number;
}

const BUFFER_SIZE = 500;
const buffer: OpSample[] = [];
let cursor = 0;

const record = (sample: OpSample) => {
  if (buffer.length < BUFFER_SIZE) {
    buffer.push(sample);
  } else {
    buffer[cursor] = sample;
    cursor = (cursor + 1) % BUFFER_SIZE;
  }
};

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

export interface OpAggregate {
  operationName: string;
  count: number;
  errors: number;
  p50: number;
  p95: number;
  max: number;
  lastSeenAt: number;
}

export interface OpTimingSnapshot {
  windowSize: number;
  windowSeconds: number;
  operations: OpAggregate[];
}

export const getSnapshot = (): OpTimingSnapshot => {
  if (buffer.length === 0) {
    return { windowSize: 0, windowSeconds: 0, operations: [] };
  }

  const byOp = new Map<string, OpSample[]>();
  for (const s of buffer) {
    const arr = byOp.get(s.operationName);
    if (arr) arr.push(s);
    else byOp.set(s.operationName, [s]);
  }

  const operations: OpAggregate[] = [];
  for (const [name, samples] of byOp) {
    const sorted = samples
      .map((s) => s.durationMs)
      .sort((a, b) => a - b);
    operations.push({
      operationName: name,
      count: samples.length,
      errors: samples.filter((s) => s.status === "error").length,
      p50: Math.round(percentile(sorted, 50)),
      p95: Math.round(percentile(sorted, 95)),
      max: Math.round(sorted[sorted.length - 1]),
      lastSeenAt: Math.max(...samples.map((s) => s.timestamp)),
    });
  }

  // Sort by p95 desc — slow things bubble up first.
  operations.sort((a, b) => b.p95 - a.p95);

  const oldest = Math.min(...buffer.map((s) => s.timestamp));
  const newest = Math.max(...buffer.map((s) => s.timestamp));
  return {
    windowSize: buffer.length,
    windowSeconds: Math.round((newest - oldest) / 1000),
    operations,
  };
};

export const opTimingPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const start = Date.now();
    let hadErrors = false;
    return {
      async didEncounterErrors() {
        hadErrors = true;
      },
      async willSendResponse(ctx: GraphQLRequestContextWillSendResponse<Record<string, unknown>>) {
        record({
          operationName: ctx.operationName ?? "anonymous",
          durationMs: Date.now() - start,
          status: hadErrors ? "error" : "ok",
          timestamp: Date.now(),
        });
      },
    };
  },
};
