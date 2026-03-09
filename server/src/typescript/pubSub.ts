import { registerEnumType } from "type-graphql";

export enum PubSubTopics {
  JOBSITE_MONTH_REPORT = "JOBSITE_MONTH_REPORT",
  JOBSITE_YEAR_REPORT = "JOBSITE_YEAR_REPORT",
  JOBSITE_YEAR_MASTER_REPORT = "JOBSITE_YEAR_MASTER_REPORT",
}

registerEnumType(PubSubTopics, {
  name: "PubSubTopics",
});
