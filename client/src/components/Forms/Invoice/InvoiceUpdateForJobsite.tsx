import React from "react";
import { useToast } from "@chakra-ui/react";
import {
  InvoiceCardSnippetFragment,
  InvoiceData,
  useInvoiceUpdateForJobsiteMutation,
} from "../../../generated/graphql";
import InvoiceForm from "./Form";

interface IInvoiceUpdateForJobsite {
  invoice: InvoiceCardSnippetFragment;
  jobsiteId: string;
  onSuccess?: () => void;
}

const InvoiceUpdateForJobsite = ({
  invoice,
  jobsiteId,
  onSuccess,
}: IInvoiceUpdateForJobsite) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [update, { loading }] = useInvoiceUpdateForJobsiteMutation();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: InvoiceData) => {
      try {
        const res = await update({
          variables: {
            id: invoice._id,
            jobsiteId,
            data,
          },
        });

        if (res.data?.invoiceUpdateForJobsite) {
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
    [update, invoice._id, jobsiteId, onSuccess, toast]
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
          accrual: invoice.accrual,
        },
      }}
      submitHandler={handleSubmit}
      isLoading={loading}
    />
  );
};

export default InvoiceUpdateForJobsite;
