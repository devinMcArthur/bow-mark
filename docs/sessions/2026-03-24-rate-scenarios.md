# Session Context — Rate Scenarios Feature (2026-03-24)

## Branch
`feature/jobsite-material-rate-scenarios`

---

## Background & Motivation

Bow-Mark tracks material costs on jobsites via `JobsiteMaterial` documents. Historically, a material had a flat costing model:
- `costType`: `"rate"` | `"deliveredRate"` | `"invoice"`
- `rates[]`: date-indexed per-tonne rates (for pickup)
- `deliveredRates[]`: named trucking-type rates when delivery is included
- `delivered`: boolean

This model was inflexible — a single material could only have one costing mode. In practice, a jobsite might receive the same material via pickup AND multiple delivery configurations (tandem, truck and pup, etc.) at different rates. The old model couldn't represent this.

### New Model

The new model introduces `costModel` and `scenarios[]`:

```
JobsiteMaterial {
  costModel: "rate" | (legacy values)
  scenarios: [{
    _id
    label: string       // "Pickup", "Tandem", "Truck and Pup", etc.
    delivered: boolean  // whether trucking cost is included in the rate
    rates: [{ date, rate, estimated }]
  }]
}
```

When `costModel === "rate"`, the material uses scenarios. Legacy materials (costType rate/deliveredRate/invoice) continue using the old fields and are untouched.

On the daily report material shipment form, the user picks which scenario applies to a given shipment via `vehicleObject.rateScenarioId`.

---

## Work Done This Session

### Problem 1: Infinite loop on "Add Scenario" in create form

**Root cause:** `Rates.tsx` had a mount-time `useEffect`:
```tsx
React.useEffect(() => {
  if (onChange) onChange(ratesCopy);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```
This called `onChange` every time `JobsiteMaterialRatesForm` mounted. In the create form context, `onChange` was an inline arrow function `(rates) => onChange({ ...draft, rates })` — creating a new object on every call. This triggered state update → re-render → new `onChange` reference → potential remount → repeat. "Maximum update depth exceeded."

**Fix:** Removed the mount-time `useEffect` entirely from `Rates.tsx`. The parent already initialises with data from `emptyDraft()`, so the call-on-mount was unnecessary.

**File:** `client/src/components/Forms/JobsiteMaterial/Rates.tsx`

---

### Problem 2: Input loses focus on every keystroke in the create form

**Root cause:** `ScenarioForm` (and the rates inputs inside it) was rendered inside `FormComponents.Form`. Every time the user typed a character, `setNewDraft` was called → `JobsiteMaterialCreate` re-rendered → `FormComponents.Form` re-rendered → component tree inside was unmounted/remounted (because `FormComponents` re-creates component references) → input lost focus.

This did NOT happen in the update form because `ScenariosList` is rendered **outside** `FormComponents.Form` in `JobsiteMaterialUpdate`.

**Fix:** Moved the entire rate scenarios section (scenario list + `ScenarioForm`) outside of `FormComponents.Form` in `JobsiteMaterialCreate`. The form now wraps only the fields that feed into RHF (material, supplier, quantity, unit, costing type selector, invoice fields, submit button). Scenarios are rendered below as a sibling.

**File:** `client/src/components/Forms/JobsiteMaterial/JobsiteMaterialCreate.tsx`

---

### Feature: JobsiteMaterialCreate rewrite

The create form previously showed the legacy CostType dropdown. It was fully rewritten to:

- Show a `CreateCostMode` selector: `"rateScenario"` (default) | `"invoice"`
- **Rate Scenarios mode**: inline scenario builder
  - Local state: `ScenarioDraft[]` (not persisted until submit)
  - User can add / inline-edit / remove scenarios before submitting
  - On submit: sends `{ costType: Rate, costModel: Rate, rates: [], deliveredRates: [], scenarios: [...] }`
- **Invoice mode**: shows `FormComponents.Delivered` + info tooltip + note that invoices are added post-creation
- Uses `setValue("costType", ...)` from RHF to keep internal form validation in sync with the selected mode

`ScenarioDraft`, `emptyDraft()`, and `ScenarioForm` were exported from `ScenariosList.tsx` to be reused here.

**File:** `client/src/components/Forms/JobsiteMaterial/JobsiteMaterialCreate.tsx`

---

### Feature: JobsiteMaterialUpdate wiring

