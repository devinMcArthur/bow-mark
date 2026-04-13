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
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { FiArchive, FiEdit } from "react-icons/fi";
import {
  CrewKindCardSnippetFragment,
  CrewKindsDocument,
  useCrewKindArchiveMutation,
} from "../../../generated/graphql";
import CrewKindUpdateForm from "../../Forms/CrewKind/CrewKindUpdate";
import Card from "../Card";
import Permission from "../Permission";

interface ICrewKindCard {
  crewKind: CrewKindCardSnippetFragment;
}

const CrewKindCard = ({ crewKind }: ICrewKindCard) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [archive, { loading: archiveLoading }] = useCrewKindArchiveMutation({
    refetchQueries: [CrewKindsDocument],
  });

  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between" alignItems="flex-start">
        <Flex flexDir="column" flex={1}>
          <Heading size="md">{crewKind.name}</Heading>
          {crewKind.description && (
            <Text fontSize="sm" color="gray.500" mt={1}>
              {crewKind.description}
            </Text>
          )}
        </Flex>
        <Flex flexDir="row">
          <Permission>
            <IconButton
              aria-label="archive"
              icon={<FiArchive />}
              backgroundColor="transparent"
              isLoading={archiveLoading}
              onClick={() => {
                if (window.confirm("Archive this crew kind?"))
                  archive({ variables: { id: crewKind._id } });
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
          <ModalHeader>Edit Crew Kind</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <CrewKindUpdateForm
              crewKind={crewKind}
              onSuccess={() => onClose()}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
};

export default CrewKindCard;
