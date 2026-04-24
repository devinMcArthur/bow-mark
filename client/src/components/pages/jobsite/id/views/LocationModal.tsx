import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import {
  JobsiteFullSnippetFragment,
  useJobsiteUpdateLocationMutation,
} from "../../../../../generated/graphql";
import MapForm from "../../../../Common/Map/MapForm";

interface IJobsiteLocationModal {
  jobsite: JobsiteFullSnippetFragment;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Edit-only location modal. Drop-pin / search → Save persists lat/lng.
 * "View" mode is gone — when the user just wants to see the location,
 * they take the "Get directions" link straight to Google Maps from the
 * jobsite hero.
 */
const JobsiteLocationModal = ({
  jobsite,
  isOpen,
  onClose,
}: IJobsiteLocationModal) => {
  const toast = useToast();
  const [update, { loading }] = useJobsiteUpdateLocationMutation();

  // Local draft state — initialized from the persisted location each
  // time the modal opens. Reset on close so a discarded edit doesn't
  // leak into the next open.
  const [draft, setDraft] = React.useState<google.maps.LatLngLiteral | undefined>(
    jobsite.location
      ? { lat: jobsite.location.latitude, lng: jobsite.location.longitude }
      : undefined
  );
  React.useEffect(() => {
    if (isOpen) {
      setDraft(
        jobsite.location
          ? { lat: jobsite.location.latitude, lng: jobsite.location.longitude }
          : undefined
      );
    }
  }, [isOpen, jobsite.location]);

  const handleSave = async () => {
    if (!draft) return;
    try {
      const res = await update({
        variables: {
          id: jobsite._id,
          data: { latitude: draft.lat, longitude: draft.lng },
        },
      });
      if (res.data?.jobsiteLocation) {
        onClose();
      } else {
        toast({
          status: "error",
          title: "Couldn't save location",
          description: "Please try again.",
          isClosable: true,
        });
      }
    } catch (e) {
      toast({
        status: "error",
        title: "Couldn't save location",
        description: e instanceof Error ? e.message : "Unknown error",
        isClosable: true,
      });
    }
  };

  const hasChanges =
    !!draft &&
    (jobsite.location?.latitude !== draft.lat ||
      jobsite.location?.longitude !== draft.lng);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {jobsite.location ? "Edit jobsite location" : "Set jobsite location"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box width="100%" h="50vh" minH="320px">
            <MapForm
              value={draft}
              onPositionChange={(value) => setDraft(value)}
            />
          </Box>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSave}
            isLoading={loading}
            isDisabled={!draft || !hasChanges}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default JobsiteLocationModal;
