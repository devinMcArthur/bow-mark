# Tender Pricing Sheet Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based construction tender pricing tool with parametric calculators, replacing internal Excel sheets.

**Architecture:** A flat ordered array of `TenderPricingRow` documents (type: schedule/group/item) lives on a new `TenderPricingSheet` MongoDB model linked one-to-one with `Tender`. Client-side computation derives all totals and calculator outputs from stored inputs. A global `TenderRateLibrary` singleton holds reusable crew/equipment configurations.

**Tech Stack:** Typegoose/Type-GraphQL/MongoDB (server), Next.js 12/React/Apollo Client/Chakra UI (client), Vitest (tests), `graphql-type-json` for JSON scalar.

**Spec:** `docs/superpowers/specs/2026-03-20-tender-pricing-sheet-design.md`

---

## File Map

### Server — New
| File | Purpose |
|------|---------|
| `server/src/typescript/tenderPricingSheet.ts` | Enums, TypeScript interfaces, calculator input types |
| `server/src/models/TenderPricingSheet/schema/index.ts` | Typegoose schema |
| `server/src/models/TenderPricingSheet/class/index.ts` | Class extending schema, delegates to sub-files |
| `server/src/models/TenderPricingSheet/class/get.ts` | `byId`, `byTenderId` |
| `server/src/models/TenderPricingSheet/class/create.ts` | `document(tenderId)` |
| `server/src/models/TenderPricingSheet/class/update.ts` | All update methods |
| `server/src/models/TenderRateLibrary/schema/index.ts` | Typegoose schema for rate library singleton |
| `server/src/models/TenderRateLibrary/class/index.ts` | Class with get/update |
| `server/src/models/TenderRateLibrary/class/get.ts` | `singleton()` — fetches or creates the one document |
| `server/src/models/TenderRateLibrary/class/update.ts` | Add/update/delete crew and equipment configs |
| `server/src/graphql/resolvers/tenderPricingSheet/index.ts` | Resolver class: queries + mutations |
| `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts` | `@InputType` classes + mutation handlers |
| `server/src/graphql/resolvers/tenderRateLibrary/index.ts` | Resolver class: query + mutations |
| `server/src/graphql/resolvers/tenderRateLibrary/mutations.ts` | Input types + handlers |

### Server — Modified
| File | Change |
|------|--------|
| `server/src/models/Tender/schema/index.ts` | Add `pricingSheet?: Ref<TenderPricingSheetClass>` |
| `server/src/models/index.ts` | Register `TenderPricingSheet` and `TenderRateLibrary` |
| `server/src/app.ts` | Add `TenderPricingSheetResolver` and `TenderRateLibraryResolver` to resolver array |
| `server/package.json` + `package-lock.json` | Add `graphql-type-json` dependency |

### Client — New
| File | Purpose |
|------|---------|
| `client/src/pages/tender/[id]/pricing.tsx` | Pricing page — fetches sheet, renders PricingSheet |
| `client/src/components/TenderPricing/types.ts` | TypeScript interfaces mirroring GQL response |
| `client/src/components/TenderPricing/compute.ts` | All client-side formula logic (pure functions) |
| `client/src/components/TenderPricing/PricingSheet.tsx` | Top-level: markup control, sheet total, row list |
| `client/src/components/TenderPricing/PricingRow.tsx` | Renders schedule/group/item rows with correct style |
| `client/src/components/TenderPricing/CalculatorPanel.tsx` | Split-view calculator: left = sheet nav, right = inputs |
| `client/src/components/TenderPricing/calculators/types.ts` | `WorkTypeTemplate` interface |
| `client/src/components/TenderPricing/calculators/gravel.ts` | Gravel template definition |
| `client/src/components/TenderPricing/calculators/paving.ts` | Paving template definition |
| `client/src/components/TenderPricing/calculators/toplift.ts` | Toplift template definition |
| `client/src/components/TenderPricing/calculators/subgradePrep.ts` | SubgradePrep template |
| `client/src/components/TenderPricing/calculators/commonExcavation.ts` | CommonExcavation template |
| `client/src/components/TenderPricing/calculators/concrete.ts` | Concrete template |
| `client/src/components/TenderPricing/calculators/index.ts` | Registry: `Record<TenderWorkType, WorkTypeTemplate>` |

### Client — Modified
| File | Change |
|------|--------|
| `client/src/pages/tender/[id].tsx` | Rename to `client/src/pages/tender/[id]/index.tsx`; add "Pricing" link button |

---

## Task 1: Branch + dependencies

- [ ] Create feature branch:
  ```bash
  git checkout -b feature/tender-pricing-sheet
  ```

- [ ] Install `graphql-type-json` on the server:
  ```bash
  cd server && npm install graphql-type-json
  ```

- [ ] Commit:
  ```bash
  git add server/package.json server/package-lock.json
  git commit -m "chore: add graphql-type-json dependency"
  ```

---

## Task 2: TypeScript types

**Files:** Create `server/src/typescript/tenderPricingSheet.ts`

- [ ] Create the file with all enums and interfaces:

```typescript
import { registerEnumType } from "type-graphql";

export enum TenderPricingRowType {
  Schedule = "schedule",
  Group    = "group",
  Item     = "item",
}
registerEnumType(TenderPricingRowType, { name: "TenderPricingRowType" });

export enum TenderWorkType {
  Paving           = "Paving",
  Toplift          = "Toplift",
  Gravel           = "Gravel",
  SubgradePrep     = "SubgradePrep",
  CommonExcavation = "CommonExcavation",
  Concrete         = "Concrete",
}
registerEnumType(TenderWorkType, { name: "TenderWorkType" });

export type CalculationBasis = "tonnage" | "volume" | "area" | "lumpsum";

export interface ITenderCrewEntry {
  role: string;
  quantity: number;
  ratePerHour: number;
}

export interface ITenderEquipEntry {
  name: string;
  quantity: number;
  ratePerHour: number;
}

export interface ITenderCalculatorInputs {
  productionRate?: number;
  crew?: ITenderCrewEntry[];
  equipment?: ITenderEquipEntry[];
  depth_mm?: number;
  density?: number;
  materialCostPerUnit?: number;
  truckingMethod?: "perTonne" | "perHour";
  truckingRatePerTonne?: number;
  numTrucks?: number;
  truckingRatePerHour?: number;
  [key: string]: unknown;
}

export interface ITenderPricingSheetCreate {
  tenderId: string;
}

export interface ITenderPricingRowCreate {
  type: TenderPricingRowType;
  itemNumber: string;
  description: string;
  indentLevel: number;
  sortOrder: number;
}

export interface ITenderPricingRowUpdate {
  itemNumber?: string;
  description?: string;
  indentLevel?: number;
  quantity?: number;
  unit?: string;
  subcontractorUP?: number | null;
  truckingUP?: number;
  materialUP?: number;
  crewUP?: number;
  rentalUP?: number;
  markupOverride?: number | null;
  calculatorType?: TenderWorkType;
  calculatorInputs?: ITenderCalculatorInputs;
}

export interface ITenderCrewConfig {
  name: string;
  entries: ITenderCrewEntry[];
}

export interface ITenderEquipConfig {
  name: string;
  entries: ITenderEquipEntry[];
}
```

