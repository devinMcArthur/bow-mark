import {
  ApolloCache,
  DefaultContext,
  MutationHookOptions,
} from "@apollo/client";
import { useToast } from "@chakra-ui/react";
import React from "react";
import { useCrewCreateForm } from "../../../forms/crew";

import {
  CrewCreateData,
  CrewCreateMutation,
  CrewFullSnippetFragment,
  Exact,
  useCrewCreateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface ICrewCreateForm {
  onSuccess?: (crew: CrewFullSnippetFragment) => void;
  mutationOptions?:
    | MutationHookOptions<
        CrewCreateMutation,
        Exact<{
          data: CrewCreateData;
        }>,
        DefaultContext,
        ApolloCache<any>
      >
    | undefined;
}

const CrewCreateForm = ({ onSuccess, mutationOptions }: ICrewCreateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [create, { loading }] = useCrewCreateMutation({
    ...mutationOptions,
  });

  const { FormComponents } = useCrewCreateForm();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: CrewCreateData) => {
      try {
        const res = await create({ variables: { data } });

        if (res.data?.crewCreate) {
          if (onSuccess) onSuccess(res.data.crewCreate);
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
      <FormComponents.Type isLoading={loading} />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default CrewCreateForm;
