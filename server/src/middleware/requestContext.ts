import type { Request, Response, NextFunction } from "express";
import {
  runWithContext,
  parseTraceparent,
  formatTraceparent,
  randomTraceId,
  randomSpanId,
  type RequestContext,
} from "@lib/requestContext";

/**
 * Stamps every inbound HTTP request with an ALS-backed RequestContext.
 *
 *  - If the client sent a W3C `traceparent` header, we continue that trace
 *    and open a new child span under it.
 *  - Otherwise we start a fresh trace.
 *
 * The outbound response also carries a `traceparent` header so the client
 * can propagate the ID back into its next request (future client-side
 * error reports will then pivot on the same trace).
 *
 * `userId` / `sessionId` are populated by downstream middleware (auth)
 * and Apollo's context fn — see app.ts. This middleware just establishes
 * the trace/span scaffolding and a default actorKind="user"; auth
 * middleware can refine it.
 */
export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const inbound = parseTraceparent(req.header("traceparent"));
  const ctx: RequestContext = inbound
    ? {
        traceId: inbound.traceId,
        spanId: randomSpanId(),
        parentSpanId: inbound.spanId,
        actorKind: "user",
      }
    : {
        traceId: randomTraceId(),
        spanId: randomSpanId(),
        actorKind: "user",
      };

  res.setHeader(
    "traceparent",
    formatTraceparent({ traceId: ctx.traceId, spanId: ctx.spanId })
  );

  runWithContext(ctx, () => {
    next();
  });
}
