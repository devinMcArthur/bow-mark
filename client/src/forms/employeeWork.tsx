import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";

import { EmployeeWorkUpdateData } from "../generated/graphql";
import TextField, { ITextField } from "../components/Common/forms/TextField";
import { IFormProps } from "../typescript/forms";
import { ISelect } from "../components/Common/forms/Select";
import EmployeeWorkSelect from "../components/Common/forms/EmployeeWorkSelect";

const EmployeeWorkUpdate = yup
  .object()
  .shape({
    jobTitle: yup.string().required(),
    startTime: yup.string().required(),
    endTime: yup.string().required(),
  })
  .required();

export const useEmployeeWorkUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(EmployeeWorkUpdate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<EmployeeWorkUpdateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    JobTitle: ({ isLoading, ...props }: IFormProps<Omit<ISelect, "options">>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="jobTitle"
            render={({ field, fieldState }) => (
              <EmployeeWorkSelect
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
                  step={900}
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
                step={900}
                errorMessage={fieldState.error?.message}
                label="End Time"
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
