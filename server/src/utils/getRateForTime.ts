import { RateClass } from "@typescript/models";
import getRateObjectForTime from "./getRateObjectForTime";

const getRateForTime = (
  rates: RateClass[],
  date: Date = new Date()
): number => {
  const rateObject = getRateObjectForTime(rates, date);
  if (rateObject) return rateObject.rate;
  else return 0;
};

export default getRateForTime;
