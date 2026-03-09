import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";
import { VehicleCreateData, VehicleUpdateData } from "../generated/graphql";
import { IFormProps } from "../typescript/forms";
import TextField, { ITextField } from "../components/Common/forms/TextField";
import { MaterialShipmentVehicleTypes } from "../constants/select";
import CompanyVehicleTypes, {
  ICompanyVehicleTypes,
} from "../components/Common/forms/CompanyVehicleTypes";

const VehicleCreate = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
    vehicleCode: yup.string().required("please provide a vehicle code"),
    vehicleType: yup.string().required("please provide a vehicle type"),
  })
  .required();

export const useVehicleCreateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(VehicleCreate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<VehicleCreateData>;
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
    VehicleCode: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="vehicleCode"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Vehicle Code"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    VehicleType: ({ isLoading, ...props }: IFormProps<ICompanyVehicleTypes>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="vehicleType"
            defaultValue={MaterialShipmentVehicleTypes[0]}
            render={({ field, fieldState }) => (
              <CompanyVehicleTypes
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Vehicle Type"
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

const VehicleUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
    vehicleType: yup.string().required("please provide a vehicle type"),
    vehicleCode: yup.string().required("please provide a vehicle code"),
  })
  .required();

export const useVehicleUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(VehicleUpdateSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<VehicleUpdateData>;
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
    VehicleType: ({ isLoading, ...props }: IFormProps<ICompanyVehicleTypes>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="vehicleType"
            defaultValue={MaterialShipmentVehicleTypes[0]}
            render={({ field, fieldState }) => (
              <CompanyVehicleTypes
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Vehicle Type"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Code: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="vehicleCode"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Code"
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
