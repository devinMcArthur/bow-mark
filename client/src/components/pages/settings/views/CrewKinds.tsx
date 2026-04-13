import React from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import CrewKindFullList from "../../../Common/CrewKind/FullList";
import CrewKindCreateForm from "../../../Forms/CrewKind/CrewKindCreate";
import Permission from "../../../Common/Permission";
import InfoTooltip from "../../../Common/Info";

/**
 * Admin-only catalog of crew archetypes used in rate buildup Output nodes.
 * Distinct from the operational Crew model — CrewKinds represent bid-time
 * interchangeable crew categories like "Base Crew" or "Medium Forming Crew",
 * which estimators reference when they don't yet know which specific crew
 * will do the work.
 */
const CrewKindSettings = () => {
  const [add, setAdd] = React.useState(false);

  return (
    <Box>
      <Permission>
        <Flex justifyContent="space-between">
          <Flex flexDir="row">
            <Heading>Crew Kinds</Heading>
            <InfoTooltip description="Bid-time crew archetypes referenced from rate buildup Output nodes. Not the same as operational crews — these represent interchangeable categories like 'Base Crew' or 'Medium Forming Crew'." />
          </Flex>
          <Button
            backgroundColor="white"
            leftIcon={<FiPlus />}
            onClick={() => setAdd(true)}
          >
            Add
          </Button>
        </Flex>
      </Permission>
      <CrewKindFullList />

      <Modal isOpen={add} onClose={() => setAdd(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Crew Kind</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <CrewKindCreateForm onSuccess={() => setAdd(false)} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CrewKindSettings;
