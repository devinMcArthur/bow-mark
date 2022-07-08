import React from "react";
import { useToast } from "@chakra-ui/react";
import {
  InvoiceData,
  useJobsiteAddRevenueInvoiceMutation,
} from "../../../generated/graphql";
import InvoiceForm from "../Invoice/Form";

interface IJobsiteRevenueInvoiceCreate {
  jobsiteId: string;
  onSuccess?: () => void;
}

const JobsiteRevenueInvoiceCreate = ({
  jobsiteId,
  onSuccess,
}: IJobsiteRevenueInvoiceCreate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [create, { loading }] = useJobsiteAddRevenueInvoiceMutation();

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

        if (res.data?.jobsiteAddRevenueInvoice) {
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

  return <InvoiceForm isLoading={loading} submitHandler={handleSubmit} />;
};

export default JobsiteRevenueInvoiceCreate;
