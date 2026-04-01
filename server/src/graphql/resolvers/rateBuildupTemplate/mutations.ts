import { RateBuildupTemplate, RateBuildupTemplateDocument } from "@models";
import SchemaVersions from "@constants/SchemaVersions";
import { Field, Float, ID, InputType } from "type-graphql";

// ─── Input types ──────────────────────────────────────────────────────────────

@InputType()
export class RateBuildupParameterDefInput {
  @Field() public id!: string;
  @Field() public label!: string;
  @Field({ nullable: true }) public prefix?: string;
  @Field({ nullable: true }) public suffix?: string;
  @Field(() => Float) public defaultValue!: number;
}

@InputType()
export class RateBuildupTableDefInput {
  @Field() public id!: string;
  @Field() public label!: string;
  @Field() public rowLabel!: string;
}

@InputType()
export class RateBuildupFormulaStepInput {
  @Field() public id!: string;
  @Field({ nullable: true }) public label?: string;
  @Field() public formula!: string;
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
}

@InputType()
export class RateBuildupIntermediateDefInput {
  @Field() public label!: string;
  @Field() public stepId!: string;
  @Field() public unit!: string;
}

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
  /** JSON-serialized CalculatorInputs: { params: Record<string,number>, tables: Record<string,RateEntry[]> } */
  @Field() public defaultInputs!: string;
  /** JSON-serialized Record<string, { x: number, y: number }> */
  @Field() public nodePositions!: string;
  /** JSON-serialized GroupDef[] */
  @Field() public groupDefs!: string;
}

// ─── Mutation logic ───────────────────────────────────────────────────────────

const save = async (
  data: SaveRateBuildupTemplateData
): Promise<RateBuildupTemplateDocument> => {
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
      defaultInputs: data.defaultInputs,
      nodePositions: data.nodePositions,
      groupDefs: data.groupDefs,
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
      defaultInputs: data.defaultInputs,
      nodePositions: data.nodePositions,
      groupDefs: data.groupDefs,
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