- [ ] Commit:
  ```bash
  git add server/src/typescript/tenderPricingSheet.ts
  git commit -m "feat(tender-pricing): add TypeScript enums and interfaces"
  ```

---

## Task 3: TenderPricingSheet model

**Files:** Create `server/src/models/TenderPricingSheet/` directory and files.

- [ ] Create `server/src/models/TenderPricingSheet/schema/index.ts`:

```typescript
import { ObjectType, Field, ID, Float, Int } from "type-graphql";
import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { TenderPricingRowType, TenderWorkType } from "@typescript/tenderPricingSheet";
import GraphQLJSON from "graphql-type-json";

@ObjectType()
export class TenderPricingCrewEntryClass {
  @Field()
  @prop({ required: true })
  public role!: string;

  @Field(() => Int)
  @prop({ required: true })
  public quantity!: number;

  @Field(() => Float)
  @prop({ required: true })
  public ratePerHour!: number;
}

@ObjectType()
export class TenderPricingEquipEntryClass {
  @Field()
  @prop({ required: true })
  public name!: string;

  @Field(() => Int)
  @prop({ required: true })
  public quantity!: number;

  @Field(() => Float)
  @prop({ required: true })
  public ratePerHour!: number;
}

@ObjectType()
export class TenderPricingRowClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => TenderPricingRowType)
  @prop({ required: true, enum: TenderPricingRowType })
  public type!: TenderPricingRowType;

  @Field(() => Int)
  @prop({ required: true })
  public sortOrder!: number;

  @Field()
  @prop({ required: true, default: "" })
  public itemNumber!: string;

  @Field()
  @prop({ required: true, trim: true })
  public description!: string;

  @Field(() => Int)
  @prop({ required: true, default: 0 })
  public indentLevel!: number;

  // Pricing fields — only meaningful when type === "item"
  @Field(() => Float, { nullable: true })
  @prop()
  public quantity?: number;

  @Field({ nullable: true })
  @prop({ trim: true })
  public unit?: string;

  @Field(() => Float, { nullable: true })
  @prop()
  public subcontractorUP?: number;

  @Field(() => Float, { nullable: false })
  @prop({ default: 0 })
  public truckingUP!: number;

  @Field(() => Float, { nullable: false })
  @prop({ default: 0 })
  public materialUP!: number;

  @Field(() => Float, { nullable: false })
  @prop({ default: 0 })
  public crewUP!: number;

  @Field(() => Float, { nullable: false })
  @prop({ default: 0 })
  public rentalUP!: number;

  @Field(() => Float, { nullable: true })
  @prop()
  public markupOverride?: number;

  @Field(() => TenderWorkType, { nullable: true })
  @prop({ enum: TenderWorkType })
  public calculatorType?: TenderWorkType;

  @Field(() => GraphQLJSON, { nullable: true })
  @prop({ type: () => Object })
  public calculatorInputs?: Record<string, unknown>;
}

@ObjectType()
export class TenderPricingSheetSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => Float)
  @prop({ required: true, default: 15 })
  public defaultMarkupPct!: number;

  @Field(() => [TenderPricingRowClass])
  @prop({ type: () => [TenderPricingRowClass], default: [] })
  public rows!: TenderPricingRowClass[];

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
```

- [ ] Create `server/src/models/TenderPricingSheet/class/get.ts`:

```typescript
import { TenderPricingSheetDocument, TenderPricingSheetModel } from "@models";
import { Id } from "@typescript/models";

const byId = async (
  Sheet: TenderPricingSheetModel,
  id: Id
): Promise<TenderPricingSheetDocument | null> => {
  return Sheet.findById(id);
};

const byTenderId = async (
  Sheet: TenderPricingSheetModel,
  tenderId: Id
): Promise<TenderPricingSheetDocument | null> => {
  return Sheet.findOne({ tender: tenderId });
};

export default { byId, byTenderId };
```

- [ ] Create `server/src/models/TenderPricingSheet/class/create.ts`:

```typescript
import { TenderPricingSheetDocument, TenderPricingSheetModel } from "@models";
import { ITenderPricingSheetCreate } from "@typescript/tenderPricingSheet";

const document = async (
  Sheet: TenderPricingSheetModel,
  data: ITenderPricingSheetCreate
): Promise<TenderPricingSheetDocument> => {
  return new Sheet({ tender: data.tenderId });
};

export default { document };
```

- [ ] Create `server/src/models/TenderPricingSheet/class/update.ts`:

```typescript
import { Types } from "mongoose";
import { TenderPricingSheetDocument } from "@models";
import {
  ITenderPricingRowCreate,
  ITenderPricingRowUpdate,
} from "@typescript/tenderPricingSheet";

const defaultMarkup = async (
  sheet: TenderPricingSheetDocument,
  pct: number
): Promise<void> => {
  sheet.defaultMarkupPct = pct;
  sheet.updatedAt = new Date();
};

const addRow = async (
  sheet: TenderPricingSheetDocument,
  data: ITenderPricingRowCreate
): Promise<void> => {
  sheet.rows.push({ _id: new Types.ObjectId(), ...data } as any);
  sheet.updatedAt = new Date();
};

const updateRow = async (
  sheet: TenderPricingSheetDocument,
  rowId: string,
  data: ITenderPricingRowUpdate
): Promise<void> => {
  const row = sheet.rows.find((r) => r._id.toString() === rowId);
  if (!row) throw new Error(`Row ${rowId} not found`);
  Object.assign(row, data);
  sheet.updatedAt = new Date();
};

const deleteRow = async (
  sheet: TenderPricingSheetDocument,
  rowId: string
): Promise<void> => {
  const idx = sheet.rows.findIndex((r) => r._id.toString() === rowId);
  if (idx === -1) throw new Error(`Row ${rowId} not found`);
  sheet.rows.splice(idx, 1);
  sheet.updatedAt = new Date();
};

const reorderRows = async (
  sheet: TenderPricingSheetDocument,
  rowIds: string[]
): Promise<void> => {
  const rowMap = new Map(sheet.rows.map((r) => [r._id.toString(), r]));
  if (rowIds.length !== sheet.rows.length)
    throw new Error("rowIds must contain all row IDs");
  const reordered = rowIds.map((id, idx) => {
    const row = rowMap.get(id);
    if (!row) throw new Error(`Row ${id} not found`);
    row.sortOrder = idx;
    return row;
  });
  sheet.rows = reordered;
  sheet.updatedAt = new Date();
};

export default { defaultMarkup, addRow, updateRow, deleteRow, reorderRows };
```

