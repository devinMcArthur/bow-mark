// client/src/constants/units.ts
// Keep in sync with server/src/constants/units.ts (identical except for the unitLabel helper function) — static data, no GQL roundtrip needed.

export type UnitDimension = "area" | "volume" | "length" | "mass" | "time" | null;

export interface CanonicalUnit {
  code: string;
  label: string;
  name: string;
  dimension: UnitDimension;
}

export const CANONICAL_UNITS: CanonicalUnit[] = [
  { code: "m2",     label: "m²",     name: "Square Metres",  dimension: "area"   },
  { code: "sqft",   label: "sq.ft.", name: "Square Feet",    dimension: "area"   },
  { code: "m3",     label: "m³",     name: "Cubic Metres",   dimension: "volume" },
  { code: "yards",  label: "yd³",   name: "Cubic Yards",    dimension: "volume" },
  { code: "lm",     label: "lm",     name: "Lineal Metres",  dimension: "length" },
  { code: "mm",     label: "mm",     name: "Millimetres",    dimension: "length" },
  { code: "cm",     label: "cm",     name: "Centimetres",    dimension: "length" },
  { code: "inches", label: "in",     name: "Inches",         dimension: "length" },
  { code: "t",      label: "t",      name: "Tonnes",         dimension: "mass"   },
  { code: "hr",     label: "hr",     name: "Hours",          dimension: "time"   },
  { code: "day",    label: "day",    name: "Days",           dimension: "time"   },
  { code: "ea",     label: "EA",     name: "Each",           dimension: null     },
  { code: "ls",     label: "LS",     name: "Lump Sum",       dimension: null     },
];

export const CANONICAL_UNIT_CODES = new Set(CANONICAL_UNITS.map((u) => u.code));

/**
 * Maps legacy stored strings to canonical codes.
 * Only entries that need to change are listed here.
 */
export const UNIT_LEGACY_MAP: Record<string, string> = {
  "tonnes": "t",
  "each":   "ea",
  "sq.ft.": "sqft",
};

export function resolveUnitCode(raw: string): string {
  return UNIT_LEGACY_MAP[raw] ?? raw;
}

/** Return the display label for a unit code (canonical or custom). */
export function unitLabel(code: string): string {
  return CANONICAL_UNITS.find((u) => u.code === code)?.label ?? code;
}
