import SchemaVersions from "@constants/SchemaVersions";
import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

/**
 * CrewKind — a bid-time crew archetype used in rate buildup Output nodes.
 *
 * Distinct from the operational Crew model (which represents specific, named
 * crews with employees and vehicles). At bid time, estimators reference an
 * interchangeable crew archetype like "Base Crew" or "Medium Forming Crew",
 * because they don't yet know which specific operational crew will do the job.
 *
 * Later we may tag operational Crew records with a crewKindId to enable
 * bid-vs-actual hour rollups; for now this catalog is independent.
 */
@ObjectType()
export class CrewKindSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({
    required: true,
    trim: true,
    unique: true,
  })
  public name!: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field()
  @prop({ required: true, default: SchemaVersions.CrewKind })
  public schemaVersion!: number;

  @Field(() => Date, { nullable: true })
  @prop({ required: false })
  public archivedAt?: Date;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;
}
