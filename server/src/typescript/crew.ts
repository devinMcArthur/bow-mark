import { CrewClass, CrewDocument } from "@models";
import { Field, ID, ObjectType, registerEnumType } from "type-graphql";
import { Id } from "./models";

export enum CrewTypes {
  Base = "Base",
  Paving = "Paving",
  Tech = "Tech",
  Shop = "Shop",
  Patch = "Patch",
  Pour = "Pour",
  FormLineSetting = "Form/Line Setting",
  BasePrep = "Base Prep",
  FormTruck = "Form Truck",
  BreakoutCB = "Breakout / CB",
  Breakout = "Breakout",
  CatchBasins = "Catch Basins",
  Other = "Other",
}

registerEnumType(CrewTypes, {
  name: "CrewTypes",
});

export interface ICrewCreate {
  name: string;
  type: CrewTypes;
}

export interface ICrewUpdate {
  name: string;
  type: CrewTypes;
}

export interface ICrewSearchObject {
  score: number;
  crew: CrewDocument;
}

@ObjectType()
export class CrewLocationClass {
  @Field(() => CrewClass, { nullable: false })
  public crew!: CrewClass;

  @Field(() => [CrewLocationDayClass])
  public days!: CrewLocationDayClass[];
}

@ObjectType()
export class CrewLocationDayClass {
  @Field({ nullable: false })
  public date!: Date;

  @Field(() => [CrewLocationDayItemClass])
  public items!: CrewLocationDayItemClass[];
}

@ObjectType()
export class CrewLocationDayItemClass {
  @Field({ nullable: false })
  public jobsiteName!: string;

  @Field(() => ID, { nullable: false })
  public dailyReportId!: Id;
}
