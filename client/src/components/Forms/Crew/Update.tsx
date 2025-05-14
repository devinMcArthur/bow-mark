import { useToast } from "@chakra-ui/react";
import React from "react";
import { useCrewUpdateForm } from "../../../forms/crew";
import {
  CrewCardSnippetFragment,
  CrewUpdateData,
  useCrewUpdateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface ICrewUpdateForm {
  crew: CrewCardSnippetFragment;
  onSuccess?: () => void;
}

const CrewUpdateForm = ({ crew, onSuccess }: ICrewUpdateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useCrewUpdateForm({
    defaultValues: {
      name: crew.name,
      type: crew.type,
    },
  });

  const [crewUpdate, { loading }] = useCrewUpdateMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: CrewUpdateData) => {
      try {
        const res = await crewUpdate({ variables: { id: crew._id, data } });

        if (res.data?.crewUpdate) {
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
    [crew._id, crewUpdate, onSuccess, toast]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={submitHandler}>
      <FormComponents.Name isLoading={loading} />
      <FormComponents.Type helperText="Changing this will affect reporting for this crew" isLoading={loading} />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default CrewUpdateForm;
