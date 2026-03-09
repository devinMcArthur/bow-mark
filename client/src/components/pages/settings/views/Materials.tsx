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
import MaterialFullList from "../../../Common/Material/FullList";
import MaterialCreateForm from "../../../Forms/Material/MaterialCreate";
import Permission from "../../../Common/Permission";
import InfoTooltip from "../../../Common/Info";

const MaterialSettings = () => {
  /**
   * ----- Hook Initialization -----
   */

  const [add, setAdd] = React.useState(false);

  /**
   * ----- Rendering -----
   */

  return (
    <Box>
      <Permission>
        <Flex justifyContent="space-between">
          <Flex flexDir="row">
            <Heading>Materials</Heading>
            <InfoTooltip description="A catalog of materials that can be selected throughout the app" />
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
      <MaterialFullList />

      {/* MATERIAL ADD */}
      <Modal isOpen={add} onClose={() => setAdd(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Material</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <MaterialCreateForm
              onSuccess={() => {
                setAdd(false);
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MaterialSettings;