- [ ] Create `server/src/models/TenderPricingSheet/class/index.ts`.
  Do NOT export `TenderPricingSheetDocument` or `TenderPricingSheetModel` here — those are exported by `models/index.ts` only (matching every other model in the codebase). Import them from `"@models"` inside the sub-files:

```typescript
import { ObjectType } from "type-graphql";
import { TenderPricingSheetSchema } from "../schema";
import get from "./get";
import create from "./create";
import update from "./update";
import { Id } from "@typescript/models";
import { ITenderPricingSheetCreate, ITenderPricingRowCreate, ITenderPricingRowUpdate } from "@typescript/tenderPricingSheet";

@ObjectType()
export class TenderPricingSheetClass extends TenderPricingSheetSchema {
  public static async getById(this: TenderPricingSheetModel, id: Id) {
    return get.byId(this, id);
  }

  public static async getByTenderId(this: TenderPricingSheetModel, tenderId: Id) {
    return get.byTenderId(this, tenderId);
  }

  public static async createDocument(this: TenderPricingSheetModel, data: ITenderPricingSheetCreate) {
    return create.document(this, data);
  }

  public async updateDefaultMarkup(this: TenderPricingSheetDocument, pct: number) {
    return update.defaultMarkup(this, pct);
  }

  public async addRow(this: TenderPricingSheetDocument, data: ITenderPricingRowCreate) {
    return update.addRow(this, data);
  }

  public async updateRow(this: TenderPricingSheetDocument, rowId: string, data: ITenderPricingRowUpdate) {
    return update.updateRow(this, rowId, data);
  }

  public async deleteRow(this: TenderPricingSheetDocument, rowId: string) {
    return update.deleteRow(this, rowId);
  }

  public async reorderRows(this: TenderPricingSheetDocument, rowIds: string[]) {
    return update.reorderRows(this, rowIds);
  }
}
```

- [ ] Commit:
  ```bash
  git add server/src/models/TenderPricingSheet/
  git commit -m "feat(tender-pricing): add TenderPricingSheet model"
  ```

---

## Task 4: TenderRateLibrary model

**Files:** Create `server/src/models/TenderRateLibrary/` directory and files.

- [ ] Create `server/src/models/TenderRateLibrary/schema/index.ts`:

```typescript
import { ObjectType, Field, ID, Float, Int } from "type-graphql";
import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";

@ObjectType()
export class TenderRateCrewEntryClass {
  @Field()
  @prop({ required: true })
  public role!: string;

  @Field(() => Int)
  @prop({ required: true })
  public quantity!: number;

  @Field(() => Float)
  @prop({ required: true })
  public ratePerHour!: number;
}

@ObjectType()
export class TenderRateEquipEntryClass {
  @Field()
  @prop({ required: true })
  public name!: string;

  @Field(() => Int)
  @prop({ required: true })
  public quantity!: number;

  @Field(() => Float)
  @prop({ required: true })
  public ratePerHour!: number;
}

@ObjectType()
export class TenderCrewConfigClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field()
  @prop({ required: true, trim: true })
  public name!: string;

  @Field(() => [TenderRateCrewEntryClass])
  @prop({ type: () => [TenderRateCrewEntryClass], default: [] })
  public entries!: TenderRateCrewEntryClass[];
}

@ObjectType()
export class TenderEquipConfigClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field()
  @prop({ required: true, trim: true })
  public name!: string;

  @Field(() => [TenderRateEquipEntryClass])
  @prop({ type: () => [TenderRateEquipEntryClass], default: [] })
  public entries!: TenderRateEquipEntryClass[];
}

@ObjectType()
export class TenderRateLibrarySchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => [TenderCrewConfigClass])
  @prop({ type: () => [TenderCrewConfigClass], default: [] })
  public crewConfigs!: TenderCrewConfigClass[];

  @Field(() => [TenderEquipConfigClass])
  @prop({ type: () => [TenderEquipConfigClass], default: [] })
  public equipConfigs!: TenderEquipConfigClass[];
}
```

- [ ] Create `server/src/models/TenderRateLibrary/class/get.ts` — fetches singleton, creates it if it doesn't exist:

```typescript
import { TenderRateLibraryDocument, TenderRateLibraryModel } from "@models";

const singleton = async (
  Library: TenderRateLibraryModel
): Promise<TenderRateLibraryDocument> => {
  let lib = await Library.findOne();
  if (!lib) {
    lib = new Library();
    await lib.save();
  }
  return lib;
};

export default { singleton };
```

- [ ] Create `server/src/models/TenderRateLibrary/class/update.ts`:

```typescript
import { Types } from "mongoose";
import { TenderRateLibraryDocument } from "@models";
import { ITenderCrewConfig, ITenderEquipConfig } from "@typescript/tenderPricingSheet";

const addCrewConfig = (lib: TenderRateLibraryDocument, data: ITenderCrewConfig) => {
  lib.crewConfigs.push({ _id: new Types.ObjectId(), ...data } as any);
};

const updateCrewConfig = (lib: TenderRateLibraryDocument, id: string, data: ITenderCrewConfig) => {
  const cfg = lib.crewConfigs.find((c) => c._id.toString() === id);
  if (!cfg) throw new Error(`CrewConfig ${id} not found`);
  Object.assign(cfg, data);
};

const deleteCrewConfig = (lib: TenderRateLibraryDocument, id: string) => {
  const idx = lib.crewConfigs.findIndex((c) => c._id.toString() === id);
  if (idx === -1) throw new Error(`CrewConfig ${id} not found`);
  lib.crewConfigs.splice(idx, 1);
};

const addEquipConfig = (lib: TenderRateLibraryDocument, data: ITenderEquipConfig) => {
  lib.equipConfigs.push({ _id: new Types.ObjectId(), ...data } as any);
};

const updateEquipConfig = (lib: TenderRateLibraryDocument, id: string, data: ITenderEquipConfig) => {
  const cfg = lib.equipConfigs.find((c) => c._id.toString() === id);
  if (!cfg) throw new Error(`EquipConfig ${id} not found`);
  Object.assign(cfg, data);
};

const deleteEquipConfig = (lib: TenderRateLibraryDocument, id: string) => {
  const idx = lib.equipConfigs.findIndex((c) => c._id.toString() === id);
  if (idx === -1) throw new Error(`EquipConfig ${id} not found`);
  lib.equipConfigs.splice(idx, 1);
};

export default { addCrewConfig, updateCrewConfig, deleteCrewConfig, addEquipConfig, updateEquipConfig, deleteEquipConfig };
```

- [ ] Create `server/src/models/TenderRateLibrary/class/index.ts`:

