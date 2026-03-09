import { useToast } from "@chakra-ui/react";
import React from "react";

import { useJobsiteCreateForm } from "../../../forms/jobsite";
import {
  JobsiteCreateData,
  JobsiteFullSnippetFragment,
  useJobsiteCreateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IJobsiteCreateForm {
  onSuccess?: (jobsite: JobsiteFullSnippetFragment) => void;
}

const JobsiteCreateForm = ({ onSuccess }: IJobsiteCreateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useJobsiteCreateForm();

  const [create, { loading }] = useJobsiteCreateMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: JobsiteCreateData) => {
      try {
        const res = await create({ variables: { data } });

        if (res.data?.jobsiteCreate) {
          if (onSuccess) onSuccess(res.data.jobsiteCreate);
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
      <FormComponents.Name isLoading={loading} />
      <FormComponents.Jobcode isLoading={loading} />
      <FormComponents.Description isLoading={loading} />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default JobsiteCreateForm;
