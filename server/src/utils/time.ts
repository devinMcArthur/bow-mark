import { System } from "@models";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const timezoneStartOfDayinUTC = async (day: Date) => {
  const system = await System.getSystem();

  return dayjs(day).tz(system.timezone).startOf("day").utc().toDate();
};

export const timezoneEndOfDayinUTC = async (day: Date) => {
  const system = await System.getSystem();

  return dayjs(day).tz(system.timezone).endOf("day").utc().toDate();
};