```typescript
import { ObjectType } from "type-graphql";
import { TenderRateLibrarySchema } from "../schema";
import get from "./get";
import update from "./update";
import { ITenderCrewConfig, ITenderEquipConfig } from "@typescript/tenderPricingSheet";

import { DocumentType, ReturnModelType } from "@typegoose/typegoose";
type TenderRateLibraryDoc = DocumentType<TenderRateLibraryClass>;
type TenderRateLibraryMod = ReturnModelType<typeof TenderRateLibraryClass>;

@ObjectType()
export class TenderRateLibraryClass extends TenderRateLibrarySchema {
  public static async getSingleton(this: TenderRateLibraryMod) {
    return get.singleton(this);
  }

  public addCrewConfig(this: TenderRateLibraryDoc, data: ITenderCrewConfig) { update.addCrewConfig(this, data); }
  public updateCrewConfig(this: TenderRateLibraryDoc, id: string, data: ITenderCrewConfig) { update.updateCrewConfig(this, id, data); }
  public deleteCrewConfig(this: TenderRateLibraryDoc, id: string) { update.deleteCrewConfig(this, id); }
  public addEquipConfig(this: TenderRateLibraryDoc, data: ITenderEquipConfig) { update.addEquipConfig(this, data); }
  public updateEquipConfig(this: TenderRateLibraryDoc, id: string, data: ITenderEquipConfig) { update.updateEquipConfig(this, id, data); }
  public deleteEquipConfig(this: TenderRateLibraryDoc, id: string) { update.deleteEquipConfig(this, id); }
}
```

- [ ] Commit:
  ```bash
  git add server/src/models/TenderRateLibrary/
  git commit -m "feat(tender-pricing): add TenderRateLibrary model"
  ```

---

## Task 5: Register models and modify Tender schema

- [ ] Open `server/src/models/Tender/schema/index.ts`. Add after the existing `files` field:

```typescript
@Field(() => TenderPricingSheetClass, { nullable: true })
@prop({ ref: () => TenderPricingSheetClass })
public pricingSheet?: Ref<TenderPricingSheetClass>;
```

Import `TenderPricingSheetClass` from its schema file:
```typescript
import { TenderPricingSheetClass } from "../TenderPricingSheet/schema";
```

Use the direct path import (not `@models`) to avoid a circular dependency. The `@prop({ ref: () => TenderPricingSheetClass })` lazy ref is already sufficient for Typegoose to resolve the reference at runtime.

- [ ] Open `server/src/models/index.ts`. There are two things to add per model:

  **Step A** — Add re-exports near the top of the file (where all the other `export * from` lines are):
  ```typescript
  export * from "./TenderPricingSheet";
  export * from "./TenderRateLibrary";
  ```

  **Step B** — Add registration blocks in the body (following the Tender pattern exactly):
  ```typescript
  import { TenderPricingSheetClass } from "./TenderPricingSheet";
  import { TenderRateLibraryClass } from "./TenderRateLibrary";

  export type TenderPricingSheetDocument = DocumentType<TenderPricingSheetClass>;
  export type TenderPricingSheetModel = ReturnModelType<typeof TenderPricingSheetClass>;
  export const TenderPricingSheet = getModelForClass(TenderPricingSheetClass);

  export type TenderRateLibraryDocument = DocumentType<TenderRateLibraryClass>;
  export type TenderRateLibraryModel = ReturnModelType<typeof TenderRateLibraryClass>;
  export const TenderRateLibrary = getModelForClass(TenderRateLibraryClass);
  ```

- [ ] Commit:
  ```bash
  git add server/src/models/
  git commit -m "feat(tender-pricing): register new models, add pricingSheet ref to Tender"
  ```

---

## Task 6: Register JSON scalar

- [ ] Open `server/src/app.ts`. Add this import near the top (no other changes to `app.ts` are needed for the scalar — the import is enough to ensure the module is loaded and the scalar is available for `@Field(() => GraphQLJSON)` decorators):

```typescript
import "graphql-type-json"; // ensures GraphQLJSON scalar is available to type-graphql decorators
```

Do NOT add `scalarsMap` to `buildTypeDefsAndResolvers` — this would remap all `Object`-typed fields globally and break other models.

- [ ] Commit:
  ```bash
  git add server/src/app.ts
  git commit -m "feat(tender-pricing): register GraphQLJSON scalar"
  ```

---

## Task 7: TenderPricingSheet GraphQL resolver

**Files:** Create `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts` and `index.ts`.

- [ ] Create `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`:

```typescript
import { InputType, Field, ID, Float, Int } from "type-graphql";
import GraphQLJSON from "graphql-type-json";
import { TenderPricingRowType, TenderWorkType } from "@typescript/tenderPricingSheet";

@InputType()
export class TenderPricingRowCreateData {
  @Field(() => TenderPricingRowType)
  public type!: TenderPricingRowType;

  @Field()
  public itemNumber!: string;

  @Field()
  public description!: string;

  @Field(() => Int)
  public indentLevel!: number;

  @Field(() => Int)
  public sortOrder!: number;
}

@InputType()
export class TenderPricingRowUpdateData {
  @Field({ nullable: true })
  public itemNumber?: string;

  @Field({ nullable: true })
  public description?: string;

  @Field(() => Int, { nullable: true })
  public indentLevel?: number;

  @Field(() => Float, { nullable: true })
  public quantity?: number;

  @Field({ nullable: true })
  public unit?: string;

  // Use `| null` on fields that need to be explicitly clearable (not just omitted)
  @Field(() => Float, { nullable: true })
  public subcontractorUP?: number | null;

  @Field(() => Float, { nullable: true })
  public truckingUP?: number;

  @Field(() => Float, { nullable: true })
  public materialUP?: number;

  @Field(() => Float, { nullable: true })
  public crewUP?: number;

  @Field(() => Float, { nullable: true })
  public rentalUP?: number;

  @Field(() => Float, { nullable: true })
  public markupOverride?: number | null;  // null = revert to sheet default

  @Field(() => TenderWorkType, { nullable: true })
  public calculatorType?: TenderWorkType;

  @Field(() => GraphQLJSON, { nullable: true })
  public calculatorInputs?: Record<string, unknown>;
}

// Mutation handler functions (imported by resolver)
import { TenderPricingSheet, TenderPricingSheetDocument } from "@models";
import { Id } from "@typescript/models";

const createSheet = async (tenderId: Id): Promise<TenderPricingSheetDocument> => {
  const sheet = await TenderPricingSheet.createDocument({ tenderId: tenderId.toString() });
  await sheet.save();
  return sheet;
};

const updateMarkup = async (id: Id, pct: number): Promise<TenderPricingSheetDocument> => {
  const sheet = await TenderPricingSheet.getById(id);
  if (!sheet) throw new Error("Sheet not found");
  await sheet.updateDefaultMarkup(pct);
  await sheet.save();
  return sheet;
};

const createRow = async (sheetId: Id, data: TenderPricingRowCreateData): Promise<TenderPricingSheetDocument> => {
  const sheet = await TenderPricingSheet.getById(sheetId);
  if (!sheet) throw new Error("Sheet not found");
  await sheet.addRow(data);
  await sheet.save();
  return sheet;
};

const updateRow = async (sheetId: Id, rowId: string, data: TenderPricingRowUpdateData): Promise<TenderPricingSheetDocument> => {
  const sheet = await TenderPricingSheet.getById(sheetId);
  if (!sheet) throw new Error("Sheet not found");
  await sheet.updateRow(rowId, data as any);
  await sheet.save();
  return sheet;
};

const deleteRow = async (sheetId: Id, rowId: string): Promise<TenderPricingSheetDocument> => {
  const sheet = await TenderPricingSheet.getById(sheetId);
  if (!sheet) throw new Error("Sheet not found");
  await sheet.deleteRow(rowId);
  await sheet.save();
  return sheet;
};

const reorderRows = async (sheetId: Id, rowIds: string[]): Promise<TenderPricingSheetDocument> => {
  const sheet = await TenderPricingSheet.getById(sheetId);
  if (!sheet) throw new Error("Sheet not found");
  await sheet.reorderRows(rowIds);
  await sheet.save();
  return sheet;
};

export default { createSheet, updateMarkup, createRow, updateRow, deleteRow, reorderRows };
```

