import React from "react";
import { useToast } from "@chakra-ui/react";
import {
  InvoiceData,
  useJobsiteAddRevenueInvoiceMutation,
  JobsiteFullDocument,
} from "../../../generated/graphql";
import InvoiceBulkForm from "../Invoice/BulkForm";

interface IJobsiteRevenueInvoiceCreate {
  jobsiteId: string;
  onSuccess?: () => void;
}

const JobsiteRevenueInvoiceCreate = ({
  jobsiteId,
  onSuccess,
}: IJobsiteRevenueInvoiceCreate) => {
  const toast = useToast();

  const [create, { loading }] = useJobsiteAddRevenueInvoiceMutation({
    refetchQueries: [JobsiteFullDocument],
  });

  const handleSubmit = React.useCallback(
    async (rows: InvoiceData[]) => {
      const results = await Promise.allSettled(
        rows.map((data) => create({ variables: { jobsiteId, data } }))
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (failed === 0) {
        toast({
          status: "success",
          title:
            rows.length === 1 ? "Invoice added" : `${succeeded} invoices added`,
          isClosable: true,
        });
        if (onSuccess) onSuccess();
      } else if (succeeded === 0) {
        const firstErr = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );
        toast({
          status: "error",
          title: "Could not add invoices",
          description:
            firstErr?.reason instanceof Error
              ? firstErr.reason.message
              : "Unknown error",
          isClosable: true,
        });
      } else {
        toast({
          status: "warning",
          title: `${succeeded} added, ${failed} failed`,
          description: "Re-submit the failed rows after fixing them.",
          isClosable: true,
        });
      }
    },
    [create, jobsiteId, onSuccess, toast]
  );

  return (
    <InvoiceBulkForm
      submitHandler={handleSubmit}
      isLoading={loading}
      jobsiteId={jobsiteId}
      invoiceKind="revenue"
    />
  );
};

export default JobsiteRevenueInvoiceCreate;
