# Tender Pricing Sheet — Design Spec

**Date:** 2026-03-20
**Status:** Approved for implementation

## Background

Bow-Mark currently prices construction tenders using internal Excel templates. The process has two core problems:

1. **Opacity** — Markup is embedded as implicit assumptions (e.g., sandbagged production rates) rather than explicit values, making it hard to audit and hard for new estimators to learn.
2. **Isolation** — The Excel sheet is disconnected from the rest of the app: no link to tender documents, no connection to actual cost data, no progress tracking post-award.

This spec describes Phase 1: a web-based pricing tool embedded in the existing Tender record that replaces the Excel sheets. The goal is a functional, transparent replacement — explicit cost breakdown, explicit markup, parametric calculators per work type. LLM assistance and bid-vs-actual tracking are explicitly deferred to later phases.

---

## Where It Lives

The pricing sheet lives inside the existing Tender record, accessible via a new sub-route:

```
/tender/[id]/pricing
```

A "Pricing" button is added to the existing tender detail page. The existing `pages/tender/[id].tsx` is renamed to `pages/tender/[id]/index.tsx` to enable the sub-route. Next.js 12 dynamic route folder behavior preserves all existing `/tender/[id]` URLs and the `?conversationId=` deep-link query parameter.

---

## Data Model

### TenderPricingSheet (new MongoDB collection)

The sheet contains a single flat ordered array of rows. Schedules, groups, and line items are all rows — no nested sub-documents, no separate collections.

```typescript
TenderPricingSheet {
  _id: ObjectId
  tender: Ref<TenderClass>       // one-to-one with Tender
  defaultMarkupPct: number       // e.g., 15 = 15%
  rows: TenderPricingRow[]       // flat ordered array
  createdAt: Date
  updatedAt: Date
}
```

### TenderPricingRow (embedded)

```typescript
TenderPricingRow {
  _id: ObjectId
  type: TenderPricingRowType     // "schedule" | "group" | "item"
  sortOrder: number              // position in flat list
  itemNumber: string             // free text: "1", "1F", "1F.7", "1F.7a" — never parsed
  description: string
  indentLevel: number            // 0 = schedule, 1+ = group nesting depth

  // Pricing — only present on type === "item"
  quantity?: number
  unit?: string                  // m², m³, m, tonnes, LS, CA, etc.
  subcontractorUP?: number | null
  truckingUP?: number            // default 0; stored source of truth
  materialUP?: number            // default 0; stored source of truth
  crewUP?: number                // default 0; stored source of truth
  rentalUP?: number              // default 0; stored source of truth
  markupOverride?: number | null // null = use sheet defaultMarkupPct

  // Calculator — only on type === "item"
  calculatorType?: TenderWorkType
  calculatorInputs?: object      // stored as JSON scalar; see calculator section
}
```

**The 4 UP columns are the stored source of truth.** `calculatorInputs` are stored alongside them. When the user saves the calculator, the computed values overwrite the UP columns. If the user then manually edits an UP column directly, `calculatorInputs` are left as-is (no stale indicator in Phase 1 — the manual edit simply wins). On next open of the calculator, inputs are shown as previously saved and the output bar reflects whatever is in the UP columns.

### Enums

```typescript
enum TenderPricingRowType {
  Schedule = "schedule",
  Group    = "group",
  Item     = "item",
}

enum TenderWorkType {
  Paving           = "Paving",
  Toplift          = "Toplift",
  Gravel           = "Gravel",
  SubgradePrep     = "SubgradePrep",
  CommonExcavation = "CommonExcavation",
  Concrete         = "Concrete",
  // Expandable: new types added here by developers as needed
}
```

### Computed values (client-side, never stored)

```
totalUP          = (subcontractorUP ?? 0) + truckingUP + materialUP + crewUP + rentalUP
effectiveMarkup  = markupOverride ?? sheet.defaultMarkupPct
suggestedBidUP   = totalUP × (1 + effectiveMarkup / 100)
lineItemTotal    = suggestedBidUP × quantity
```

**Subtotal traversal rule:** Walk forward through the sorted array. Accumulate `lineItemTotal` for all `item` rows encountered until reaching a row whose `type === "schedule"` OR whose `indentLevel ≤ the current header row's indentLevel`. This applies to both group and schedule subtotals.

```
sheetTotal = Σ all lineItemTotal
```

### Modify Tender

Add `pricingSheet?: Ref<TenderPricingSheetClass>` (nullable) to the Tender schema. The pricing page calls `tenderPricingSheetCreate` on mount if `tenderPricingSheet(tenderId)` returns null (client-side lazy creation, not server-side).

---

## Calculator System

Each line item has an optional calculator that derives the 4 cost columns from first-principles inputs. Work types are **developer-defined templates** — not user-configurable in Phase 1, designed for easy extension.

### Calculation basis

Each work type defines a `calculationBasis` that determines which formula path is used:

```typescript
type CalculationBasis = "tonnage" | "volume" | "area" | "lumpsum"
```

