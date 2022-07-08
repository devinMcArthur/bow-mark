import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";
import { InvoiceData } from "../generated/graphql";
import { IFormProps } from "../typescript/forms";
import TextField, { ITextField } from "../components/Common/forms/TextField";
import CompanySearch from "../components/Search/CompanySearch";
import NumberForm, { INumber } from "../components/Common/forms/Number";
import TextArea, { ITextArea } from "../components/Common/forms/TextArea";
import Checkbox, { ICheckbox } from "../components/Common/forms/Checkbox";

const InvoiceSchema = yup
  .object()
  .shape({
    companyId: yup.string().required("please provide a company"),
    invoiceNumber: yup.string().required("please provide an invoice number"),
    cost: yup.number().required("please provide a cost"),
    description: yup.string(),
    date: yup
      .date()
      .required("please provide a date")
      .typeError("please provide a date"),
    internal: yup
      .boolean()
      .required("please select whether internal invoice")
      .default(false),
    accrual: yup
      .boolean()
      .required("please select whether accrual invoice")
      .default(false),
  })
  .required();

export const useInvoiceForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(InvoiceSchema),
    defaultValues: {
      cost: 0,
      internal: false,
      date: new Date(),
      accrual: false,
      ...options?.defaultValues,
    },
    ...options,
  });

  const { handleSubmit, control, setValue } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<InvoiceData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Company: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="companyId"
            render={({ field, fieldState }) => (
              <CompanySearch
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Company"
                isDisabled={isLoading}
                companySelected={(company) =>
                  setValue("companyId", company._id)
                }
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    InvoiceNumber: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="invoiceNumber"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Invoice Number"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Cost: ({ isLoading, ...props }: IFormProps<INumber>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="cost"
            render={({ field, fieldState }) => (
              <NumberForm
                {...props}
                {...field}
                min={Number.MIN_SAFE_INTEGER}
                errorMessage={fieldState.error?.message}
                label="Cost"
                isDisabled={isLoading}
                inputLeftAddon="$"
                pattern="^([-+,0-9.]+)"
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Date: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="date"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                type="date"
                errorMessage={fieldState.error?.message}
                label="Date"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Description: ({ isLoading, ...props }: IFormProps<ITextArea>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <TextArea
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Description"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Internal: ({ isLoading, ...props }: IFormProps<ICheckbox>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="internal"
            render={({ field }) => (
              <Checkbox
                {...props}
                {...field}
                isDisabled={isLoading}
                isChecked={field.value}
              >
                Internal Invoice
              </Checkbox>
            )}
          />
        ),
        [isLoading, props]
      ),
    Accrual: ({ isLoading, ...props }: IFormProps<ICheckbox>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="accrual"
            render={({ field }) => (
              <Checkbox
                {...props}
                {...field}
                isDisabled={isLoading}
                isChecked={field.value}
              >
                Accrual
              </Checkbox>
            )}
          />
        ),
        [isLoading, props]
      ),
  };

  return {
    FormComponents,
    ...form,
  };
};