- [ ] Create `server/src/graphql/resolvers/tenderPricingSheet/index.ts`:

```typescript
import { Resolver, Query, Mutation, Arg, ID, Authorized, Float } from "type-graphql";
import { TenderPricingSheetClass } from "@models";
import { TenderPricingSheet } from "@models";
import mutations, {
  TenderPricingRowCreateData,
  TenderPricingRowUpdateData,
} from "./mutations";

@Resolver(() => TenderPricingSheetClass)
export default class TenderPricingSheetResolver {
  @Authorized(["ADMIN", "PM"])
  @Query(() => TenderPricingSheetClass, { nullable: true })
  async tenderPricingSheet(@Arg("tenderId", () => ID) tenderId: string) {
    return TenderPricingSheet.getByTenderId(tenderId);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingSheetCreate(@Arg("tenderId", () => ID) tenderId: string) {
    return mutations.createSheet(tenderId);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingSheetUpdateMarkup(
    @Arg("id", () => ID) id: string,
    @Arg("defaultMarkupPct", () => Float) defaultMarkupPct: number
  ) {
    return mutations.updateMarkup(id, defaultMarkupPct);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowCreate(
    @Arg("sheetId", () => ID) sheetId: string,
    @Arg("data") data: TenderPricingRowCreateData
  ) {
    return mutations.createRow(sheetId, data);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowUpdate(
    @Arg("sheetId", () => ID) sheetId: string,
    @Arg("rowId", () => ID) rowId: string,
    @Arg("data") data: TenderPricingRowUpdateData
  ) {
    return mutations.updateRow(sheetId, rowId, data);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowDelete(
    @Arg("sheetId", () => ID) sheetId: string,
    @Arg("rowId", () => ID) rowId: string
  ) {
    return mutations.deleteRow(sheetId, rowId);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowReorder(
    @Arg("sheetId", () => ID) sheetId: string,
    @Arg("rowIds", () => [ID]) rowIds: string[]
  ) {
    return mutations.reorderRows(sheetId, rowIds);
  }
}
```

- [ ] Commit:
  ```bash
  git add server/src/graphql/resolvers/tenderPricingSheet/
  git commit -m "feat(tender-pricing): add TenderPricingSheet GraphQL resolver"
  ```

---

## Task 8: TenderRateLibrary GraphQL resolver

- [ ] Create `server/src/graphql/resolvers/tenderRateLibrary/mutations.ts`:

```typescript
import { InputType, Field, ID, Float, Int } from "type-graphql";
import { TenderRateLibrary, TenderRateLibraryDocument } from "@models";

@InputType()
export class TenderRateCrewEntryData {
  @Field() public role!: string;
  @Field(() => Int) public quantity!: number;
  @Field(() => Float) public ratePerHour!: number;
}

@InputType()
export class TenderRateEquipEntryData {
  @Field() public name!: string;
  @Field(() => Int) public quantity!: number;
  @Field(() => Float) public ratePerHour!: number;
}

@InputType()
export class TenderCrewConfigData {
  @Field() public name!: string;
  @Field(() => [TenderRateCrewEntryData]) public entries!: TenderRateCrewEntryData[];
}

@InputType()
export class TenderEquipConfigData {
  @Field() public name!: string;
  @Field(() => [TenderRateEquipEntryData]) public entries!: TenderRateEquipEntryData[];
}

const getLib = async (): Promise<TenderRateLibraryDocument> =>
  TenderRateLibrary.getSingleton();

const addCrewConfig = async (data: TenderCrewConfigData) => {
  const lib = await getLib();
  lib.addCrewConfig(data);
  await lib.save();
  return lib;
};

const updateCrewConfig = async (id: string, data: TenderCrewConfigData) => {
  const lib = await getLib();
  lib.updateCrewConfig(id, data);
  await lib.save();
  return lib;
};

const deleteCrewConfig = async (id: string) => {
  const lib = await getLib();
  lib.deleteCrewConfig(id);
  await lib.save();
  return lib;
};

const addEquipConfig = async (data: TenderEquipConfigData) => {
  const lib = await getLib();
  lib.addEquipConfig(data);
  await lib.save();
  return lib;
};

const updateEquipConfig = async (id: string, data: TenderEquipConfigData) => {
  const lib = await getLib();
  lib.updateEquipConfig(id, data);
  await lib.save();
  return lib;
};

const deleteEquipConfig = async (id: string) => {
  const lib = await getLib();
  lib.deleteEquipConfig(id);
  await lib.save();
  return lib;
};

export default { addCrewConfig, updateCrewConfig, deleteCrewConfig, addEquipConfig, updateEquipConfig, deleteEquipConfig };
```

- [ ] Create `server/src/graphql/resolvers/tenderRateLibrary/index.ts`:

