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
import { MaterialCreateData, MaterialUpdateData } from "../generated/graphql";
import { IFormProps } from "../typescript/forms";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Text,
} from "@chakra-ui/react";
import Checkbox from "../components/Common/forms/Checkbox";

const MaterialCreate = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
  })
  .required();

export const useMaterialCreateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(MaterialCreate),
    ...options,
  });

  const { handleSubmit, control } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<MaterialCreateData>;
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
                label="Material Name"
                helperText="do not include supplier"
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

const MaterialUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().required("please provide a name"),
  })
  .required();

export const useMaterialUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(MaterialUpdateSchema),
    ...options,
  });

  const { handleSubmit, control } = form;

  const [accepted, setAccepted] = React.useState(false);

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<MaterialUpdateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Name: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(() => {
        if (accepted)
          return (
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  {...props}
                  {...field}
                  errorMessage={fieldState.error?.message}
                  label="Material Name"
                  helperText="do not include supplier"
                  isDisabled={isLoading}
                />
              )}
            />
          );
        else return null;
      }, [isLoading, props]),
    Acceptance: () =>
      React.useMemo(() => {
        if (!accepted)
          return (
            <Box>
              <Alert status="warning">
                <AlertIcon />
                <AlertTitle>Important</AlertTitle>
              </Alert>
              <Text fontWeight="bold" m={2} style={{ textIndent: 10 }}>
                Updating this will change existing records throughout the app,
                such as jobsite materials.
              </Text>
              <Text m={2} style={{ textIndent: 10 }}>
                Do not fundamentally change the meaning of this material as it
                may ruin previous costing records.
              </Text>
              <Checkbox isChecked={accepted} onClick={() => setAccepted(true)}>
                I Understand
              </Checkbox>
            </Box>
          );
        else return null;
      }, []),
  };

  return {
    FormComponents,
    accepted,
    ...form,
  };
};
