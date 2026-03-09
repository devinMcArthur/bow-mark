import React from "react";

import { Stack, useToast } from "@chakra-ui/react";
import { useDailyReportCreateForm } from "../../../forms/dailyReport";
import {
  DailyReportCreateData,
  DailyReportFullSnippetFragment,
  useDailyReportCreateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";
import { useAuth } from "../../../contexts/Auth";

interface IDailyReportCreateForm {
  onSuccess?: (dailyReport: DailyReportFullSnippetFragment) => void;
}

const DailyReportCreateForm = ({ onSuccess }: IDailyReportCreateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { user },
  } = useAuth();

  const toast = useToast();

  const { FormComponents } = useDailyReportCreateForm({
    defaultValues: {
      date: new Date(),
      crewId: user?.employee?.crews[0]?._id || "",
    },
  });

  const [create, { loading }] = useDailyReportCreateMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: DailyReportCreateData) => {
      try {
        const res = await create({ variables: { data } });

        if (res.data?.dailyReportCreate) {
          if (onSuccess) onSuccess(res.data.dailyReportCreate);
        } else {
          toast({
            status: "error",
            title: "Error",
            description: "Something went wrong, please try again",
            isClosable: true,
          });
        }
      } catch (e: any) {
        toast({
          status: "error",
          title: "Error",
          description: e.message,
          isClosable: true,
        });
      }
    },
    [create, onSuccess, toast]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={submitHandler}>
      <Stack spacing={2}>
        <FormComponents.Date isLoading={loading} />
        <FormComponents.Crew isLoading={loading} user={user} />
        <FormComponents.Jobsite isLoading={loading} />
        <SubmitButton isLoading={loading} />
      </Stack>
    </FormComponents.Form>
  );
};

export default DailyReportCreateForm;
