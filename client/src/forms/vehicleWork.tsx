import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";
import { VehicleWorkUpdateData } from "../generated/graphql";
import { IFormProps } from "../typescript/forms";
import TextField, { ITextField } from "../components/Common/forms/TextField";

const VehicleWorkUpdate = yup
  .object()
  .shape({
    jobTitle: yup.string(),
    hours: yup
      .number()
      .required("please provide hours")
      .typeError("please provide hours"),
  })
  .required();

export const useVehicleWorkUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(VehicleWorkUpdate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<VehicleWorkUpdateData>;
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
                label="Work Done (Optional)"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Hours: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="hours"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                label="Hours"
                type="number"
                isDisabled={isLoading}
                errorMessage={fieldState.error?.message}
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
