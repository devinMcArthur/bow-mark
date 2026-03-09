import React from "react";

import { useToast } from "@chakra-ui/react";
import { useMaterialCreateForm } from "../../../forms/material";
import {
  MaterialCreateData,
  MaterialFullSnippetFragment,
  useMaterialCreateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IMaterialCreateForm {
  onSuccess?: (material: MaterialFullSnippetFragment) => void;
}

const MaterialCreateForm = ({ onSuccess }: IMaterialCreateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useMaterialCreateForm();

  const [create, { loading }] = useMaterialCreateMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: MaterialCreateData) => {
      try {
        const res = await create({ variables: { data } });

        if (res.data?.materialCreate) {
          if (onSuccess) onSuccess(res.data.materialCreate);
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
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default MaterialCreateForm;
