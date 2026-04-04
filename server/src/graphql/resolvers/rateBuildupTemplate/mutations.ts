import { RateBuildupTemplate, RateBuildupTemplateDocument } from "@models";
import SchemaVersions from "@constants/SchemaVersions";
import { Field, Float, ID, InputType } from "type-graphql";

// ─── Position ─────────────────────────────────────────────────────────────────

@InputType()
export class RateBuildupPositionInput {
  @Field(() => Float) public x!: number;
  @Field(() => Float) public y!: number;
  @Field(() => Float, { nullable: true }) public w?: number;
  @Field(() => Float, { nullable: true }) public h?: number;
}

// ─── Rate entry ───────────────────────────────────────────────────────────────

@InputType()
export class RateBuildupRateEntryInput {
  @Field() public id!: string;
  @Field() public name!: string;
  @Field(() => Float) public qty!: number;
  @Field(() => Float) public ratePerHour!: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@InputType()
export class RateBuildupControllerOptionInput {
  @Field() public id!: string;
  @Field() public label!: string;
}

@InputType()
export class RateBuildupControllerDefInput {
  @Field() public id!: string;
  @Field() public label!: string;
  @Field() public type!: string;
  @Field(() => Float, { nullable: true }) public defaultValue?: number;
  @Field(() => [RateBuildupControllerOptionInput], { nullable: true }) public options?: RateBuildupControllerOptionInput[];
  @Field(() => [String], { nullable: true }) public defaultSelected?: string[];
  @Field({ nullable: true }) public hint?: string;
  @Field(() => RateBuildupPositionInput) public position!: RateBuildupPositionInput;
}

// ─── Group ────────────────────────────────────────────────────────────────────

@InputType()
export class RateBuildupGroupActivationInput {
  @Field() public controllerId!: string;
  @Field({ nullable: true }) public condition?: string;
  @Field({ nullable: true }) public optionId?: string;
}

@InputType()
export class RateBuildupGroupDefInput {
  @Field() public id!: string;
  @Field() public label!: string;
  @Field({ nullable: true }) public parentGroupId?: string;
  @Field(() => [String]) public memberIds!: string[];
  @Field(() => RateBuildupGroupActivationInput, { nullable: true }) public activation?: RateBuildupGroupActivationInput;
  @Field(() => RateBuildupPositionInput) public position!: RateBuildupPositionInput;
}

// ─── Node defs ────────────────────────────────────────────────────────────────

@InputType()
export class RateBuildupParameterDefInput {
  @Field() public id!: string;
  @Field() public label!: string;
  @Field({ nullable: true }) public prefix?: string;
  @Field({ nullable: true }) public suffix?: string;
  @Field(() => Float) public defaultValue!: number;
  @Field({ nullable: true }) public hint?: string;
  @Field(() => RateBuildupPositionInput) public position!: RateBuildupPositionInput;
}

@InputType()
export class RateBuildupTableDefInput {
  @Field() public id!: string;
  @Field() public label!: string;
  @Field() public rowLabel!: string;
  @Field({ nullable: true }) public hint?: string;
  @Field(() => RateBuildupPositionInput) public position!: RateBuildupPositionInput;
  @Field(() => [RateBuildupRateEntryInput]) public defaultRows!: RateBuildupRateEntryInput[];
}

@InputType()
export class RateBuildupFormulaStepInput {
  @Field() public id!: string;
  @Field({ nullable: true }) public label?: string;
  @Field() public formula!: string;
  @Field(() => RateBuildupPositionInput) public position!: RateBuildupPositionInput;
}

@InputType()
export class RateBuildupBreakdownItemInput {
  @Field() public stepId!: string;
  @Field() public label!: string;
}

@InputType()
export class RateBuildupBreakdownDefInput {
  @Field() public id!: string;
  @Field() public label!: string;
  @Field(() => [RateBuildupBreakdownItemInput]) public items!: RateBuildupBreakdownItemInput[];
  @Field(() => RateBuildupPositionInput) public position!: RateBuildupPositionInput;
}

@InputType()
export class RateBuildupIntermediateDefInput {
  @Field() public label!: string;
  @Field() public stepId!: string;
  @Field() public unit!: string;
}

// ─── Unit variant ─────────────────────────────────────────────────────────────

@InputType()
export class RateBuildupUnitVariantInput {
  @Field() public unit!: string;
  @Field() public activatesGroupId!: string;
  @Field({ nullable: true }) public conversionFormula?: string;
}

// ─── Top-level save input ─────────────────────────────────────────────────────

@InputType()
export class SaveRateBuildupTemplateData {
  /** If provided, update the existing document; otherwise create a new one. */
  @Field(() => ID, { nullable: true }) public id?: string;
  @Field() public label!: string;
  @Field({ nullable: true }) public defaultUnit?: string;
  @Field(() => [RateBuildupParameterDefInput]) public parameterDefs!: RateBuildupParameterDefInput[];
  @Field(() => [RateBuildupTableDefInput]) public tableDefs!: RateBuildupTableDefInput[];
  @Field(() => [RateBuildupFormulaStepInput]) public formulaSteps!: RateBuildupFormulaStepInput[];
  @Field(() => [RateBuildupBreakdownDefInput]) public breakdownDefs!: RateBuildupBreakdownDefInput[];
  @Field(() => [RateBuildupIntermediateDefInput]) public intermediateDefs!: RateBuildupIntermediateDefInput[];
  @Field(() => [RateBuildupControllerDefInput]) public controllerDefs!: RateBuildupControllerDefInput[];
  @Field(() => [RateBuildupGroupDefInput]) public groupDefs!: RateBuildupGroupDefInput[];
  @Field(() => [RateBuildupUnitVariantInput], { nullable: true }) public unitVariants?: RateBuildupUnitVariantInput[];
  /** JSON string for the two synthetic nodes: { quantity: Position, unitPrice: Position } */
  @Field({ nullable: true }) public specialPositions?: string;
}

// ─── Mutation logic ───────────────────────────────────────────────────────────

const save = async (
  data: SaveRateBuildupTemplateData
): Promise<RateBuildupTemplateDocument> => {
  const duplicate = await RateBuildupTemplate.findOne({
    label: data.label,
    ...(data.id ? { _id: { $ne: data.id } } : {}),
  });
  if (duplicate) throw new Error(`A rate buildup template named "${data.label}" already exists`);

  if (data.id) {
    const existing = await RateBuildupTemplate.getById(data.id);
    if (!existing) throw new Error(`RateBuildupTemplate ${data.id} not found`);
    Object.assign(existing, {
      label: data.label,
      defaultUnit: data.defaultUnit,
      parameterDefs: data.parameterDefs,
      tableDefs: data.tableDefs,
      formulaSteps: data.formulaSteps,
      breakdownDefs: data.breakdownDefs,
      intermediateDefs: data.intermediateDefs,
      controllerDefs: data.controllerDefs,
      groupDefs: data.groupDefs,
      unitVariants: data.unitVariants ?? [],
      specialPositions: data.specialPositions,
      updatedAt: new Date(),
    });
    await existing.save();
    return existing;
  } else {
    const doc = new RateBuildupTemplate({
      label: data.label,
      defaultUnit: data.defaultUnit ?? "unit",
      parameterDefs: data.parameterDefs,
      tableDefs: data.tableDefs,
      formulaSteps: data.formulaSteps,
      breakdownDefs: data.breakdownDefs,
      intermediateDefs: data.intermediateDefs,
      controllerDefs: data.controllerDefs,
      groupDefs: data.groupDefs,
      unitVariants: data.unitVariants ?? [],
      specialPositions: data.specialPositions,
      schemaVersion: SchemaVersions.RateBuildupTemplate,
    });
    await doc.save();
    return doc;
  }
};

const remove = async (id: string): Promise<boolean> => {
  const doc = await RateBuildupTemplate.getById(id);
  if (!doc) throw new Error(`RateBuildupTemplate ${id} not found`);
  await doc.deleteOne();
  return true;
};

export default { save, remove };
