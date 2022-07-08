import React from "react";
import { useToast } from "@chakra-ui/react";
import {
  InvoiceData,
  useJobsiteAddExpenseInvoiceMutation,
} from "../../../generated/graphql";
import InvoiceForm from "../Invoice/Form";

interface IJobsiteExpenseInvoiceCreate {
  jobsiteId: string;
  onSuccess?: () => void;
}

const JobsiteExpenseInvoiceCreate = ({
  jobsiteId,
  onSuccess,
}: IJobsiteExpenseInvoiceCreate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [create, { loading }] = useJobsiteAddExpenseInvoiceMutation();

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(
    async (data: InvoiceData) => {
      try {
        const res = await create({
          variables: {
            jobsiteId,
            data,
          },
        });

        if (res.data?.jobsiteAddExpenseInvoice) {
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
    [create, jobsiteId, onSuccess, toast]
  );

  /**
   * ----- Rendering -----
   */

  return <InvoiceForm submitHandler={handleSubmit} isLoading={loading} />;
};

export default JobsiteExpenseInvoiceCreate;