```typescript
import { Resolver, Query, Mutation, Arg, ID, Authorized } from "type-graphql";
import { TenderRateLibrary, TenderRateLibraryClass } from "@models";
import mutations, {
  TenderCrewConfigData, TenderEquipConfigData,
} from "./mutations";

@Resolver(() => TenderRateLibraryClass)
export default class TenderRateLibraryResolver {
  @Authorized(["ADMIN", "PM"])
  @Query(() => TenderRateLibraryClass)
  async tenderRateLibrary() {
    return TenderRateLibrary.getSingleton();
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderRateLibraryClass)
  async tenderRateLibraryAddCrewConfig(@Arg("data") data: TenderCrewConfigData) {
    return mutations.addCrewConfig(data);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderRateLibraryClass)
  async tenderRateLibraryUpdateCrewConfig(
    @Arg("id", () => ID) id: string,
    @Arg("data") data: TenderCrewConfigData
  ) {
    return mutations.updateCrewConfig(id, data);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderRateLibraryClass)
  async tenderRateLibraryDeleteCrewConfig(@Arg("id", () => ID) id: string) {
    return mutations.deleteCrewConfig(id);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderRateLibraryClass)
  async tenderRateLibraryAddEquipConfig(@Arg("data") data: TenderEquipConfigData) {
    return mutations.addEquipConfig(data);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderRateLibraryClass)
  async tenderRateLibraryUpdateEquipConfig(
    @Arg("id", () => ID) id: string,
    @Arg("data") data: TenderEquipConfigData
  ) {
    return mutations.updateEquipConfig(id, data);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderRateLibraryClass)
  async tenderRateLibraryDeleteEquipConfig(@Arg("id", () => ID) id: string) {
    return mutations.deleteEquipConfig(id);
  }
}
```

- [ ] Commit:
  ```bash
  git add server/src/graphql/resolvers/tenderRateLibrary/
  git commit -m "feat(tender-pricing): add TenderRateLibrary GraphQL resolver"
  ```

---

## Task 9: Register resolvers in app.ts

- [ ] Open `server/src/app.ts`. Import and add to the resolvers array:

```typescript
import TenderPricingSheetResolver from "@graphql/resolvers/tenderPricingSheet";
import TenderRateLibraryResolver from "@graphql/resolvers/tenderRateLibrary";

// In the resolvers array, add after TenderResolver:
TenderPricingSheetResolver,
TenderRateLibraryResolver,
```

- [ ] Start the server (via Tilt or `npm run start:dev`) and check pod logs for TypeScript errors:
  ```bash
  kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=40
  ```

- [ ] Commit:
  ```bash
  git add server/src/app.ts
  git commit -m "feat(tender-pricing): register pricing sheet and rate library resolvers"
  ```

---

## Task 10: Client — routing and Pricing link

- [ ] Rename the file (Next.js 12 supports folder index routing):
  ```bash
  mkdir -p client/src/pages/tender/\[id\]
  mv "client/src/pages/tender/[id].tsx" "client/src/pages/tender/[id]/index.tsx"
  ```

- [ ] Open `client/src/pages/tender/[id]/index.tsx`. Find the breadcrumbs / header area in the left panel. Add a link button to the pricing page using Next.js `<Link>` and Chakra UI `<Button>`:

  ```tsx
  import Link from "next/link";
  // ...
  <Link href={`/tender/${tenderId}/pricing`} passHref>
    <Button as="a" size="sm" variant="outline" colorScheme="blue">
      Pricing Sheet
    </Button>
  </Link>
  ```

- [ ] After the rename, verify the file has no `getServerSideProps`, `getStaticProps`, or `getStaticPaths` exports that need to be preserved (the existing page is client-side only, so there should be none — but double-check).

- [ ] Verify the existing tender detail page still works at `/tender/[id]` in the browser.

- [ ] Commit:
  ```bash
  git add "client/src/pages/tender/"
  git commit -m "feat(tender-pricing): rename tender page to index route, add Pricing Sheet link"
  ```

---

## Task 11: Client — types and compute logic

**Files:** Create `client/src/components/TenderPricing/types.ts` and `compute.ts`.

- [ ] Create `client/src/components/TenderPricing/types.ts`:

```typescript
export type TenderPricingRowType = "schedule" | "group" | "item";
export type TenderWorkType =
  | "Paving" | "Toplift" | "Gravel"
  | "SubgradePrep" | "CommonExcavation" | "Concrete";
export type CalculationBasis = "tonnage" | "volume" | "area" | "lumpsum";
export type TruckingMethod = "perTonne" | "perHour";

export interface TenderCrewEntry { role: string; quantity: number; ratePerHour: number; }
export interface TenderEquipEntry { name: string; quantity: number; ratePerHour: number; }

export interface TenderCalculatorInputs {
  productionRate?: number;
  crew?: TenderCrewEntry[];
  equipment?: TenderEquipEntry[];
  depth_mm?: number;
  density?: number;
  materialCostPerUnit?: number;
  truckingMethod?: TruckingMethod;
  truckingRatePerTonne?: number;
  numTrucks?: number;
  truckingRatePerHour?: number;
  [key: string]: unknown;
}

export interface TenderPricingRow {
  _id: string;
  type: TenderPricingRowType;
  sortOrder: number;
  itemNumber: string;
  description: string;
  indentLevel: number;
  quantity?: number;
  unit?: string;
  subcontractorUP?: number | null;
  truckingUP: number;
  materialUP: number;
  crewUP: number;
  rentalUP: number;
  markupOverride?: number | null;
  calculatorType?: TenderWorkType;
  calculatorInputs?: TenderCalculatorInputs;
}

export interface TenderPricingSheet {
  _id: string;
  defaultMarkupPct: number;
  rows: TenderPricingRow[];
}

export interface TenderCrewConfig { _id: string; name: string; entries: TenderCrewEntry[]; }
export interface TenderEquipConfig { _id: string; name: string; entries: TenderEquipEntry[]; }
export interface TenderRateLibrary {
  crewConfigs: TenderCrewConfig[];
  equipConfigs: TenderEquipConfig[];
}

// Computed outputs
export interface CalculatedUPs {
  truckingUP: number;
  materialUP: number;
  crewUP: number;
  rentalUP: number;
}
```

- [ ] Create `client/src/components/TenderPricing/compute.ts` — pure functions, no React:

