import React from "react";
import { Box, Flex, Heading, IconButton } from "@chakra-ui/react";
import {
  JobsiteFullDocument,
  JobsiteMaterialCardSnippetFragment,
  JobsiteMaterialCostType,
  useJobsiteMaterialInvoicesLazyQuery,
  useJobsiteMaterialRemoveMutation,
  UserRoles,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import { FiEdit, FiTrash, FiX } from "react-icons/fi";
import JobsiteMaterialUpdate from "../../Forms/JobsiteMaterial/JobsiteMaterialUpdate";
import Permission from "../Permission";
import FormContainer from "../FormContainer";
import { FaFileInvoiceDollar } from "react-icons/fa";
import JobsiteMaterialInvoices from "./Invoices";
import jobsiteMaterialName from "../../../utils/jobsiteMaterialName";
import ProgressBar from "../ProgressBar";
import Loading from "../Loading";

interface IJobsiteMaterialCard {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  selected?: boolean;
  showPreviousYears?: boolean;
}

const JobsiteMaterialCard = ({
  jobsiteMaterial,
  selected,
  showPreviousYears,
}: IJobsiteMaterialCard) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  const [showInvoice, setShowInvoice] = React.useState(false);

  const ref = React.useRef<HTMLDivElement>(null);

  const [remove, { loading: removeLoading }] = useJobsiteMaterialRemoveMutation(
    {
      refetchQueries: [JobsiteFullDocument],
    }
  );

  const [invoiceQuery, { data: invoices, loading: invoicesLoading }] = useJobsiteMaterialInvoicesLazyQuery({
    variables: {
      id: jobsiteMaterial._id,
    }
  })

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (ref.current && selected) {
      ref.current.focus();
    }
  }, [ref, selected]);

  React.useEffect(() => {
    if (showInvoice && !invoicesLoading && !invoices) {
      invoiceQuery();
    }
  }, [invoiceQuery, invoicesLoading, showInvoice, invoices])

  /**
   * --- Variables ---
   */

  const completedQuantity = React.useMemo(() => {
    if (showPreviousYears) {
      return jobsiteMaterial.completedQuantity.reduce(
        (total, quantity) => total + quantity.quantity,
        0
      );
    } else {
      const currentYear = new Date().getFullYear();
      const currentYearQuantityRecord = jobsiteMaterial.completedQuantity.find(
        (quantityRecord) => quantityRecord.year === currentYear
      );
      if (currentYearQuantityRecord) return currentYearQuantityRecord.quantity;
      else return 0;
    }
  }, [jobsiteMaterial.completedQuantity, showPreviousYears]);

  /**
   * ----- Rendering -----
   */

  return (
    <Box
      p={2}
      w="100%"
      border="1px solid"
      borderColor="gray.300"
      ref={ref}
      tabIndex={0}
      _focusWithin={{ borderColor: "gray.600", backgroundColor: "gray.100" }}
    >
      <Flex flexDir="row" justifyContent="space-between">
        <Heading size="md">{jobsiteMaterialName(jobsiteMaterial)}</Heading>
        <Flex flexDir="row">
          {jobsiteMaterial.costType === JobsiteMaterialCostType.Invoice && (
            <Permission minRole={UserRoles.ProjectManager}>
              <IconButton
                backgroundColor="transparent"
                aria-label="invoices"
                icon={<FaFileInvoiceDollar />}
                onClick={() => setShowInvoice(!showInvoice)}
              />
            </Permission>
          )}

          {edit && jobsiteMaterial.canRemove && (
            <Permission>
              <IconButton
                icon={<FiTrash />}
                aria-label="delete"
                backgroundColor="transparent"
                onClick={() => {
                  if (window.confirm("Are you sure?")) {
                    remove({
                      variables: {
                        id: jobsiteMaterial._id,
                      },
                    });
                  }
                }}
                isLoading={removeLoading}
              />
            </Permission>
          )}
          <Permission>
            <IconButton
              backgroundColor="transparent"
              aria-label="edit"
              icon={edit ? <FiX /> : <FiEdit />}
              onClick={() => setEdit(!edit)}
            />
          </Permission>
        </Flex>
      </Flex>
      <Box>
        <ProgressBar
          totalLabel={`${formatNumber(jobsiteMaterial.quantity)} ${jobsiteMaterial.unit
            }`}
          completedLabel={`${formatNumber(completedQuantity)} ${jobsiteMaterial.unit
            }`}
          percentComplete={parseInt(
            formatNumber((completedQuantity / jobsiteMaterial.quantity) * 100)
          )}
        />
      </Box>
      {edit && (
        <FormContainer>
          <JobsiteMaterialUpdate jobsiteMaterial={jobsiteMaterial} />
        </FormContainer>
      )}
      {showInvoice && (!invoicesLoading ? (
        <JobsiteMaterialInvoices
          invoices={invoices?.jobsiteMaterial.invoices || []}
          jobsiteMaterial={jobsiteMaterial}
          showPreviousYears={showPreviousYears}
        />
      ) : <Loading />)}
    </Box>
  );
};

export default JobsiteMaterialCard;
