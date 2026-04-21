import {
  RESERVED_NAMESPACE_PATHS,
  namespaceRootForPath,
  normalizeNodeName,
  ENRICHABLE_NAMESPACES,
} from "../reservedRoots";

describe("reservedRoots", () => {
  it("lists all expected namespace paths", () => {
    expect(RESERVED_NAMESPACE_PATHS).toContain("/system/specs");
    expect(RESERVED_NAMESPACE_PATHS).toContain("/tenders");
    expect(RESERVED_NAMESPACE_PATHS).toContain("/jobsites");
    expect(RESERVED_NAMESPACE_PATHS).toContain("/daily-reports");
  });

  it("namespaceRootForPath returns the outermost namespace (not per-entity)", () => {
    expect(namespaceRootForPath(["/", "/tenders", "/tenders/abc123"])).toBe("/tenders");
    expect(namespaceRootForPath(["/", "/system", "/system/specs"])).toBe("/system/specs");
    expect(namespaceRootForPath(["/", "/jobsites", "/jobsites/xyz789"])).toBe("/jobsites");
    expect(namespaceRootForPath(["/"])).toBeNull();
  });

  it("ENRICHABLE_NAMESPACES includes system.specs, tenders, jobsites; excludes daily-reports", () => {
    expect(ENRICHABLE_NAMESPACES["/system/specs"]).toBe(true);
    expect(ENRICHABLE_NAMESPACES["/tenders"]).toBe(true);
    expect(ENRICHABLE_NAMESPACES["/jobsites"]).toBe(true);
    expect(ENRICHABLE_NAMESPACES["/daily-reports"]).toBe(false);
  });

  it("normalizeNodeName applies NFC + casefold + whitespace trim/collapse", () => {
    expect(normalizeNodeName("  Foo   Bar  ")).toBe("foo bar");
    expect(normalizeNodeName("HELLO")).toBe("hello");
    // NFC normalization: e + combining acute → single é
    const combined = "e" + "́";
    const precomposed = "é";
    expect(normalizeNodeName(combined)).toBe(precomposed);
  });
});
