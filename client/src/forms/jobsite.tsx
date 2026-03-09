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
import {
  JobsiteContractData,
  JobsiteCreateData,
  JobsiteUpdateData,
} from "../generated/graphql";
import { IFormProps } from "../typescript/forms";
import TextArea, { ITextArea } from "../components/Common/forms/TextArea";
import NumberForm, { INumber } from "../components/Common/forms/Number";

const JobsiteCreate = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
    jobcode: yup.string().required("please enter a jobcode"),
    description: yup.string(),
  })
  .required();

export const useJobsiteCreateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(JobsiteCreate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<JobsiteCreateData>;
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
    Jobcode: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="jobcode"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Job Number"
                isDisabled={isLoading}
                placeholder="22-001"
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

const JobsiteUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
  })
  .required();

export const useJobsiteUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(JobsiteUpdateSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<JobsiteUpdateData>;
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
  };

  return {
    FormComponents,
    ...form,
  };
};

const JobsiteContractSchema = yup
  .object()
  .shape({
    bidValue: yup.number().required("Please provide a bid value"),
    expectedProfit: yup.number().required("Please provide an expected value"),
  })
  .required();

export const useJobsiteContractForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(JobsiteContractSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<JobsiteContractData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    BidValue: ({ isLoading, ...props }: IFormProps<INumber>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="bidValue"
            render={({ field, fieldState }) => (
              <NumberForm
                {...props}
                {...field}
                min={0}
                errorMessage={fieldState.error?.message}
                label="Bid Value"
                isDisabled={isLoading}
                inputLeftAddon="$"
                pattern="^([-+,0-9.]+)"
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    ExpectedProfit: ({ isLoading, ...props }: IFormProps<INumber>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="expectedProfit"
            render={({ field, fieldState }) => (
              <NumberForm
                {...props}
                {...field}
                min={0}
                errorMessage={fieldState.error?.message}
                label="Expected Profit"
                isDisabled={isLoading}
                inputLeftAddon="$"
                pattern="^([-+,0-9.]+)"
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
