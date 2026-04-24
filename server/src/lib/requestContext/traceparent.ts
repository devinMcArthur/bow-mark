import { randomBytes } from "crypto";

/**
 * W3C Trace Context version. We only support version 00 (the only one
 * defined at the time of writing). If we ever see a newer version header
 * on an inbound request, we fall through to starting a fresh trace.
 */
export const TRACEPARENT_VERSION = "00";

const TRACE_ID_BYTES = 16;
const SPAN_ID_BYTES = 8;
const TRACE_ID_HEX = TRACE_ID_BYTES * 2;
const SPAN_ID_HEX = SPAN_ID_BYTES * 2;
const TRACE_ID_ZERO = "0".repeat(TRACE_ID_HEX);
const SPAN_ID_ZERO = "0".repeat(SPAN_ID_HEX);

export function randomTraceId(): string {
  return randomBytes(TRACE_ID_BYTES).toString("hex");
}

export function randomSpanId(): string {
  return randomBytes(SPAN_ID_BYTES).toString("hex");
}

export interface TraceparentFields {
  traceId: string;
  spanId: string;
}

/**
 * Format a W3C Trace Context `traceparent` header value.
 * We always set the `sampled` flag to 01 — sampling is a concern of a
 * future OTel adoption, not of this primitive.
 */
export function formatTraceparent(fields: TraceparentFields): string {
  return `${TRACEPARENT_VERSION}-${fields.traceId}-${fields.spanId}-01`;
}

/**
 * Parse a W3C Trace Context `traceparent` header. Returns null if the
 * header is missing, malformed, uses an unsupported version, or carries
 * the all-zero trace/span IDs defined as invalid by the W3C spec.
 */
export function parseTraceparent(
  header: string | undefined | null
): TraceparentFields | null {
  if (!header) return null;
  const parts = header.split("-");
  if (parts.length !== 4) return null;
  const [version, traceId, spanId] = parts;
  if (version !== TRACEPARENT_VERSION) return null;
  if (traceId.length !== TRACE_ID_HEX || !/^[0-9a-f]+$/.test(traceId)) return null;
  if (spanId.length !== SPAN_ID_HEX || !/^[0-9a-f]+$/.test(spanId)) return null;
  if (traceId === TRACE_ID_ZERO || spanId === SPAN_ID_ZERO) return null;
  return { traceId, spanId };
}
