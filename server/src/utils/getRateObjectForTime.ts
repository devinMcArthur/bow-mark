import { RateClass } from "@typescript/models";
import dayjs from "dayjs";

const getRateObjectForTime = <RateType extends RateClass>(
  rates: RateType[],
  date: Date
): RateType | null => {
  if (rates.length === 0) return null;

  const sortedRates = rates.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (let i = 0; i < sortedRates.length; i++) {
    const rateDate = dayjs(sortedRates[i].date);

    // Ensure rate exists
    if (isNaN(sortedRates[i].rate) || sortedRates[i].rate === null) return null;

    // Before all rates
    if (i === 0 && dayjs(date).isBefore(rateDate)) return sortedRates[i];

    // Same date
    if (dayjs(date).isSame(rateDate)) return sortedRates[i];

    // After all rates
    if (i === sortedRates.length - 1 && dayjs(date).isAfter(rateDate))
      return sortedRates[i];

    // In between rates
    if (
      sortedRates[i + 1] &&
      dayjs(date).isAfter(rateDate) &&
      dayjs(date).isBefore(dayjs(sortedRates[i + 1].date))
    )
      return sortedRates[i];
  }

  return null;
};

export default getRateObjectForTime;
