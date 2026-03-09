import * as yup from "yup";

export const RatesSchema = yup.array().of(
  yup.object().shape({
    date: yup
      .date()
      .required("please provide a date")
      .typeError("please provide a date"),
    rate: yup
      .number()
      .required("please provide a rate")
      .typeError("please provide a rate"),
  })
);

export const DefaultRatesSchema = yup.array().of(
  yup.object().shape({
    title: yup.string().required("please provide a title"),
    rates: RatesSchema,
  })
);
