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
  DailyReportCreateData,
  DailyReportUpdateData,
  FullUserSnippetFragment,
} from "../generated/graphql";
import { IFormProps } from "../typescript/forms";
import CrewSearch from "../components/Search/CrewSearch";
import JobsiteSearch from "../components/Search/JobsiteSearch";
import Select from "../components/Common/forms/Select";

const DailyReportCreate = yup
  .object()
  .shape({
    crewId: yup.string().required("please select a crew"),
    jobsiteId: yup.string().required("please select a jobsite"),
    date: yup.date().required().typeError("please provide a valid date"),
  })
  .required();

export const useDailyReportCreateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(DailyReportCreate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<DailyReportCreateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Date: ({
      isLoading,
      defaultValue,
    }: {
      isLoading?: boolean;
      defaultValue?: string;
    }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="date"
            defaultValue={defaultValue}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="date"
                label="Date"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [defaultValue, isLoading]
      ),
    Crew: ({
      isLoading,
      user,
      ...props
    }: IFormProps<ITextField> & {
      user: FullUserSnippetFragment | null | undefined;
    }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="crewId"
            render={({ field, fieldState }) => {
              if (
                user &&
                user.admin === false &&
                user.employee.crews.length > 0
              ) {
                return (
                  <Select
                    {...field}
                    defaultValue={user.employee.crews[0]._id}
                    label="Select Crew"
                    name="crewId"
                    errorMessage={fieldState.error?.message}
                    options={user.employee.crews.map((crew) => {
                      return {
                        value: crew._id,
                        title: crew.name,
                      };
                    })}
                  />
                );
              } else
                return (
                  <CrewSearch
                    {...field}
                    {...props}
                    label="Crew"
                    crewSelected={(crew) => field.onChange(crew._id)}
                    errorMessage={fieldState.error?.message}
                    isDisabled={isLoading}
                  />
                );
            }}
          />
        ),
        [isLoading, props, user]
      ),
    Jobsite: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="jobsiteId"
            render={({ field, fieldState }) => (
              <JobsiteSearch
                {...props}
                name={field.name}
                onBlur={field.onBlur}
                label="Jobsite"
                jobsiteSelected={(jobsite) => field.onChange(jobsite._id)}
                errorMessage={fieldState.error?.message}
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

const DailyReportUpdate = yup
  .object()
  .shape({
    date: yup.date().required().typeError("must provide a valid date"),
    jobsiteId: yup.string().required("must provide a jobsite"),
  })
  .required();

export const useDailyReportUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(DailyReportUpdate),
    ...options,
  });

  const { handleSubmit, setValue, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<DailyReportUpdateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Date: ({
      isLoading,
      defaultValue,
    }: {
      isLoading?: boolean;
      defaultValue?: string;
    }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="date"
            defaultValue={defaultValue}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="date"
                label="Date"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [defaultValue, isLoading]
      ),
    Jobsite: ({ isLoading, defaultValue, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="jobsiteId"
            defaultValue={defaultValue}
            render={({ field, fieldState }) => (
              <JobsiteSearch
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Jobsite"
                isDisabled={isLoading}
                jobsiteSelected={(jobsite) => {
                  setValue("jobsiteId", jobsite._id);
                }}
              />
            )}
          />
        ),
        [defaultValue, isLoading, props]
      ),
  };

  return {
    ...form,
    FormComponents,
  };
};
