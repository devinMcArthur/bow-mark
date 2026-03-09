import React from "react";

import { useToast } from "@chakra-ui/react";
import { useCompanyCreateForm } from "../../../forms/company";
import {
  CompanyCreateData,
  CompanyCardSnippetFragment,
  useCompanyCreateMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface ICompanyCreateForm {
  onSuccess?: (company: CompanyCardSnippetFragment) => void;
}

const CompanyCreateForm = ({ onSuccess }: ICompanyCreateForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useCompanyCreateForm();

  const [create, { loading }] = useCompanyCreateMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: CompanyCreateData) => {
      try {
        const res = await create({ variables: { data } });

        if (res.data?.companyCreate) {
          if (onSuccess) onSuccess(res.data.companyCreate);
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

export default CompanyCreateForm;
