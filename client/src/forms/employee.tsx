import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";
import {
  EmployeeCreateData,
  EmployeeUpdateData,
  Scalars,
} from "../generated/graphql";
import { IFormProps } from "../typescript/forms";
import TextField, { ITextField } from "../components/Common/forms/TextField";
import dayjs from "dayjs";

const EmployeeCreate = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
    jobTitle: yup.string().required("please provide a job title"),
  })
  .required();

export const useEmployeeCreateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(EmployeeCreate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<EmployeeCreateData>;
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
                label="Name"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    JobTitle: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="jobTitle"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Job Title"
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

const EmployeeUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
    jobTitle: yup.string().required("please provide a job title"),
  })
  .required();

export const useEmployeeUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(EmployeeUpdateSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<EmployeeUpdateData>;
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
                label="Name"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    JobTitle: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="jobTitle"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Job Title"
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

const EmployeeHourDateSchema = yup.object().shape({
  startTime: yup.date().required().typeError("please provide a valid date"),
  endTime: yup.date().required().typeError("please provide a valid date"),
});

export const useEmployeeHourDateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(EmployeeHourDateSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<{
        startTime: Scalars["DateTime"];
        endTime: Scalars["DateTime"];
      }>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    StartTime: ({
      isLoading,
      defaultValue = dayjs().startOf("year").toISOString(),
    }: {
      isLoading?: boolean;
      defaultValue?: string;
    }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="startTime"
            defaultValue={defaultValue}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="date"
                label="Start Time"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [defaultValue, isLoading]
      ),
    EndTime: ({
      isLoading,
      defaultValue = new Date().toISOString(),
    }: {
      isLoading?: boolean;
      defaultValue?: string;
    }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="endTime"
            defaultValue={defaultValue}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="date"
                label="End Time"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [defaultValue, isLoading]
      ),
  };

  return {
    FormComponents,
    ...form,
  };
};
