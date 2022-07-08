import { useToast } from "@chakra-ui/react";
import React from "react";
import {
  InvoiceData,
  JobsiteMaterialCardSnippetFragment,
  useJobsiteMaterialAddInvoiceMutation,
} from "../../../generated/graphql";
import InvoiceForm from "../Invoice/Form";

interface IJobsiteMaterialInvoiceAddForm {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  onSuccess?: () => void;
}

const JobsiteMaterialInvoiceAddForm = ({
  jobsiteMaterial,
  onSuccess,
}: IJobsiteMaterialInvoiceAddForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [add, { loading }] = useJobsiteMaterialAddInvoiceMutation();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: InvoiceData) => {
      try {
        const res = await add({
          variables: {
            id: jobsiteMaterial._id,
            data,
          },
        });

        if (res.data?.jobsiteMaterialAddInvoice) {
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
    [add, jobsiteMaterial._id, onSuccess, toast]
  );

  /**
   * ----- Rendering -----
   */

  return <InvoiceForm submitHandler={handleSubmit} isLoading={loading} />;
};

export default JobsiteMaterialInvoiceAddForm;
