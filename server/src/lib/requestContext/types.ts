/**
 * Active context for an in-flight request. Propagated via AsyncLocalStorage.
 * Shape is W3C Trace Context compatible — when we adopt OpenTelemetry proper,
 * traceId / spanId / parentSpanId map directly onto the OTel span context.
 *
 * `actorKind` distinguishes human-initiated work from AI-initiated (MCP tool
 * use) and system-initiated (cron, consumer) so DomainEvents can attribute
 * correctly without the caller having to pass it explicitly every time.
 */
export interface RequestContext {
  // W3C Trace Context core
  traceId: string;
  spanId: string;
  parentSpanId?: string;

  // Who
  actorKind: "user" | "ai" | "system";
  userId?: string;
  onBehalfOf?: string;

  // Session / correlation
  sessionId?: string;
  correlationId?: string;

  // Free-form baggage for future expansion (mirrors OTel Baggage API)
  baggage?: Record<string, string>;
}
