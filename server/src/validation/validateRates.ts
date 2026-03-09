import { IRatesData } from "@typescript/models";
import isEmpty from "@utils/isEmpty";

const validateRates = (rates: IRatesData[]) => {
  return new Promise<void>((resolve, reject) => {
    try {
      // ensure rates are provided
      if (rates.length === 0) throw new Error("Must provide at least one rate");

      for (let i = 0; i < rates.length; i++) {
        if (isEmpty(rates[i].rate)) throw new Error("Must provide a rate");

        if (!rates[i].date) throw new Error("Must provide a date");
      }

      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

export default validateRates;
