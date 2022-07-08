import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";

import { IFormProps } from "../typescript/forms";
import { ITextField } from "../components/Common/forms/TextField";
import MaterialSearch from "../components/Search/MaterialSearch";
import CompanySearch from "../components/Search/CompanySearch";
import {
  JobsiteMaterialCostType,
  JobsiteMaterialCreateData,
  JobsiteMaterialUpdateData,
} from "../generated/graphql";
import NumberForm, { INumber } from "../components/Common/forms/Number";
import Units, { IUnit } from "../components/Common/forms/Unit";
import Checkbox, { ICheckbox } from "../components/Common/forms/Checkbox";
import DefaultRates, {
  IDefaultRateError,
  IDefaultRates,
} from "../components/Common/forms/DefaultRates";
import JobsiteMaterialRatesForm, {
  IJobsiteMaterialRatesForm,
} from "../components/Forms/JobsiteMaterial/Rates";
import JobsiteMaterialDeliveredRatesForm, {
  IJobsiteMaterialDeliveredRateError,
  IJobsiteMaterialDeliveredRatesForm,
} from "../components/Forms/JobsiteMaterial/DeliveredRates";
import JobsiteMaterialCostTypeForm, {
  IJobsiteMaterialCostTypeForm,
} from "../components/Forms/JobsiteMaterial/CostType";

export const JobsiteMaterialRateSchema = yup.array().of(
  yup.object().shape({
    date: yup
      .date()
      .required("please provide a date")
      .typeError("please provide a date"),
    rate: yup
      .number()
      .required("please provide a rate")
      .typeError("please provide a rate"),
    estimated: yup.boolean().required(),
  })
);

export const JobsiteMaterialDeliveredRateSchema = yup.array().of(
  yup.object().shape({
    title: yup.string().required("please provide a title"),
    rates: JobsiteMaterialRateSchema,
  })
);

const defaultRates = [
  {
    rate: 0,
    date: new Date(),
    estimated: false,
  },
];

const defaultDeliveredRates = [
  {
    title: "",
    rates: defaultRates,
  },
];

const JobsiteMaterialCreateSchema = yup
  .object()
  .shape({
    materialId: yup.string().required("please enter a material"),
    supplierId: yup.string().required("please enter a supplier"),
    quantity: yup.number().required("please enter a quantity"),
    unit: yup.string().required("please enter a unit"),
    costType: yup.string().required(),
    rates: JobsiteMaterialRateSchema,
    deliveredRates: JobsiteMaterialDeliveredRateSchema,
    delivered: yup.boolean().optional(),
  })
  .required();

export const useJobsiteMaterialCreateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(JobsiteMaterialCreateSchema),
    defaultValues: {
      quantity: 0,
      costType: JobsiteMaterialCostType.Rate,
      rates: defaultRates,
      deliveredRates: defaultDeliveredRates,
      ...options?.defaultValues,
    },
    ...options,
  });

  const { handleSubmit, control, setValue, watch } = form;

  const costType: JobsiteMaterialCostType = watch("costType");

  React.useEffect(() => {
    if (costType === JobsiteMaterialCostType.DeliveredRate) {
      setValue("rates", []);
      setValue("deliveredRates", defaultDeliveredRates);
    } else if (costType === JobsiteMaterialCostType.Rate) {
      setValue("deliveredRates", []);
      setValue("rates", defaultRates);
    } else if (costType === JobsiteMaterialCostType.Invoice) {
      setValue("deliveredRates", []);
      setValue("rates", []);
    }
  }, [costType, setValue]);

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<JobsiteMaterialCreateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Material: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="materialId"
            render={({ field, fieldState }) => (
              <MaterialSearch
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Material"
                isDisabled={isLoading}
                materialSelected={(material) =>
                  setValue("materialId", material._id)
                }
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Supplier: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="supplierId"
            render={({ field, fieldState }) => (
              <CompanySearch
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Supplier"
                isDisabled={isLoading}
                companySelected={(company) =>
                  setValue("supplierId", company._id)
                }
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Quantity: ({ isLoading, ...props }: IFormProps<INumber>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="quantity"
            render={({ field, fieldState }) => (
              <NumberForm
                {...props}
                {...field}
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
              <Units
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
    CostType: ({
      isLoading,
      ...props
    }: IFormProps<IJobsiteMaterialCostTypeForm>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="costType"
            render={({ field }) => (
              <JobsiteMaterialCostTypeForm
                {...props}
                {...field}
                label="Costing Type"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [props, isLoading]
      ),
    Delivered: ({ isLoading, ...props }: IFormProps<ICheckbox>) =>
      React.useMemo(() => {
        if (costType === JobsiteMaterialCostType.Invoice)
          return (
            <Controller
              control={control}
              name="delivered"
              render={({ field }) => (
                <Checkbox {...props} {...field} isDisabled={isLoading}>
                  Delivered
                </Checkbox>
              )}
            />
          );
        else return null;
      }, [isLoading, props]),
    Rates: ({
      isLoading,
      ...props
    }: IFormProps<Omit<IJobsiteMaterialRatesForm, "rates">>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="rates"
            render={({ field, fieldState }) => (
              <JobsiteMaterialRatesForm
                {...props}
                {...field}
                label="Rates"
                rates={field.value}
                errors={fieldState.error as any}
                isLoading={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    DeliveredRates: ({
      ...props
    }: IFormProps<
      Omit<IJobsiteMaterialDeliveredRatesForm, "deliveredRates">
    >) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="deliveredRates"
            render={({ field, fieldState }) => (
              <JobsiteMaterialDeliveredRatesForm
                {...field}
                {...props}
                errors={
                  fieldState.error as
                    | IJobsiteMaterialDeliveredRateError[]
                    | undefined
                }
                titleName="Trucking Type"
                deliveredRates={field.value}
              />
            )}
          />
        ),
        [props]
      ),
  };

  return {
    FormComponents,
    costType,
    ...form,
  };
};

const JobsiteMaterialUpdateSchema = yup
  .object()
  .shape({
    supplierId: yup.string().required("please enter a supplier"),
    quantity: yup.number().required("please enter a quantity"),
    unit: yup.string().required("please enter a unit"),
    costType: yup.string().required(),
    rates: JobsiteMaterialRateSchema,
    deliveredRates: JobsiteMaterialDeliveredRateSchema,
    delivered: yup.boolean().optional(),
  })
  .required();

export const useJobsiteMaterialUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(JobsiteMaterialUpdateSchema),
    defaultValues: {
      quantity: 0,
      rates: defaultRates,
      costType: JobsiteMaterialCostType.Rate,
      deliveredRates: defaultDeliveredRates,
      delivered: false,
      ...options?.defaultValues,
    },
    ...options,
  });

  const { handleSubmit, control, setValue, watch } = form;

  const costType: JobsiteMaterialCostType = watch("costType");

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<JobsiteMaterialUpdateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    Supplier: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="supplierId"
            render={({ field, fieldState }) => (
              <CompanySearch
                {...props}
                {...field}
                errorMessage={fieldState.error?.message}
                label="Supplier"
                isDisabled={isLoading}
                companySelected={(company) =>
                  setValue("supplierId", company._id)
                }
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    Quantity: ({ isLoading, ...props }: IFormProps<INumber>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="quantity"
            render={({ field, fieldState }) => (
              <NumberForm
                {...props}
                {...field}
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
              <Units
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
    CostType: ({
      isLoading,
      ...props
    }: IFormProps<IJobsiteMaterialCostTypeForm>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="costType"
            render={({ field }) => (
              <JobsiteMaterialCostTypeForm
                {...props}
                {...field}
                label="Costing Type"
                isDisabled={isLoading}
              />
            )}
          />
        ),
        [props, isLoading]
      ),
    Delivered: ({ isLoading, ...props }: IFormProps<ICheckbox>) =>
      React.useMemo(() => {
        if (costType === JobsiteMaterialCostType.Invoice)
          return (
            <Controller
              control={control}
              name="delivered"
              render={({ field }) => (
                <Checkbox
                  {...props}
                  {...field}
                  isDisabled={isLoading}
                  isChecked={field.value}
                >
                  Delivered
                </Checkbox>
              )}
            />
          );
        else return null;
      }, [isLoading, props]),
    Rates: ({
      isLoading,
      ...props
    }: IFormProps<Omit<IJobsiteMaterialRatesForm, "rates">>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="rates"
            render={({ field, fieldState }) => (
              <JobsiteMaterialRatesForm
                {...props}
                {...field}
                label="Rates"
                rates={field.value}
                errors={fieldState.error as any}
                isLoading={isLoading}
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    DeliveredRates: ({
      ...props
    }: IFormProps<
      Omit<IJobsiteMaterialDeliveredRatesForm, "deliveredRates">
    >) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="deliveredRates"
            render={({ field, fieldState }) => (
              <JobsiteMaterialDeliveredRatesForm
                {...field}
                {...props}
                errors={
                  fieldState.error as
                    | IJobsiteMaterialDeliveredRateError[]
                    | undefined
                }
                titleName="Trucking Type"
                deliveredRates={field.value}
              />
            )}
          />
        ),
        [props]
      ),
  };

  return {
    FormComponents,
    costType,
    ...form,
  };
};
