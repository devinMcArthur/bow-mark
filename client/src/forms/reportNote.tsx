import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";
import { DailyReportNoteUpdateData } from "../generated/graphql";

import { IFormProps } from "../typescript/forms";
import TextArea, { ITextArea } from "../components/Common/forms/TextArea";

const ReportNoteUpdate = yup
  .object()
  .shape({
    note: yup.string(),
  })
  .required();

export const useReportNotesUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(ReportNoteUpdate),
    ...options,
  });

  const { control, handleSubmit } = form;

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<DailyReportNoteUpdateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Note: ({ isLoading, ...props }: IFormProps<ITextArea>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="note"
            render={({ field, fieldState }) => (
              <TextArea
                {...props}
                {...field}
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