```typescript
import {
  TenderPricingRow, TenderPricingSheet, TenderCalculatorInputs,
  CalculatedUPs, CalculationBasis,
} from "./types";

// ── Calculator formulas ──────────────────────────────────────────

export function computeUnitsPerBaseUnit(
  basis: CalculationBasis,
  inputs: TenderCalculatorInputs
): number {
  if (basis === "tonnage") {
    const depth = (inputs.depth_mm ?? 0) / 1000;
    const density = inputs.density ?? 0;
    return depth * density;
  }
  // volume, area, lumpsum: 1 unit = 1 base unit
  return 1;
}

export function computeCalculatorUPs(
  basis: CalculationBasis,
  inputs: TenderCalculatorInputs
): CalculatedUPs {
  if (basis === "lumpsum") {
    return { truckingUP: 0, materialUP: 0, crewUP: 0, rentalUP: 0 };
  }

  const u = computeUnitsPerBaseUnit(basis, inputs);
  const pr = inputs.productionRate ?? 1;

  // Material
  const materialUP = u * (inputs.materialCostPerUnit ?? 0);

  // Trucking
  let truckingUP = 0;
  if (inputs.truckingMethod === "perTonne") {
    truckingUP = u * (inputs.truckingRatePerTonne ?? 0);
  } else if (inputs.truckingMethod === "perHour") {
    const trucks = inputs.numTrucks ?? 0;
    const rate = inputs.truckingRatePerHour ?? 0;
    truckingUP = pr > 0 ? (trucks * rate * u) / pr : 0;
  }

  // Crew
  const totalCrewRate = (inputs.crew ?? []).reduce(
    (sum, e) => sum + e.quantity * e.ratePerHour, 0
  );
  const crewUP = pr > 0 ? (totalCrewRate * u) / pr : 0;

  // Equipment
  const totalEquipRate = (inputs.equipment ?? []).reduce(
    (sum, e) => sum + e.quantity * e.ratePerHour, 0
  );
  const rentalUP = pr > 0 ? (totalEquipRate * u) / pr : 0;

  return { truckingUP, materialUP, crewUP, rentalUP };
}

// ── Row-level computations ────────────────────────────────────────

export function rowTotalUP(row: TenderPricingRow): number {
  return (
    (row.subcontractorUP ?? 0) +
    row.truckingUP + row.materialUP +
    row.crewUP + row.rentalUP
  );
}

export function rowEffectiveMarkup(
  row: TenderPricingRow,
  defaultMarkupPct: number
): number {
  return row.markupOverride != null ? row.markupOverride : defaultMarkupPct;
}

export function rowSuggestedBidUP(
  row: TenderPricingRow,
  defaultMarkupPct: number
): number {
  const total = rowTotalUP(row);
  const markup = rowEffectiveMarkup(row, defaultMarkupPct);
  return total * (1 + markup / 100);
}

export function rowLineItemTotal(
  row: TenderPricingRow,
  defaultMarkupPct: number
): number {
  return rowSuggestedBidUP(row, defaultMarkupPct) * (row.quantity ?? 0);
}

// ── Subtotal traversal ────────────────────────────────────────────
// Walk forward from startIdx, accumulate lineItemTotal for item rows
// until a row with type === "schedule" OR indentLevel <= headerIndent is encountered.

export function computeSubtotal(
  rows: TenderPricingRow[],
  startIdx: number,         // index of the schedule/group header row
  defaultMarkupPct: number
): number {
  const header = rows[startIdx];
  let total = 0;
  for (let i = startIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.type === "schedule") break;
    if (row.indentLevel <= header.indentLevel) break;
    if (row.type === "item") {
      total += rowLineItemTotal(row, defaultMarkupPct);
    }
  }
  return total;
}

export function computeSheetTotal(sheet: TenderPricingSheet): number {
  return sheet.rows
    .filter((r) => r.type === "item")
    .reduce((sum, r) => sum + rowLineItemTotal(r, sheet.defaultMarkupPct), 0);
}
```

- [ ] Commit:
  ```bash
  git add client/src/components/TenderPricing/
  git commit -m "feat(tender-pricing): add client types and compute logic"
  ```

---

## Task 12: Calculator work type templates

The template registry defines per-type metadata: label, `calculationBasis`, and default `calculatorInputs`. These are used by the `CalculatorPanel` to know which sections/fields to show and what defaults to pre-fill.

- [ ] Create `client/src/components/TenderPricing/calculators/types.ts`:

```typescript
import { CalculationBasis, TenderCalculatorInputs, TenderWorkType } from "../types";

export interface WorkTypeTemplate {
  type: TenderWorkType;
  label: string;
  basis: CalculationBasis;
  defaultInputs: TenderCalculatorInputs;
  // Extra field definitions for type-specific inputs beyond the shared set.
  // Each entry is rendered as an additional input in the calculator panel.
  extraFields?: WorkTypeExtraField[];
}

export interface WorkTypeExtraField {
  key: string;        // key in calculatorInputs
  label: string;
  unit: string;
  defaultValue: number;
}
```

- [ ] Create `client/src/components/TenderPricing/calculators/gravel.ts`:

```typescript
import { WorkTypeTemplate } from "./types";

const gravel: WorkTypeTemplate = {
  type: "Gravel",
  label: "Gravel",
  basis: "tonnage",
  defaultInputs: {
    depth_mm: 150,
    density: 2.1,
    materialCostPerUnit: 12.0,
    productionRate: 250,
    truckingMethod: "perTonne",
    truckingRatePerTonne: 3.5,
    crew: [
      { role: "Foreman",  quantity: 1, ratePerHour: 58 },
      { role: "Operator", quantity: 2, ratePerHour: 48.5 },
      { role: "Grademan", quantity: 1, ratePerHour: 42 },
      { role: "Labourer", quantity: 2, ratePerHour: 36.5 },
    ],
    equipment: [
      { name: "Motor Grader",     quantity: 1, ratePerHour: 185 },
      { name: "Compactor (Pad)",  quantity: 1, ratePerHour: 95 },
    ],
  },
};
export default gravel;
```

- [ ] Create similar files for `paving.ts`, `toplift.ts`, `subgradePrep.ts`, `commonExcavation.ts`, `concrete.ts`. Key differences:
  - `paving` / `toplift`: basis `"tonnage"`, different depth/density defaults, add equipment (paver, rollers)
  - `subgradePrep` / `commonExcavation`: basis `"volume"`, no depth/density, productionRate in m³/h
  - `concrete`: basis `"area"`, no depth/density, `extraFields` for rebar density, formwork $/m², etc.

- [ ] Create `client/src/components/TenderPricing/calculators/index.ts`:

```typescript
import { TenderWorkType } from "../types";
import { WorkTypeTemplate } from "./types";
import gravel from "./gravel";
import paving from "./paving";
import toplift from "./toplift";
import subgradePrep from "./subgradePrep";
import commonExcavation from "./commonExcavation";
import concrete from "./concrete";

export const WORK_TYPE_TEMPLATES: Record<TenderWorkType, WorkTypeTemplate> = {
  Gravel: gravel,
  Paving: paving,
  Toplift: toplift,
  SubgradePrep: subgradePrep,
  CommonExcavation: commonExcavation,
  Concrete: concrete,
};

export { WorkTypeTemplate };
```

- [ ] Commit:
  ```bash
  git add client/src/components/TenderPricing/calculators/
  git commit -m "feat(tender-pricing): add work type calculator templates"
  ```

---

## Task 13: PricingSheet and PricingRow components

