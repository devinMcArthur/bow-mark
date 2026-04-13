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
import { CrewKindCreateData, CrewKindUpdateData } from "../generated/graphql";
import { IFormProps } from "../typescript/forms";

// ─── Create ───────────────────────────────────────────────────────────────────

const CrewKindCreateSchema = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
    description: yup.string(),
  })
  .required();

export const useCrewKindCreateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(CrewKindCreateSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<CrewKindCreateData>;
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
                label="Crew Kind Name"
                helperText="e.g. Base Crew, Medium Forming Crew"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Description: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                value={field.value ?? ""}
                errorMessage={fieldState.error?.message}
                label="Description"
                helperText="optional — context shown to estimators"
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

// ─── Update ───────────────────────────────────────────────────────────────────

const CrewKindUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
    description: yup.string(),
  })
  .required();

export const useCrewKindUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(CrewKindUpdateSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<CrewKindUpdateData>;
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
                value={field.value ?? ""}
                errorMessage={fieldState.error?.message}
                label="Crew Kind Name"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Description: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                value={field.value ?? ""}
                errorMessage={fieldState.error?.message}
                label="Description"
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
