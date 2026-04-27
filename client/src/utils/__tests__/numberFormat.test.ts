import { describe, it, expect } from "vitest";
import {
  formatThousands,
  parseThousands,
  THOUSANDS_PATTERN,
} from "../numberFormat";

describe("formatThousands", () => {
  it("formats integers with thousand separators", () => {
    expect(formatThousands(0)).toBe("0");
    expect(formatThousands(1234)).toBe("1,234");
    expect(formatThousands(1234567)).toBe("1,234,567");
  });

  it("preserves the decimal portion as-typed (not as JS Number)", () => {
    expect(formatThousands("1234.5")).toBe("1,234.5");
    expect(formatThousands("1234.50")).toBe("1,234.50");
    expect(formatThousands(1234.56)).toBe("1,234.56");
  });

  it("strips existing commas before reformatting", () => {
    expect(formatThousands("1,234")).toBe("1,234");
    expect(formatThousands("1,234,567.89")).toBe("1,234,567.89");
  });

  it("returns empty for nullish/empty inputs", () => {
    expect(formatThousands(undefined)).toBe("");
    expect(formatThousands(null)).toBe("");
    expect(formatThousands("")).toBe("");
  });

  it("passes through the transient lone-minus typing state", () => {
    expect(formatThousands("-")).toBe("-");
  });

  it("preserves negatives", () => {
    expect(formatThousands(-1234)).toBe("-1,234");
    expect(formatThousands("-1234.5")).toBe("-1,234.5");
  });
});

describe("parseThousands", () => {
  it("strips commas", () => {
    expect(parseThousands("1,234")).toBe("1234");
    expect(parseThousands("1,234,567.89")).toBe("1234567.89");
  });

  it("leaves comma-free values unchanged", () => {
    expect(parseThousands("1234.56")).toBe("1234.56");
    expect(parseThousands("")).toBe("");
  });
});

describe("formatThousands ↔ parseThousands round-trip", () => {
  it("survives common values", () => {
    const cases = ["0", "1", "1234", "12345.67", "1234567.89"];
    for (const c of cases) {
      expect(parseThousands(formatThousands(c))).toBe(c);
    }
  });
});

describe("THOUSANDS_PATTERN", () => {
  // Regression lock: the form's submit failure was caused by formatThousands
  // emitting comma-grouped strings that the input's HTML5 pattern attribute
  // (Chakra's default `[0-9]*(.[0-9]+)?`) rejected. THOUSANDS_PATTERN must
  // accept every legitimate output of formatThousands, including transient
  // typing states the input passes through.
  const re = new RegExp(THOUSANDS_PATTERN);

  const cases: Array<[string | number | undefined, string]> = [
    ["", ""],
    [0, "0"],
    [1234, "1,234"],
    [1234567, "1,234,567"],
    ["1234.56", "1,234.56"],
    [-1234.56, "-1,234.56"],
    ["1,234,567.89", "1,234,567.89"],
    ["-", "-"],
  ];

  it.each(cases)(
    "matches formatThousands(%p) = %p",
    (input, expected) => {
      const formatted = formatThousands(input);
      expect(formatted).toBe(expected);
      expect(re.test(formatted)).toBe(true);
    }
  );

  it("rejects values with characters outside the cost-input domain", () => {
    expect(re.test("12.34abc")).toBe(false);
    expect(re.test("12$34")).toBe(false);
    expect(re.test("1e3")).toBe(false);
  });
});
