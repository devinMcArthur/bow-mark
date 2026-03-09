import { SimpleGrid, useToast } from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { useProductionCreateForm } from "../../../../../forms/production";

import {
  DailyReportFullDocument,
  DailyReportFullSnippetFragment,
  ProductionCreateData,
  useProductionCreateMutation,
} from "../../../../../generated/graphql";
import convertHourToDate from "../../../../../utils/convertHourToDate";
import SubmitButton from "../../../../Common/forms/SubmitButton";

interface IProductionCreateForm {
  dailyReport: DailyReportFullSnippetFragment;
  closeForm?: () => void;
}

const ProductionCreateForm = ({
  dailyReport,
  closeForm,
}: IProductionCreateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useProductionCreateForm();

  const [create, { loading }] = useProductionCreateMutation({
    refetchQueries: [DailyReportFullDocument],
  });

  /**
   * ----- Functions -----
   */

  const submitCreation = React.useCallback(
    (data: ProductionCreateData) => {
      let startTime = convertHourToDate(data.startTime, dailyReport.date);
      let endTime = convertHourToDate(data.endTime, dailyReport.date);

      create({
        variables: {
          dailyReportId: dailyReport._id,
          data: {
            ...data,
            startTime,
            endTime,
          },
        },
      }).then(() => {
        toast({
          title: "Success",
          description: "Production successfully created",
          isClosable: true,
          status: "success",
        });
        if (closeForm) closeForm();
      });
    },
    [closeForm, create, dailyReport._id, dailyReport.date, toast]
  );

  return (
    <FormComponents.Form submitHandler={submitCreation}>
      <FormComponents.JobTitle isLoading={loading} />
      <SimpleGrid columns={[1, 1, 2]} spacing={2}>
        <FormComponents.Quantity isLoading={loading} />
        <FormComponents.Unit isLoading={loading} />
      </SimpleGrid>
      <SimpleGrid columns={[1, 1, 2]} spacing={2}>
        <FormComponents.StartTime isLoading={loading} />
        <FormComponents.EndTime isLoading={loading} />
      </SimpleGrid>
      <FormComponents.Description isLoading={loading} />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default ProductionCreateForm;