- `tonnage` — Gravel, Paving, Toplift (depth × density → t/unit; all resource rates ÷ productionRate t/h)
- `volume` — SubgradePrep, CommonExcavation (m³/unit; resource rates ÷ productionRate m³/h)
- `area` — surface treatments without depth (m²/unit; resource rates ÷ productionRate m²/h)
- `lumpsum` — LS/CA items; calculator not applicable, fields hidden, UP columns entered manually

### Calculator inputs (stored as JSON scalar)

GraphQL does not support `any`-typed fields. `calculatorInputs` is stored and transmitted as a `JSON` scalar (already common in this stack — confirm or add `GraphQLJSON` scalar if not present). The shape is:

```typescript
interface TenderCalculatorInputs {
  productionRate: number         // t/h, m³/h, or m²/h depending on calculationBasis
  crew: TenderCrewEntry[]
  equipment: TenderEquipEntry[]

  // tonnage / volume basis:
  depth_mm?: number
  density?: number               // t/m³ (tonnage) or n/a (volume uses 1.0)
  materialCostPerUnit?: number   // $/tonne or $/m³

  // trucking:
  truckingMethod?: "perTonne" | "perHour"
  truckingRatePerTonne?: number
  numTrucks?: number
  truckingRatePerHour?: number

  // type-specific extras added per work type (e.g., concrete: rebarDensity, formworkCostPerM2)
  [key: string]: unknown
}

interface TenderCrewEntry {
  role: string
  quantity: number
  ratePerHour: number
}

interface TenderEquipEntry {
  name: string
  quantity: number
  ratePerHour: number
}
```

### Computation formulas (client-side)

```
// Tonnage basis
unitsPerBaseUnit    = (depth_mm / 1000) × density
materialUP          = unitsPerBaseUnit × materialCostPerUnit
truckingUP (perTonne)  = unitsPerBaseUnit × truckingRatePerTonne
truckingUP (perHour)   = (numTrucks × truckingRatePerHour × unitsPerBaseUnit) / productionRate
crewUP              = (Σ crew[i].qty × crew[i].rate) × unitsPerBaseUnit / productionRate
rentalUP            = (Σ equip[i].qty × equip[i].rate) × unitsPerBaseUnit / productionRate

// Volume basis (SubgradePrep, CommonExcavation): same formulas, unitsPerBaseUnit = 1.0
// Area basis: same formulas, unitsPerBaseUnit = 1.0, materialCostPerUnit = $/m²
// Lumpsum basis: calculator hidden, all UP fields entered manually
```

### Rate Library

A global singleton `TenderRateLibrary` document (one document for the entire app, shared across paving and concrete instances — rates are company-wide):

```typescript
TenderRateLibrary {
  _id: ObjectId
  crewConfigs: TenderCrewConfig[]
  equipConfigs: TenderEquipConfig[]
}

TenderCrewConfig  { _id, name: string, entries: TenderCrewEntry[]  }  // e.g., "Standard Gravel Crew"
TenderEquipConfig { _id, name: string, entries: TenderEquipEntry[] }  // e.g., "Gravel Equipment Package"
```

Loaded into the calculator as defaults, fully overrideable per line item. Designed to eventually be auto-populated from actual crew/equipment cost data already tracked in the app.

---

## Access Control

The pricing sheet (both the route and all GraphQL operations) is restricted to `ADMIN` and `PM` roles. Non-PM users navigating to `/tender/[id]/pricing` are redirected. There is no read-only access for lower roles in Phase 1 — bid values and markup are commercially sensitive.

---

## GraphQL API

### Queries
```
tenderPricingSheet(tenderId: ID!): TenderPricingSheet
tenderRateLibrary: TenderRateLibrary
```

### Mutations
```
// Sheet
tenderPricingSheetCreate(tenderId: ID!): TenderPricingSheet
tenderPricingSheetUpdateMarkup(id: ID!, defaultMarkupPct: Float!): TenderPricingSheet

// Rows — all return full updated sheet
tenderPricingRowCreate(sheetId: ID!, data: TenderPricingRowCreateData!): TenderPricingSheet
tenderPricingRowUpdate(sheetId: ID!, rowId: ID!, data: TenderPricingRowUpdateData!): TenderPricingSheet
tenderPricingRowDelete(sheetId: ID!, rowId: ID!): TenderPricingSheet
tenderPricingRowReorder(sheetId: ID!, rowIds: [ID!]!): TenderPricingSheet
  // rowIds must be the complete ordered list of all row IDs for the sheet.
  // No structural validation — hierarchy is purely visual; order is user responsibility.

// Rate library
tenderRateLibraryAddCrewConfig(data: TenderCrewConfigData!): TenderRateLibrary
tenderRateLibraryUpdateCrewConfig(id: ID!, data: TenderCrewConfigData!): TenderRateLibrary
tenderRateLibraryDeleteCrewConfig(id: ID!): TenderRateLibrary
tenderRateLibraryAddEquipConfig(data: TenderEquipConfigData!): TenderRateLibrary
tenderRateLibraryUpdateEquipConfig(id: ID!, data: TenderEquipConfigData!): TenderRateLibrary
tenderRateLibraryDeleteEquipConfig(id: ID!): TenderRateLibrary
```

