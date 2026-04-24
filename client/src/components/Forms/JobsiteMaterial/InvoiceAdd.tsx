import { useToast } from "@chakra-ui/react";
import React from "react";
import {
  InvoiceData,
  JobsiteMaterialCardSnippetFragment,
  useJobsiteMaterialAddInvoiceMutation,
  JobsitesMaterialsDocument,
} from "../../../generated/graphql";
import InvoiceBulkForm from "../Invoice/BulkForm";

interface IJobsiteMaterialInvoiceAddForm {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  /**
   * Parent jobsite id — enables the file-attachment widget when provided.
   * Required for the 90% flow where one company/date produces multiple
   * shipment invoices (the primary bulk use case).
   */
  jobsiteId?: string;
  onSuccess?: () => void;
}

const JobsiteMaterialInvoiceAddForm = ({
  jobsiteMaterial,
  jobsiteId,
  onSuccess,
}: IJobsiteMaterialInvoiceAddForm) => {
  const toast = useToast();

  const [add, { loading }] = useJobsiteMaterialAddInvoiceMutation({
    refetchQueries: [JobsitesMaterialsDocument],
  });

  const handleSubmit = React.useCallback(
    async (rows: InvoiceData[]) => {
      const results = await Promise.allSettled(
        rows.map((data) =>
          add({ variables: { id: jobsiteMaterial._id, data } })
        )
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
    [add, jobsiteMaterial._id, onSuccess, toast]
  );

  return (
    <InvoiceBulkForm
      submitHandler={handleSubmit}
      isLoading={loading}
      jobsiteId={jobsiteId}
      invoiceKind={jobsiteId ? "material" : undefined}
      // Supplier on the material is almost always the company issuing
      // the invoices — pre-filling saves a step per bulk add.
      defaultCompanyId={jobsiteMaterial.supplier?._id}
    />
  );
};

export default JobsiteMaterialInvoiceAddForm;
