import { useToast } from "@chakra-ui/react";
import React from "react";
import {
  InvoiceCardSnippetFragment,
  InvoiceData,
  useInvoiceUpdateForJobsiteMaterialMutation,
} from "../../../generated/graphql";
import InvoiceForm from "./Form";

interface IInvoiceUpdateForJobsiteMaterial {
  invoice: InvoiceCardSnippetFragment;
  jobsiteMaterialId: string;
  onSuccess?: () => void;
}

const InvoiceUpdateForJobsiteMaterial = ({
  invoice,
  jobsiteMaterialId,
  onSuccess,
}: IInvoiceUpdateForJobsiteMaterial) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [update, { loading }] = useInvoiceUpdateForJobsiteMaterialMutation();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: InvoiceData) => {
      try {
        const res = await update({
          variables: {
            id: invoice._id,
            jobsiteMaterialId,
            data,
          },
        });

        if (res.data?.invoiceUpdateForJobsiteMaterial) {
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
    [update, invoice._id, jobsiteMaterialId, onSuccess, toast]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <InvoiceForm
      formOptions={{
        defaultValues: {
          companyId: invoice.company._id,
          invoiceNumber: invoice.invoiceNumber,
          cost: invoice.cost,
          date: invoice.date,
          description: invoice.description,
          internal: invoice.internal,
        },
      }}
      submitHandler={handleSubmit}
      isLoading={loading}
    />
  );
};

export default InvoiceUpdateForJobsiteMaterial;
