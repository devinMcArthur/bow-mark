import React from "react";
import { SimpleGrid, useToast } from "@chakra-ui/react";
import {
  InvoiceCardSnippetFragment,
  InvoiceData,
  useInvoiceUpdateMutation,
  useJobsiteAddInvoiceMutation,
} from "../../../generated/graphql";
import { useInvoiceForm } from "../../../forms/invoice";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IInvoiceUpdate {
  invoice: InvoiceCardSnippetFragment;
  onSuccess?: () => void;
}

const InvoiceUpdate = ({ invoice, onSuccess }: IInvoiceUpdate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { FormComponents } = useInvoiceForm({
    defaultValues: {
      companyId: invoice.company._id,
      invoiceNumber: invoice.invoiceNumber,
      cost: invoice.cost,
      description: invoice.description,
      internal: invoice.internal,
    },
  });

  const [update, { loading }] = useInvoiceUpdateMutation();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: InvoiceData) => {
      try {
        const res = await update({
          variables: {
            id: invoice._id,
            data,
          },
        });

        if (res.data?.invoiceUpdate) {
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
    [update, invoice._id, onSuccess, toast]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={handleSubmit}>
      <FormComponents.Company isLoading={loading} />

      <SimpleGrid spacing={2} columns={[1, 1, 2]}>
        <FormComponents.Cost isLoading={loading} />
        <FormComponents.InvoiceNumber isLoading={loading} />
      </SimpleGrid>

      <FormComponents.Description isLoading={loading} />
      <FormComponents.Internal isLoading={loading} />

      <SubmitButton isLoading={loading} />
    </FormComponents.Form>
  );
};

export default InvoiceUpdate;