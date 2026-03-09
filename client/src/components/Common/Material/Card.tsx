import {
  Flex,
  Heading,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { FiArchive, FiEdit, FiTrash } from "react-icons/fi";
import {
  MaterialFullSnippetFragment,
  MaterialsFullDocument,
  useMaterialArchiveMutation,
  useMaterialRemoveMutation,
} from "../../../generated/graphql";
import MaterialUpdateForm from "../../Forms/Material/MaterialUpdate";
import Card from "../Card";
import Permission from "../Permission";

interface IMaterialCard {
  material: MaterialFullSnippetFragment;
}

const MaterialCard = ({ material }: IMaterialCard) => {
  /**
   * ----- Hook Initialization
   */

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [remove, { loading: removeLoading, data: removeData }] =
    useMaterialRemoveMutation({
      refetchQueries: [MaterialsFullDocument],
    });

  const [archive, { loading: archiveLoading, data: archiveData }] =
    useMaterialArchiveMutation({
      refetchQueries: [MaterialsFullDocument],
    });

  /**
   * ----- Rendering -----
   */

  return (
    <Card
      filter={
        archiveData?.materialArchive._id || removeData?.materialRemove
          ? "blue(3px)"
          : ""
      }
    >
      <Flex flexDir="row" justifyContent="space-between">
        <Heading size="md">{material.name}</Heading>
        <Flex flexDir="row">
          <Permission>
            {material.canRemove && (
              <Tooltip label="This material can be removed as it is not referenced by an existing Jobsite Material. It is still recommended that these are not deleted.">
                <IconButton
                  aria-label="delete"
                  icon={<FiTrash />}
                  backgroundColor="transparent"
                  isLoading={removeLoading}
                  onClick={() => {
                    if (window.confirm("Are you sure?"))
                      remove({
                        variables: {
                          id: material._id,
                        },
                      });
                  }}
                />
              </Tooltip>
            )}
            <IconButton
              aria-label="archive"
              icon={<FiArchive />}
              backgroundColor="transparent"
              isLoading={archiveLoading}
              onClick={() => {
                if (window.confirm("Are you sure?"))
                  archive({
                    variables: {
                      id: material._id,
                    },
                  });
              }}
            />
            <IconButton
              aria-label="edit"
              icon={<FiEdit />}
              backgroundColor="transparent"
              onClick={() => onOpen()}
            />
          </Permission>
        </Flex>
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Material</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <MaterialUpdateForm
              material={material}
              onSuccess={() => onClose()}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
};

export default MaterialCard;