- [ ] Create `client/src/components/TenderPricing/PricingRow.tsx`. This component renders a single row based on its `type`:

  - **`schedule`**: Dark header row spanning all columns. Shows `itemNumber`, `description`, and computed `subtotal` (use `computeSubtotal`). Edit/delete actions in an overflow menu.
  - **`group`**: Lighter header row, indented by `indentLevel * 24px`. Shows `itemNumber`, `description`, `subtotal`. Edit/delete actions.
  - **`item`**: Full data row. Columns: `#`, Description, Qty, Unit, Subcon UP, Truck UP, Mat UP, Crew UP, Rental UP, Total UP, Markup badge (`DEFAULT` / `+N%` / `−N%`), Bid UP, ✏ 🗑. All numeric columns right-aligned. Uses `rowTotalUP`, `rowSuggestedBidUP` from `compute.ts`.

  Props:
  ```tsx
  interface PricingRowProps {
    row: TenderPricingRow;
    allRows: TenderPricingRow[];     // needed for subtotal computation
    rowIndex: number;
    defaultMarkupPct: number;
    sheetId: string;
    onEdit: (row: TenderPricingRow) => void;
    onDelete: (rowId: string) => void;
    onUpdateRow: (rowId: string, data: Partial<TenderPricingRow>) => void;
  }
  ```

- [ ] Create `client/src/components/TenderPricing/PricingSheet.tsx`. This is the main container:

  - Fetches `tenderPricingSheet(tenderId)` with Apollo `useQuery`
  - If result is `null`, calls `tenderPricingSheetCreate` mutation on mount
  - Renders: default markup control (inline edit), sheet total, "Add Row" toolbar (Schedule / Group / Item buttons), the flat table of `<PricingRow>` components
  - Manages state: which row is open in the calculator panel (`selectedRow`)
  - When `selectedRow` is set, renders `<CalculatorPanel>` in a Chakra `Drawer`

  Key GraphQL fragments to define (colocated in this file):
  ```graphql
  const PRICING_SHEET_QUERY = gql`
    query TenderPricingSheet($tenderId: ID!) {
      tenderPricingSheet(tenderId: $tenderId) {
        _id defaultMarkupPct
        rows {
          _id type sortOrder itemNumber description indentLevel
          quantity unit subcontractorUP truckingUP materialUP crewUP rentalUP
          markupOverride calculatorType calculatorInputs
        }
      }
    }
  `;
  ```

- [ ] Commit:
  ```bash
  git add client/src/components/TenderPricing/PricingSheet.tsx \
          client/src/components/TenderPricing/PricingRow.tsx
  git commit -m "feat(tender-pricing): add PricingSheet and PricingRow components"
  ```

---

## Task 14: CalculatorPanel component

`CalculatorPanel` is a Chakra `Drawer` (size `"xl"`) with:
- Left column (~280px): scrollable list of item rows from the sheet (schedule/group rows shown as non-clickable labels for context; item rows are clickable to switch selection)
- Right column: calculator form

Calculator form sections (use Chakra `Stack`, `FormControl`, `Input`, `Select`):
1. **Header**: item number + description (read-only context), Bid UP badge
2. **Output bar**: 5 values (Truck UP / Mat UP / Crew UP / Rental UP / Bid UP) — computed live using `computeCalculatorUPs` from `compute.ts`, updating as user types
3. **Work Type pills**: render `Object.values(WORK_TYPE_TEMPLATES)` as selectable pills; selecting one calls `resetToTemplate(template)` which fills form state with `template.defaultInputs`
4. **Material section** (hidden when basis = lumpsum): depth, density, material cost/unit → shows derived `unitsPerBaseUnit` inline
5. **Production Rate** (hidden when basis = lumpsum): single input, with italic note about not sandbagging
6. **Trucking section**: method toggle (Chakra `RadioGroup`), conditional inputs
7. **Crew table**: editable table rows (role, qty, rate), "Load from library" button opens a secondary popover listing `crewConfigs` from `tenderRateLibrary` query
8. **Equipment table**: same pattern as crew
9. **Save button**: calls `tenderPricingRowUpdate` mutation with the current computed UPs (truckingUP, materialUP, crewUP, rentalUP) AND `calculatorInputs`

Props:
```tsx
interface CalculatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  row: TenderPricingRow;
  allRows: TenderPricingRow[];
  defaultMarkupPct: number;
  sheetId: string;
  onSaved: (updatedSheet: TenderPricingSheet) => void;
}
```

State: a local copy of `calculatorInputs` that drives the live output bar. On save, write the computed UPs back to the row along with `calculatorInputs`.

- [ ] Create `client/src/components/TenderPricing/CalculatorPanel.tsx`

- [ ] Commit:
  ```bash
  git add client/src/components/TenderPricing/CalculatorPanel.tsx
  git commit -m "feat(tender-pricing): add CalculatorPanel component"
  ```

---

## Task 15: Pricing page

- [ ] Create `client/src/pages/tender/[id]/pricing.tsx`:

The client has no path aliases — use relative imports. Note that `Permission` is a default export, and `UserRoles` comes from `generated/graphql` (not a server-side file):

```tsx
import { useRouter } from "next/router";
import { Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@chakra-ui/react";
import Link from "next/link";
import { gql, useQuery } from "@apollo/client";
import Permission from "../../../components/Common/Permission";
import { UserRoles } from "../../../generated/graphql";
import PricingSheet from "../../../components/TenderPricing/PricingSheet";

const TENDER_NAME_QUERY = gql`
  query TenderName($id: ID!) {
    tender(id: $id) { _id name jobcode }
  }
`;

export default function TenderPricingPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { data } = useQuery(TENDER_NAME_QUERY, { variables: { id }, skip: !id });
  const tenderName = data?.tender?.name ?? id;

  return (
    <Permission minRole={UserRoles.ProjectManager} showError>
      <Box p={4}>
        <Breadcrumb mb={4} fontSize="sm">
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href="/tenders">Tenders</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href={`/tender/${id}`}>{tenderName}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Pricing</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        {id && <PricingSheet tenderId={id} />}
      </Box>
    </Permission>
  );
}
```

Also note: `Permission` usage — look at how existing tender pages use it (e.g. `client/src/pages/tenders.tsx`) and match that pattern exactly.

- [ ] Run codegen to generate TypeScript types for the new queries/mutations:
  ```bash
  cd client && npm run codegen
  ```

- [ ] Check the app in the browser:
  1. Navigate to a tender → click "Pricing Sheet"
  2. Sheet is created, empty state shown
  3. Add a Schedule row, a Group row, and a Line Item
  4. Open the calculator on the line item, select "Gravel", check that the output bar updates as inputs change
  5. Save — confirm the UP columns update on the sheet row

- [ ] Commit:
  ```bash
  git add client/src/pages/tender/ client/src/generated/
  git commit -m "feat(tender-pricing): add pricing page and run codegen"
  ```

---

## Task 16: Final smoke test + PR prep

- [ ] Verify all 12 verification scenarios from the spec pass manually in the browser.

- [ ] Check pod logs for any runtime errors:
  ```bash
  kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=50
  ```

- [ ] Push the branch:
  ```bash
  git push -u origin feature/tender-pricing-sheet
  ```
