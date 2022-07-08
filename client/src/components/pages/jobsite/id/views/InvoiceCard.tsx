import React from "react";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import {
  InvoiceCardSnippetFragment,
  JobsiteFullDocument,
  useInvoiceRemoveMutation,
} from "../../../../../generated/graphql";
import { FiEdit, FiTrash, FiX } from "react-icons/fi";
import InvoiceUpdateForJobsite from "../../../../Forms/Invoice/InvoiceUpdateForJobsite";
import Permission from "../../../../Common/Permission";
import FormContainer from "../../../../Common/FormContainer";
import InvoiceCardContent from "../../../../Common/Invoice/CardContent";

interface IInvoiceCardForJobsite {
  invoice: InvoiceCardSnippetFragment;
  jobsiteId: string;
}

const InvoiceCardForJobsite = ({
  invoice,
  jobsiteId,
}: IInvoiceCardForJobsite) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  const [remove, { loading }] = useInvoiceRemoveMutation({
    refetchQueries: [JobsiteFullDocument],
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
              backgroundColor="transparent"
              isLoading={loading}
              aria-label="edit"
              icon={edit ? <FiX /> : <FiEdit />}
              onClick={() => setEdit(!edit)}
            />
          </Flex>
        </Permission>
      </Flex>
      {edit && (
        <FormContainer>
          <InvoiceUpdateForJobsite invoice={invoice} jobsiteId={jobsiteId} />
        </FormContainer>
      )}
    </Box>
  );
};

export default InvoiceCardForJobsite;