When `jobsiteMaterial.costModel === JobsiteMaterialCostModel.Rate`:
- Hides legacy CostType / Delivered / Rates fields (they don't apply to the new model)
- Renders `ScenariosList` below the form for managing scenarios via individual mutations

**File:** `client/src/components/Forms/JobsiteMaterial/JobsiteMaterialUpdate.tsx`

---

### Feature: ScenarioForm UX decisions

Several design decisions were made iteratively:

1. **Label field replaced with trucking type dropdown** — when `truckingRates` are available, the free-text label input is replaced with a `<Select>` populated from the jobsite's trucking rate titles (e.g. "Tandem", "Truck and Pup", "Truck and Tri"). Falls back to free-text if no rates provided.

2. **Label only shown when delivered** — if a scenario is not delivered, the label is always "Pickup" (implicit). There's no need for the user to set a label. The label field (trucking type dropdown) only appears when the "Delivered" checkbox is checked.

3. **Auto-set label on delivered toggle**:
   - Checking "Delivered" → clears label to `""` (user must pick trucking type)
   - Unchecking "Delivered" → auto-sets label to `"Pickup"`
   - `emptyDraft()` initialises with `label: "Pickup", delivered: false`

4. **Badge display** — scenario cards show just the label text. A green "Delivered" badge appears only when `delivered === true`. No badge for pickup (the label "Pickup" is self-explanatory).

**File:** `client/src/components/Forms/JobsiteMaterial/ScenariosList.tsx`

---

### Feature: Daily report material shipment — scenario selector

When a material shipment's selected jobsite material uses `costModel === Rate`, a "Rate Scenario" dropdown appears above the vehicle section. The user selects which scenario applies (e.g. "Tandem", "Pickup"), which sets `vehicleObject.rateScenarioId`.

Implementation:
- `scenarioMaterial` memo detects the selected material's cost model
- `updateScenario` callback sets `vehicleObject.rateScenarioId`
- `useEffect` on `scenarioMaterial` auto-selects the first scenario when the material changes
- The selector only renders when `scenarioMaterial` has at least one scenario

**Fragment change:** `JobsiteMaterial_DailyReport.graphql` now includes `costModel` and `scenarios { _id label delivered }`.

**File:** `client/src/components/Forms/MaterialShipment/Data.tsx`
**File:** `client/src/graphql/fragments/JobsiteMaterial_DailyReport.graphql`

---

### Feature: Trucking rates threading

To populate the scenario label dropdown, `truckingRates` needed to flow from the jobsite down to `ScenarioForm`. The full chain:

```
JobsiteMaterials.tsx (propJobsite.truckingRates)
  → JobsiteMaterialCreate (truckingRates prop)
      → ScenarioForm (truckingRates prop)
  → JobsiteMaterialCard (truckingRates prop)
      → JobsiteMaterialUpdate (truckingRates prop)
          → ScenariosList (truckingRates prop)
              → ScenarioCard (truckingRates prop)
                  → ScenarioForm (truckingRates prop)
              → ScenarioForm [add] (truckingRates prop)
```

All props typed as `{ title: string }[]` (minimal shape — only `title` is needed).

`JobsiteFullSnippetFragment` already includes `truckingRates { ...TruckingTypeRateSnippet }`, so no new GraphQL queries were needed. `JobsitesMaterialsQuery` does NOT include trucking rates — they come from `propJobsite` (the full fragment passed into `JobsiteMaterialsCosting`).

**Files modified:** `JobsiteMaterialCard.tsx`, `JobsiteMaterialUpdate.tsx`, `JobsiteMaterialCreate.tsx`, `ScenariosList.tsx`, `JobsiteMaterials.tsx`

---

## Known Remaining Work

### 1. `onMutated` no-op in update form
`ScenariosList` is passed `onMutated={() => {}}` from `JobsiteMaterialUpdate`. This means when a scenario is added/edited/removed, the parent card does not refresh. The Apollo cache should update automatically via normalized caching if the mutation returns the full `JobsiteMaterialCardSnippet`, but this hasn't been explicitly verified.

### 2. End-to-end create submit not fully verified
The create form was tested for UI correctness (form opens, Add Scenario works, focus is retained, dropdown populates), but a full submit with material + supplier + scenarios going through to the server and appearing in the card list was not confirmed in this session.

### 3. Server-side mutations assumed to exist
The following GraphQL mutations were assumed to be wired up from prior sessions:
- `jobsiteAddMaterial` accepting `scenarios[]` in `JobsiteMaterialCreateData`
- `jobsiteMaterialScenarioAdd`
- `jobsiteMaterialScenarioUpdate`
- `jobsiteMaterialScenarioRemove`

If any of these are missing or broken, the feature won't work end-to-end.

### 4. Legacy material migration
No UI exists yet for converting a legacy material (old costType model) to the new scenario model. Not requested — noted for future consideration.

### 5. Daily report scenario selector — server usage
`rateScenarioId` is now sent in `vehicleObject` on material shipment create/update. Whether the server actually uses it in cost calculations (instead of or alongside the old rate lookup) needs to be confirmed.

### 6. `JobsiteFullSnippetFragment` — scenarios field
The `JobsiteMaterialCardSnippet` (used on the jobsite page) needs to include `scenarios` and `costModel` fields for `ScenariosList` to render correctly in the update form. This was added in a prior session — confirm it's in the fragment and that `npm run codegen` has been run.

---

## File Reference

| File | Change |
|------|--------|
| `client/src/components/Forms/JobsiteMaterial/Rates.tsx` | Removed mount-time `onChange` useEffect |
| `client/src/components/Forms/JobsiteMaterial/ScenariosList.tsx` | Exported ScenarioDraft/emptyDraft/ScenarioForm; label/badge UX; truckingRates prop; delivered-only label field |
| `client/src/components/Forms/JobsiteMaterial/JobsiteMaterialCreate.tsx` | Full rewrite — rateScenario/invoice modes, scenarios outside form |
| `client/src/components/Forms/JobsiteMaterial/JobsiteMaterialUpdate.tsx` | Hides legacy fields for scenario model; threads truckingRates |
| `client/src/components/Common/JobsiteMaterial/JobsiteMaterialCard.tsx` | Threads truckingRates to JobsiteMaterialUpdate |
| `client/src/components/pages/jobsite/id/views/JobsiteMaterials.tsx` | Passes propJobsite.truckingRates to create form and cards |
| `client/src/components/Forms/MaterialShipment/Data.tsx` | scenarioMaterial detection; rateScenarioId selector UI |
| `client/src/graphql/fragments/JobsiteMaterial_DailyReport.graphql` | Added costModel, scenarios { _id label delivered } |
