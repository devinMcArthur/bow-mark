import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";
import { Scalars } from "../generated/graphql";
import TextField from "../components/Common/forms/TextField";
import dayjs from "dayjs";

const JobsiteMasterExcelGeneratorSchema = yup.object().shape({
  startTime: yup.date().required().typeError("please provide a valid date"),
  endTime: yup.date().required().typeError("please provide a valid date"),
});

export const useJobsiteMasterReportExcelGenerateForm = (
  options?: UseFormProps
) => {
  const form = useForm({
    resolver: yupResolver(JobsiteMasterExcelGeneratorSchema),
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
