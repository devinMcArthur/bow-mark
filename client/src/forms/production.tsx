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
  ProductionCreateData,
  ProductionUpdateData,
} from "../generated/graphql";

import TextField, { ITextField } from "../components/Common/forms/TextField";
import { IFormProps } from "../typescript/forms";
import TextArea, { ITextArea } from "../components/Common/forms/TextArea";
import Unit, { IUnit } from "../components/Common/forms/Unit";

const ProductionData = {
  jobTitle: yup.string().required("please provide a job title"),
  quantity: yup
    .number()
    .required("please provide a quantity of work")
    .typeError("please provide a quantity of work"),
  unit: yup.string().required("please provide units"),
  startTime: yup.string().required("please provide a start time"),
  endTime: yup.string().required("please provide an end time"),
  description: yup.string(),
};

const ProductionUpdate = yup.object().shape(ProductionData).required();

export const useProductionUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(ProductionUpdate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<ProductionUpdateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
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
                label="Work Done"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    StartTime: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="startTime"
            render={({ field, fieldState }) => {
              return (
                <TextField
                  {...props}
                  {...field}
                  type="time"
                  errorMessage={fieldState.error?.message}
                  label="Start Time"
                  isDisabled={isLoading}
                />
              );
            }}
          />
        ),
        [isLoading, props]
      ),
    EndTime: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="endTime"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                type="time"
                errorMessage={fieldState.error?.message}
                label="End Time"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Quantity: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="quantity"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                type="number"
                errorMessage={fieldState.error?.message}
                label="Quantity"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Unit: ({ isLoading, ...props }: IFormProps<IUnit>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="unit"
            render={({ field, fieldState }) => (
              <Unit
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Unit"
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
  };

  return {
    FormComponents,
    ...form,
  };
};

const ProductionCreate = yup.object().shape(ProductionData).required();

export const useProductionCreateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(ProductionCreate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<ProductionCreateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
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
                label="Work Done"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    StartTime: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="startTime"
            render={({ field, fieldState }) => {
              return (
                <TextField
                  {...props}
                  {...field}
                  type="time"
                  errorMessage={fieldState.error?.message}
                  label="Start Time"
                  isDisabled={isLoading}
                />
              );
            }}
          />
        ),
        [isLoading, props]
      ),
    EndTime: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="endTime"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                type="time"
                errorMessage={fieldState.error?.message}
                label="End Time"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Quantity: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="quantity"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                type="number"
                errorMessage={fieldState.error?.message}
                label="Quantity"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Unit: ({ isLoading, ...props }: IFormProps<IUnit>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="unit"
            render={({ field, fieldState }) => (
              <Unit
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Unit"
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
  };

  return {
    FormComponents,
    ...form,
  };
};
