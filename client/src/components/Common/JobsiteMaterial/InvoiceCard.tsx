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
  IconButton,
} from "@chakra-ui/react";
import { FiEdit, FiTrash } from "react-icons/fi";
import {
  InvoiceCardSnippetFragment,
  JobsitesMaterialsDocument,
  useInvoiceRemoveMutation,
} from "../../../generated/graphql";
import Permission from "../Permission";
import InvoiceUpdateForJobsiteMaterial from "../../Forms/Invoice/UpdateForJobsiteMaterial";
import InvoiceCardContent from "../Invoice/CardContent";

interface IInvoiceCardForJobsiteMaterial {
  invoice: InvoiceCardSnippetFragment;
  jobsiteMaterialId: string;
  /** Parent jobsite id — lets the edit form target the right Invoices folder. */
  jobsiteId?: string;
}

const InvoiceCardForJobsiteMaterial = ({
  invoice,
  jobsiteMaterialId,
  jobsiteId,
}: IInvoiceCardForJobsiteMaterial) => {
  const [editOpen, setEditOpen] = React.useState(false);
  const [remove, { loading: removing }] = useInvoiceRemoveMutation({
    refetchQueries: [JobsitesMaterialsDocument],
  });

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <InvoiceCardContent
        invoice={invoice}
        rightActions={
          <Permission>
            <IconButton
              aria-label="Edit invoice"
              icon={<FiEdit />}
              size="sm"
              variant="ghost"
              onClick={() => setEditOpen(true)}
            />
          </Permission>
        }
      />

      <Drawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        placement="right"
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            Edit Invoice{" "}
            <Box as="span" color="gray.500" fontWeight="normal" fontSize="sm">
              · {invoice.company.name} #{invoice.invoiceNumber}
            </Box>
          </DrawerHeader>
          <DrawerBody pb={6}>
            <InvoiceUpdateForJobsiteMaterial
              invoice={invoice}
              jobsiteMaterialId={jobsiteMaterialId}
              jobsiteId={jobsiteId}
              onSuccess={() => setEditOpen(false)}
            />
            <Permission>
              <Box mt={8} pt={4} borderTopWidth="1px" borderColor="gray.200">
                <Button
                  colorScheme="red"
                  variant="outline"
                  size="sm"
                  leftIcon={<FiTrash />}
                  isLoading={removing}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this invoice?"
                      )
                    ) {
                      await remove({ variables: { id: invoice._id } });
                      setEditOpen(false);
                    }
                  }}
                >
                  Delete invoice
                </Button>
              </Box>
            </Permission>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default InvoiceCardForJobsiteMaterial;
