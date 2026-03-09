import { TruckingRateClass, TruckingTypeRateClass } from "@models";
import dayjs from "dayjs";

const getTruckingRateForTime = (
  type: TruckingTypeRateClass,
  date: Date
): TruckingRateClass | null => {
  if (type.rates.length === 0) return null;

  const sortedRates = type.rates.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (let i = 0; i < sortedRates.length; i++) {
    const rateDate = dayjs(sortedRates[i].date);

    if (!sortedRates[i].rate) return null;

    // Before all type.rate
    if (i === 0 && dayjs(date).isBefore(rateDate)) return sortedRates[i];

    // After all type.rate
    if (i === sortedRates.length - 1 && dayjs(date).isAfter(rateDate))
      return sortedRates[i];

    // In between type.rate
    if (
      sortedRates[i + 1] &&
      dayjs(date).isAfter(rateDate) &&
      dayjs(date).isBefore(dayjs(sortedRates[i + 1].date))
    )
      return sortedRates[i];
  }

  return null;
};

export default getTruckingRateForTime;
