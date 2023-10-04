import {
  Box,
  Button,
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import {
  JobsiteFullSnippetFragment, useJobsiteUpdateLocationMutation,
} from "../../../../../generated/graphql";
import MapForm from "../../../../Common/Map/MapForm";
import MapDisplay from "../../../../Common/Map/MapDisplay";
import { FiEdit } from "react-icons/fi";

interface IJobsiteLocationModal {
  jobsite: JobsiteFullSnippetFragment;
  isOpen: boolean;
  onClose: () => void;
}

const JobsiteLocationModal = ({
  jobsite,
  isOpen,
  onClose,
}: IJobsiteLocationModal) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(!jobsite.location);

  const [location, setLocation] = React.useState<google.maps.LatLngLiteral | undefined>(jobsite.location ? {
    lat: jobsite.location.latitude,
    lng: jobsite.location.longitude,
  } : undefined);

  const [update, { loading }] = useJobsiteUpdateLocationMutation();

  const toast = useToast();

  /**
   * ----- Variables -----
   */

  const showEdit = React.useMemo(() => {
    return !!jobsite.location;
  }, [jobsite]);

  /**
   * ----- Functions -----
   */

  const handleUpdate = async () => {
    try {
      if (!location) return;

      const res = await update({
        variables: {
          id: jobsite._id,
          data: {
            latitude: location.lat,
            longitude: location.lng,
          }
        },
      });

      if (res.data?.jobsiteLocation) {
        setEdit(false);
      } else {
        toast({
          status: "error",
          title: "Error",
          description: "Something went wrong, please try again",
          isClosable: true,
        });
      }
    } catch (e: any) {
      toast({
        status: "error",
        title: "Error",
        description: e.message,
        isClosable: true,
      });
    }
  };

  /**
   * ----- Render -----
   */

  return (
    <div>
      <Modal isOpen={isOpen} onClose={() => onClose()} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>
            <Flex flexDir="row" alignItems="center">
              Jobsite Location
              <Icon
                as={FiEdit}
                aria-label="Edit"
                boxSize="16px"
                ml={2}
                onClick={() => setEdit(!edit)}
                display={showEdit ? "block" : "none"}
                cursor={"pointer"}
              />
            </Flex>
          </ModalHeader>
          <ModalBody>
            <Box width="100%" height="60rem">
              {edit ? (
                <MapForm value={location} onPositionChange={(value) => setLocation(value)} />
              ) : (
                <MapDisplay value={location} placeName={jobsite.name} />
              )}
            </Box>
          </ModalBody>
          <ModalFooter>
            <SimpleGrid columns={2} spacing={2}>
              <Button
                onClick={() => onClose()}
                variantColor="gray"
                variant="outline"
                size="md"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  handleUpdate();
                }}
                colorScheme="blue"
                loadingText="Submitting"
                variant="solid"
                size="md"
                mr={2}
                disabled={loading || !edit}
              >
                Submit
              </Button>
            </SimpleGrid>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default JobsiteLocationModal;
