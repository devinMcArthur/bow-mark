import {
  randomTraceId,
  randomSpanId,
  parseTraceparent,
  formatTraceparent,
  TRACEPARENT_VERSION,
} from "../traceparent";

describe("traceparent", () => {
  it("randomTraceId returns 32 hex chars (16 bytes)", () => {
    const id = randomTraceId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("randomSpanId returns 16 hex chars (8 bytes)", () => {
    const id = randomSpanId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it("formatTraceparent produces canonical W3C format", () => {
    const out = formatTraceparent({
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
    });
    expect(out).toBe(
      `${TRACEPARENT_VERSION}-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
    );
  });

  it("parseTraceparent roundtrips a valid header", () => {
    const header =
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const parsed = parseTraceparent(header);
    expect(parsed).toEqual({
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
    });
  });

  it("parseTraceparent returns null for malformed input", () => {
    expect(parseTraceparent("")).toBeNull();
    expect(parseTraceparent("not-a-header")).toBeNull();
    expect(parseTraceparent("00-short-00f067aa0ba902b7-01")).toBeNull();
    expect(parseTraceparent("99-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")).toBeNull();
  });

  it("parseTraceparent rejects all-zero trace or span ids", () => {
    expect(
      parseTraceparent("00-00000000000000000000000000000000-00f067aa0ba902b7-01")
    ).toBeNull();
    expect(
      parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01")
    ).toBeNull();
  });
});
