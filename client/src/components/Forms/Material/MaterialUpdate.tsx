import React from "react";

import { useToast } from "@chakra-ui/react";
import { useMaterialUpdateForm } from "../../../forms/material";
import {
  MaterialUpdateData,
  MaterialFullSnippetFragment,
  useMaterialUpdateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IMaterialUpdateForm {
  material: MaterialFullSnippetFragment;
  onSuccess?: (material: MaterialFullSnippetFragment) => void;
}

const MaterialUpdateForm = ({ material, onSuccess }: IMaterialUpdateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useMaterialUpdateForm({
    defaultValues: {
      name: material.name,
    },
  });

  const [create, { loading }] = useMaterialUpdateMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: MaterialUpdateData) => {
      try {
        const res = await create({ variables: { id: material._id, data } });

        if (res.data?.materialUpdate) {
          if (onSuccess) onSuccess(res.data.materialUpdate);
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
    [create, material._id, onSuccess, toast]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={submitHandler}>
      <FormComponents.Name isLoading={loading} />
      <FormComponents.Acceptance />
      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default MaterialUpdateForm;