**Input types:** `TenderPricingRowCreateData` and `TenderPricingRowUpdateData` accept `calculatorInputs` as a `JSON` scalar. All other fields are typed normally.

All mutations: `@Authorized(["ADMIN", "PM"])`.

---

## UI Design

### Pricing page layout

Full-width page at `/tender/[id]/pricing`:

```
[Breadcrumbs: Tenders › Job Name › Pricing]
[Add Row: ■ Schedule  ▸ Group  + Line Item]   [Default Markup: 15%]   [Sheet Total: $X,XXX,XXX]

Single flat table:
  ─ Schedule row (dark header, full width, shows schedule subtotal)
      ─ Group row (lighter header, indented, shows group subtotal)
          ─ Group row (deeper indent)
              item row: # | Description | Qty | Unit | Subcon | Truck | Mat | Crew | Rent | Total UP | Markup | Bid UP | ✏ 🗑
              item row
```

- Markup column shows: `DEFAULT`, `+2%`, `−3%` relative to sheet default
- Item numbering is free text — no auto-generation
- Rows can be reordered (drag handle or up/down buttons)

### Calculator panel

Clicking ✏ on a line item opens a split view: sheet list on the left for context/navigation, calculator on the right.

Calculator panel top-to-bottom:
1. **Output bar** — always visible, live-updating: Truck UP / Material UP / Crew UP / Rental UP / Bid UP
2. **Work Type** — pill selector; sets `calculationBasis` and visible input fields. `lumpsum` types hide all calculator sections.
3. **Material** — depth, density, material cost → derived `unitsPerBaseUnit` and Material UP shown inline
4. **Production Rate** — single field with note: *"Use markup % for margin, not this field"*
5. **Trucking** — method toggle (per tonne / per hour) → Trucking UP
6. **Crew** — role table (qty × rate/h) with "Load from library" → Crew UP with formula shown
7. **Equipment** — equipment table (qty × rate/h) with "Load from library" → Rental UP with formula shown

Formulas displayed inline below each section so estimators see exactly where each number comes from.

---

## File Map

### Server (new)
- `server/src/typescript/tenderPricingSheet.ts` — enums, interfaces, calculator types
- `server/src/models/TenderPricingSheet/schema/index.ts`
- `server/src/models/TenderPricingSheet/class/index.ts`
- `server/src/models/TenderPricingSheet/class/get.ts`
- `server/src/models/TenderPricingSheet/class/create.ts`
- `server/src/models/TenderPricingSheet/class/update.ts`
- `server/src/models/TenderRateLibrary/schema/index.ts`
- `server/src/models/TenderRateLibrary/class/index.ts`
- `server/src/models/TenderRateLibrary/class/get.ts`
- `server/src/models/TenderRateLibrary/class/update.ts`
- `server/src/graphql/resolvers/tenderPricingSheet/index.ts`
- `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`
- `server/src/graphql/resolvers/tenderRateLibrary/index.ts`
- `server/src/graphql/resolvers/tenderRateLibrary/mutations.ts`

### Server (modified)
- `server/src/models/Tender/schema/index.ts` — add `pricingSheet` ref
- `server/src/models/index.ts` — register both new models
- (resolver registration file — confirm location during implementation)
- (confirm `GraphQLJSON` scalar is registered; add if not)

### Client (new)
- `client/src/pages/tender/[id]/pricing.tsx`
- `client/src/components/TenderPricing/types.ts`
- `client/src/components/TenderPricing/compute.ts` — all client-side formula logic
- `client/src/components/TenderPricing/PricingSheet.tsx`
- `client/src/components/TenderPricing/PricingRow.tsx`
- `client/src/components/TenderPricing/CalculatorPanel.tsx`
- `client/src/components/TenderPricing/calculators/types.ts` — `WorkTypeTemplate` interface
- `client/src/components/TenderPricing/calculators/gravel.ts`
- `client/src/components/TenderPricing/calculators/paving.ts`
- `client/src/components/TenderPricing/calculators/index.ts` — registry: `Record<TenderWorkType, WorkTypeTemplate>`

### Client (modified)
- `client/src/pages/tender/[id].tsx` → renamed to `client/src/pages/tender/[id]/index.tsx`
- `client/src/pages/tender/[id]/index.tsx` — add "Pricing" button/link

---

## Verification

1. Open a tender → click "Pricing" → sheet created automatically, empty state shown
2. Add a Schedule row, then two Group rows at different indent levels, then 3 line items
3. Set cost values on line items — confirm Total UP, Bid UP, and schedule subtotals compute correctly
4. Override markup on one item — confirm it changes independently of the sheet default
5. Open calculator for a Gravel item — set all inputs — confirm all 4 UPs update live in the output bar, and match the formula shown inline
6. Save calculator — confirm UP columns on the row are updated in the sheet
7. Manually edit a UP column directly — confirm the value is saved independently of calculatorInputs
8. Load a crew config from the rate library — confirm it pre-fills the crew table
9. Switch work type to a lumpsum type — confirm calculator sections are hidden
10. Reorder rows — confirm sort order persists on reload
11. Delete a row — confirm it disappears and subtotals update
12. Confirm PM role can access; non-PM is redirected
