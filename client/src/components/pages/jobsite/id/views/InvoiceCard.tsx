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
import {
  InvoiceCardSnippetFragment,
  JobsiteFullDocument,
  useInvoiceRemoveMutation,
} from "../../../../../generated/graphql";
import { FiEdit, FiTrash } from "react-icons/fi";
import InvoiceUpdateForJobsite from "../../../../Forms/Invoice/InvoiceUpdateForJobsite";
import Permission from "../../../../Common/Permission";
import InvoiceCardContent from "../../../../Common/Invoice/CardContent";

interface IInvoiceCardForJobsite {
  invoice: InvoiceCardSnippetFragment;
  jobsiteId: string;
  /**
   * Whether this card lives under the expense list or the revenue list.
   * Propagated to the update form so replacement files land in the
   * correct `/jobsites/<id>/Invoices/{Subcontractor|Revenue}/` folder.
   */
  invoiceKind?: "subcontractor" | "revenue";
}

const InvoiceCardForJobsite = ({
  invoice,
  jobsiteId,
  invoiceKind,
}: IInvoiceCardForJobsite) => {
  const [editOpen, setEditOpen] = React.useState(false);
  const [remove, { loading: removing }] = useInvoiceRemoveMutation({
    refetchQueries: [JobsiteFullDocument],
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

      {/* Edit drawer — slides in from the right. List stays visible
          behind the overlay so the user keeps their place. Destructive
          delete lives at the bottom, clearly separated from the form. */}
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
            <InvoiceUpdateForJobsite
              invoice={invoice}
              jobsiteId={jobsiteId}
              invoiceKind={invoiceKind}
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

export default InvoiceCardForJobsite;
