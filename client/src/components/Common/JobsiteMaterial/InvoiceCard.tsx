import React from "react";
import { Box, Flex, Heading, IconButton } from "@chakra-ui/react";
import { FiEdit, FiTrash, FiX } from "react-icons/fi";
import {
  InvoiceCardSnippetFragment,
  JobsitesMaterialsDocument,
  useInvoiceRemoveMutation,
} from "../../../generated/graphql";
import Permission from "../Permission";
import FormContainer from "../FormContainer";
import InvoiceUpdateForJobsiteMaterial from "../../Forms/Invoice/UpdateForJobsiteMaterial";
import InvoiceCardContent from "../Invoice/CardContent";

interface IInvoiceCardForJobsiteMaterial {
  invoice: InvoiceCardSnippetFragment;
  jobsiteMaterialId: string;
}

const InvoiceCardForJobsiteMaterial = ({
  invoice,
  jobsiteMaterialId,
}: IInvoiceCardForJobsiteMaterial) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  const [remove, { loading }] = useInvoiceRemoveMutation({
    refetchQueries: [JobsitesMaterialsDocument],
  });

  /**
   * ----- Rendering -----
   */

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <Flex flexDir="row" justifyContent="space-between">
        <InvoiceCardContent invoice={invoice} />
        <Permission>
          <Flex flexDir="row" justifyContent="end">
            {edit && (
              <IconButton
                aria-label="Remove"
                backgroundColor="transparent"
                icon={<FiTrash />}
                isLoading={loading}
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete this?")) {
                    await remove({
                      variables: {
                        id: invoice._id,
                      },
                    });
                    setEdit(false);
                  }
                }}
              />
            )}
            <IconButton
              isLoading={loading}
              backgroundColor="transparent"
              aria-label="edit"
              icon={edit ? <FiX /> : <FiEdit />}
              onClick={() => setEdit(!edit)}
            />
          </Flex>
        </Permission>
      </Flex>
      {edit && (
        <FormContainer>
          <Flex justifyContent="space-between">
            <Heading ml={1} my="auto" size="md">
              Edit Invoice
            </Heading>
            <IconButton
              icon={<FiX />}
              aria-label="exit"
              onClick={() => setEdit(false)}
              size="sm"
              backgroundColor="transparent"
            />
          </Flex>
          <InvoiceUpdateForJobsiteMaterial
            invoice={invoice}
            jobsiteMaterialId={jobsiteMaterialId}
            onSuccess={() => setEdit(false)}
          />
        </FormContainer>
      )}
    </Box>
  );
};

export default InvoiceCardForJobsiteMaterial;
