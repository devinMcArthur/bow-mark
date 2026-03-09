import { ProductionDocument } from "@models";
import { IProductionUpdate } from "@typescript/production";
import dayjs from "dayjs";

const document = async (
  production: ProductionDocument,
  data: IProductionUpdate
) => {
  production.jobTitle = data.jobTitle;

  production.quantity = data.quantity;

  production.unit = data.unit;

  production.startTime = data.startTime;

  production.endTime = data.endTime;

  production.description = data.description;

  return;
};

const date = async (production: ProductionDocument, date: Date) => {
  const year = dayjs(date).get("year");
  const month = dayjs(date).get("month");
  const day = dayjs(date).get("date");

  production.startTime = dayjs(production.startTime)
    .set("year", year)
    .set("month", month)
    .set("date", day)
    .toDate();
  production.endTime = dayjs(production.endTime)
    .set("year", year)
    .set("month", month)
    .set("date", day)
    .toDate();

  return;
};

export default {
  document,
  date,
};
