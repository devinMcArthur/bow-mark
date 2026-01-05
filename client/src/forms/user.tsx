import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";

import { LoginData, SignupData } from "../generated/graphql";
import TextField from "../components/Common/forms/TextField";
import Checkbox from "../components/Common/forms/Checkbox";

const UserLoginSchema = yup
  .object()
  .shape({
    email: yup.string().email("Not a valid email").required(),
    password: yup.string().required(),
    rememberMe: yup.boolean().default(true).required(),
  })
  .required();

export const useUserLoginForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(UserLoginSchema),
    defaultValues: {
      rememberMe: true,
    },
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<LoginData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Email: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="email"
                label="Email"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
                bgColor="white"
              />
            )}
          />
        ),
        [isLoading]
      ),
    Password: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
                bgColor="white"
              />
            )}
          />
        ),
        [isLoading]
      ),
    RememberMe: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="rememberMe"
            render={({ field }) => (
              <Checkbox {...field} defaultIsChecked={field.value} isDisabled={isLoading}>
                Remember Me
              </Checkbox>
            )}
          />
        ),
        [isLoading]
      ),
  };

  return {
    FormComponents,
    ...form,
  };
};

const UserSignupSchema = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
    email: yup
      .string()
      .email("please provide a valid email")
      .required("please provide an email"),
    password: yup.string().required("please provide a password"),
    confirmPassword: yup
      .string()
      .required("please confirm your password")
      .oneOf([yup.ref("password"), null], "passwords must match"),
  })
  .required();

export const useUserSignupForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(UserSignupSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<SignupData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Name: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Name"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
                bgColor="white"
              />
            )}
          />
        ),
        [isLoading]
      ),
    Email: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="email"
                label="Email"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
                bgColor="white"
              />
            )}
          />
        ),
        [isLoading]
      ),
    Password: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
                bgColor="white"
              />
            )}
          />
        ),
        [isLoading]
      ),
    ConfirmPassword: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Confirm Password"
                type="password"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
                bgColor="white"
              />
            )}
          />
        ),
        [isLoading]
      ),
  };

  return {
    FormComponents,
    ...form,
  };
};

const ForgotPasswordSchema = yup
  .object()
  .shape({
    email: yup.string().email("Not a valid email").required(),
  })
  .required();

export const useForgotPasswordForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(ForgotPasswordSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<{ email: string }>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Email: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="email"
                label="Email"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
                bgColor="white"
              />
            )}
          />
        ),
        [isLoading]
      ),
  };

  return {
    FormComponents,
    ...form,
  };
};

const PasswordResetSchema = yup
  .object()
  .shape({
    password: yup.string().required("please provide a password"),
    confirmPassword: yup
      .string()
      .required("please confirm your password")
      .oneOf([yup.ref("password"), null], "passwords must match"),
  })
  .required();

export const usePasswordResetForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(PasswordResetSchema),
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
        password: string;
        confirmPassword: string;
      }>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Password: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
                bgColor="white"
              />
            )}
          />
        ),
        [isLoading]
      ),
    ConfirmPassword: ({ isLoading }: { isLoading?: boolean }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Confirm Password"
                type="password"
                errorMessage={fieldState.error?.message}
                isDisabled={isLoading}
                bgColor="white"
              />
            )}
          />
        ),
        [isLoading]
      ),
  };

  return {
    FormComponents,
    ...form,
  };
};
