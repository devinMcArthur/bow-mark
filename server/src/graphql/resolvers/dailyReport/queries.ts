import { DailyReportListFilter } from "@typescript/dailyReport";
import { ListOptionData } from "@typescript/graphql";
import { Field, InputType, registerEnumType } from "type-graphql";

export enum DailyReportDateSort {
  Accending = "asc",
  Descending = "desc",
}

registerEnumType(DailyReportDateSort, {
  name: "DailyReportDateSort",
});

@InputType()
export class DailyReportListOptionData extends ListOptionData {
  @Field(() => [String], { nullable: true })
  public crews?: string[];

  @Field(() => [DailyReportListFilter], { nullable: true })
  public filters?: DailyReportListFilter[];

  @Field(() => DailyReportDateSort, { nullable: true })
  public dateSort?: DailyReportDateSort;
}
