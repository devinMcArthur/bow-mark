import { useToast } from "@chakra-ui/react";
import React from "react";
import { useJobsiteUpdateForm } from "../../../forms/jobsite";
import {
  JobsiteCardSnippetFragment,
  JobsiteUpdateData,
  useJobsiteUpdateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IJobsiteUpdateForm {
  jobsite: JobsiteCardSnippetFragment;
  onSuccess?: () => void;
}

const JobsiteUpdateForm = ({ jobsite, onSuccess }: IJobsiteUpdateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useJobsiteUpdateForm({
    defaultValues: {
      name: jobsite.name,
    },
  });

  const [update, { loading }] = useJobsiteUpdateMutation();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: JobsiteUpdateData) => {
      try {
        const res = await update({ variables: { data, id: jobsite._id } });

        if (res.data?.jobsiteUpdate) {
          if (onSuccess) onSuccess();
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
    [jobsite._id, onSuccess, toast, update]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={handleSubmit}>
      <FormComponents.Name isLoading={loading} />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default JobsiteUpdateForm;
