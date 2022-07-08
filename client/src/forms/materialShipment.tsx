import React from "react";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormProps,
} from "react-hook-form";
import * as yup from "yup";
import {
  JobsiteMaterialCardSnippetFragment,
  JobsiteMaterialCostType,
  MaterialShipmentUpdateData,
} from "../generated/graphql";

import TextField, { ITextField } from "../components/Common/forms/TextField";
import { IFormProps } from "../typescript/forms";
import MaterialSearch from "../components/Search/MaterialSearch";
import Select, { ISelect } from "../components/Common/forms/Select";
import Unit, { IUnit } from "../components/Common/forms/Unit";
import NumberForm, { INumber } from "../components/Common/forms/Number";
import CompanySearch from "../components/Search/CompanySearch";
import ContactOffice from "../components/Common/ContactOffice";
import jobsiteMaterialName from "../utils/jobsiteMaterialName";

const MaterialShipmentUpdate = yup
  .object()
  .shape({
    noJobsiteMaterial: yup.boolean().required(),
    jobsiteMaterialId: yup.string().when("noJobsiteMaterial", {
      is: false,
      then: yup.string().required("must provide material"),
    }),
    shipmentType: yup
      .string()
      .nullable()
      .when("noJobsiteMaterial", {
        is: true,
        then: yup.string().required("must provide material"),
      }),
    supplier: yup
      .string()
      .nullable()
      .when("noJobsiteMaterial", {
        is: true,
        then: yup.string().required("must provide supplier"),
      }),
    unit: yup
      .string()
      .nullable()
      .when("noJobsiteMaterial", {
        is: true,
        then: yup.string().required("must provide unit"),
      }),
    quantity: yup.number().required(),
    startTime: yup.string().optional().nullable(),
    endTime: yup.string().optional().nullable(),
    vehicleObject: yup
      .object()
      .shape({
        source: yup.string(),
        vehicleCode: yup.string(),
        vehicleType: yup.string(),
        truckingRateId: yup.string().nullable(),
        deliveredRateId: yup.string().nullable(),
      })
      .nullable(),
  })
  .required();

export const useMaterialShipmentUpdateForm = (options?: UseFormProps) => {
  const form = useForm({
    resolver: yupResolver(MaterialShipmentUpdate),
    ...options,
  });

  const { control, handleSubmit, watch, setValue, clearErrors } = form;

  const noJobsiteMaterial = watch("noJobsiteMaterial");

  const jobsiteMaterialId = watch("jobsiteMaterialId");

  const FormComponents = {
    Form: ({
      children,
      submitHandler,
    }: {
      children: React.ReactNode;
      submitHandler: SubmitHandler<MaterialShipmentUpdateData>;
    }) => <form onSubmit={handleSubmit(submitHandler)}>{children}</form>,
    JobsiteMaterial: ({
      isLoading,
      jobsiteMaterials,
      ...props
    }: IFormProps<Omit<ISelect, "options">> & {
      jobsiteMaterials: JobsiteMaterialCardSnippetFragment[];
    }) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="jobsiteMaterialId"
            render={({ field: { onChange, value, ...field }, fieldState }) => (
              <Select
                {...props}
                {...field}
                options={jobsiteMaterials.map((material) => {
                  return {
                    title: jobsiteMaterialName(material),
                    value: material._id,
                  };
                })}
                value={noJobsiteMaterial ? null : value}
                onChange={(e) => {
                  if (e.target.value) setValue("noJobsiteMaterial", false);
                  else setValue("noJobsiteMaterial", true);

                  onChange(e);
                }}
                errorMessage={fieldState.error?.message}
                label="Material"
                isDisabled={isLoading}
                placeholder="Material not listed"
              />
            )}
          />
        ),
        [isLoading, jobsiteMaterials, props]
      ),
    ShipmentType: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="shipmentType"
            render={({ field, fieldState }) => (
              <MaterialSearch
                {...props}
                {...field}
                defaultValue={field.value}
                errorMessage={fieldState.error?.message}
                label="Shipment Type"
                isDisabled={isLoading}
                materialSelected={(material) =>
                  setValue("shipmentType", material.name)
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
            name="supplier"
            render={({ field, fieldState }) => (
              <CompanySearch
                {...props}
                {...field}
                defaultValue={field.value}
                errorMessage={fieldState.error?.message}
                label="Supplier"
                isDisabled={isLoading}
                companySelected={(company) => {
                  setValue("supplier", company.name);
                }}
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
                  errorMessage={fieldState.error?.message}
                  label="Start Time (Optional)"
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
                errorMessage={fieldState.error?.message}
                label="End Time (Optional)"
                isDisabled={isLoading}
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
              <Unit
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
    VehicleSource: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="vehicleObject.source"
            render={({ field, fieldState }) => (
              <CompanySearch
                {...props}
                {...field}
                defaultValue={field.value}
                errorMessage={fieldState.error?.message}
                label="Vehicle Source"
                isDisabled={isLoading}
                companySelected={(company) => {
                  setValue("vehicleObject.source", company.name);
                }}
                helperText={
                  <>
                    if not available contact <ContactOffice />
                  </>
                }
              />
            )}
          />
        ),
        [isLoading, props]
      ),
    VehicleType: ({
      isLoading,
      isDelivered,
      ...props
    }: IFormProps<ISelect> & { isDelivered: boolean }) =>
      React.useMemo(() => {
        let name = "vehicleObject.truckingRateId";
        if (isDelivered) {
          name = "vehicleObject.deliveredRateId";
        }

        return (
          <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
              <Select
                {...props}
                {...field}
                onChange={(e) => {
                  if (e.target.value) {
                    // Value is defined
                    setValue(
                      "vehicleObject.vehicleType",
                      e.target.options[e.target.selectedIndex].text
                    );
                    if (isDelivered) {
                      setValue("vehicleObject.deliveredRateId", e.target.value);
                    } else {
                      setValue("vehicleObject.truckingRateId", e.target.value);
                    }
                  } else {
                    // Value is null
                    setValue("vehicleObject.vehicleType", null);
                    setValue("vehicleObject.deliveredRateId", null);
                    setValue("vehicleObject.truckingRateId", null);
                  }
                }}
                placeholder="Select vehicle type"
                errorMessage={fieldState.error?.message}
                label="Vehicle Type"
                isDisabled={isLoading}
                helperText={
                  <>
                    if not available contact <ContactOffice />
                  </>
                }
              />
            )}
          />
        );
      }, [isDelivered, isLoading, props]),
    VehicleCode: ({ isLoading, ...props }: IFormProps<ITextField>) =>
      React.useMemo(
        () => (
          <Controller
            control={control}
            name="vehicleObject.vehicleCode"
            render={({ field, fieldState }) => (
              <TextField
                {...props}
                {...field}
                label="Vehicle Code"
                isDisabled={isLoading}
                errorMessage={fieldState.error?.message}
                onChange={(e) =>
                  setValue("vehicleObject.vehicleCode", e.target.value)
                }
                helperText="&nbsp;"
              />
            )}
          />
        ),
        [isLoading, props]
      ),
  };

  return {
    FormComponents,
    noJobsiteMaterial,
    jobsiteMaterialId,
    ...form,
  };
};
