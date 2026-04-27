/**
 * Active context for an in-flight request. Propagated via AsyncLocalStorage.
 * Shape is W3C Trace Context compatible — when we adopt OpenTelemetry proper,
 * traceId / spanId / parentSpanId map directly onto the OTel span context.
 *
 * `actorKind` distinguishes human-initiated work from AI-initiated (MCP tool
 * use via human chat), agent-initiated (external automation via API key), and
 * system-initiated (cron, consumer) so DomainEvents can attribute correctly
 * without the caller having to pass it explicitly every time.
 */
export interface RequestContext {
  // W3C Trace Context core
  traceId: string;
  spanId: string;
  parentSpanId?: string;

  // Who
  actorKind: "user" | "ai" | "agent" | "system";
  userId?: string;
  agentId?: string;
  onBehalfOf?: string;

  // MCP access scope — present only on MCP requests. "read" agents cannot
  // call write tools; absence implies full readwrite (existing human flows).
  mcpScope?: "read" | "readwrite";

  // Session / correlation
  sessionId?: string;
  correlationId?: string;

  // Free-form baggage for future expansion (mirrors OTel Baggage API)
  baggage?: Record<string, string>;
}
