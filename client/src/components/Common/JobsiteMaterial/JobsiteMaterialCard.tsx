import React from "react";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  IconButton,
} from "@chakra-ui/react";
import {
  JobsiteFullDocument,
  JobsiteMaterialCardSnippetFragment,
  JobsiteMaterialCostType,
  useJobsiteMaterialInvoicesLazyQuery,
  useJobsiteMaterialRemoveMutation,
  UserRoles,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import { FiChevronDown, FiChevronUp, FiEdit, FiFileText, FiTrash } from "react-icons/fi";
import JobsiteMaterialUpdate from "../../Forms/JobsiteMaterial/JobsiteMaterialUpdate";
import Permission from "../Permission";
import JobsiteMaterialInvoices from "./Invoices";
import jobsiteMaterialName from "../../../utils/jobsiteMaterialName";
import ProgressBar from "../ProgressBar";
import Loading from "../Loading";

interface IJobsiteMaterialCard {
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment;
  /** Parent jobsite id — threaded to material invoices so edits can
   *  target the right `/jobsites/<id>/Invoices/MaterialInvoices/` folder. */
  jobsiteId?: string;
  selected?: boolean;
  showPreviousYears?: boolean;
  truckingRates?: { title: string }[];
}

const JobsiteMaterialCard = ({
  jobsiteMaterial,
  jobsiteId,
  selected,
  showPreviousYears,
  truckingRates,
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
      <Flex flexDir="row" justifyContent="space-between" align="center">
        <Heading size="md">{jobsiteMaterialName(jobsiteMaterial)}</Heading>
        <Permission>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Edit material"
            icon={<FiEdit />}
            onClick={() => setEdit(true)}
          />
        </Permission>
      </Flex>
      <Box>
        <ProgressBar
          totalLabel={`${formatNumber(jobsiteMaterial.quantity)} ${
            jobsiteMaterial.unit
          }`}
          completedLabel={`${formatNumber(completedQuantity)} ${
            jobsiteMaterial.unit
          }`}
          percentComplete={parseInt(
            formatNumber((completedQuantity / jobsiteMaterial.quantity) * 100)
          )}
        />
      </Box>

      {/* Invoices section — visible only for invoice-cost materials.
          A clear button with the count at the bottom of the card beats
          the old tiny top-right icon for discoverability. */}
      {jobsiteMaterial.costType === JobsiteMaterialCostType.Invoice && (
        <Permission minRole={UserRoles.ProjectManager}>
          <Flex justify="flex-end" mt={2}>
            <Button
              size="xs"
              variant="ghost"
              color="gray.600"
              leftIcon={<FiFileText />}
              rightIcon={showInvoice ? <FiChevronUp /> : <FiChevronDown />}
              onClick={() => setShowInvoice(!showInvoice)}
            >
              {showInvoice ? "Hide invoices" : "Show invoices"}
            </Button>
          </Flex>
          {showInvoice &&
            (!invoicesLoading ? (
              <JobsiteMaterialInvoices
                invoices={invoices?.jobsiteMaterial.invoices || []}
                jobsiteMaterial={jobsiteMaterial}
                jobsiteId={jobsiteId}
                showPreviousYears={showPreviousYears}
              />
            ) : (
              <Loading />
            ))}
        </Permission>
      )}

      {/* Edit drawer — matches invoice drawer pattern. Delete lives
          at the bottom of the body, gated on canRemove. */}
      <Drawer
        isOpen={edit}
        onClose={() => setEdit(false)}
        placement="right"
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            Edit Material{" "}
            <Box as="span" color="gray.500" fontWeight="normal" fontSize="sm">
              · {jobsiteMaterialName(jobsiteMaterial)}
            </Box>
          </DrawerHeader>
          <DrawerBody pb={6}>
            <JobsiteMaterialUpdate
              jobsiteMaterial={jobsiteMaterial}
              truckingRates={truckingRates}
            />
            {jobsiteMaterial.canRemove && (
              <Permission>
                <Box mt={8} pt={4} borderTopWidth="1px" borderColor="gray.200">
                  <Button
                    colorScheme="red"
                    variant="outline"
                    size="sm"
                    leftIcon={<FiTrash />}
                    isLoading={removeLoading}
                    onClick={async () => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete this material?"
                        )
                      ) {
                        await remove({
                          variables: { id: jobsiteMaterial._id },
                        });
                        setEdit(false);
                      }
                    }}
                  >
                    Delete material
                  </Button>
                </Box>
              </Permission>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default JobsiteMaterialCard;
