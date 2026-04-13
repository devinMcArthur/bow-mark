import React from "react";
import { useToast } from "@chakra-ui/react";
import { useCrewKindUpdateForm } from "../../../forms/crewKind";
import {
  CrewKindUpdateData,
  CrewKindCardSnippetFragment,
  useCrewKindUpdateMutation,
  CrewKindsDocument,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface ICrewKindUpdateForm {
  crewKind: CrewKindCardSnippetFragment;
  onSuccess?: (crewKind: CrewKindCardSnippetFragment) => void;
}

const CrewKindUpdateForm = ({ crewKind, onSuccess }: ICrewKindUpdateForm) => {
  const toast = useToast();
  const { FormComponents } = useCrewKindUpdateForm({
    defaultValues: {
      name: crewKind.name,
      description: crewKind.description ?? "",
    },
  });
  const [update, { loading }] = useCrewKindUpdateMutation({
    refetchQueries: [CrewKindsDocument],
  });

  const submitHandler = React.useCallback(
    async (data: CrewKindUpdateData) => {
      try {
        const res = await update({ variables: { id: crewKind._id, data } });
        if (res.data?.crewKindUpdate) {
          if (onSuccess) onSuccess(res.data.crewKindUpdate);
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
    [update, crewKind._id, onSuccess, toast]
  );

  return (
    <FormComponents.Form submitHandler={submitHandler}>
      <FormComponents.Name isLoading={loading} />
      <FormComponents.Description isLoading={loading} />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default CrewKindUpdateForm;
