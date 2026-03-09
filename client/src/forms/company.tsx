import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";

import TextField, { ITextField } from "../components/Common/forms/TextField";
import { CompanyCreateData } from "../generated/graphql";
import { IFormProps } from "../typescript/forms";

const CompanyCreate = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
  })
  .required();

export const useCompanyCreateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(CompanyCreate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<CompanyCreateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Name: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Company Name"
                isDisabled={isLoading}
              />
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
