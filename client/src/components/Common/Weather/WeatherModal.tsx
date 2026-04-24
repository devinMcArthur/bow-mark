import React from "react";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from "@chakra-ui/react";
import WeatherForecast from "./WeatherForecast";

/**
 * Lightweight modal wrapper around WeatherForecast. Used by surfaces
 * (e.g. the Daily Report hero) where weather is useful context but
 * doesn't need to be visible by default.
 */

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  /** Title contextualizing whose weather this is — e.g. the jobsite name. */
  title?: string;
}

const WeatherModal: React.FC<WeatherModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  title,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          7-day forecast
          {title && (
            <Text
              as="span"
              fontSize="sm"
              fontWeight="normal"
              color="gray.500"
              ml={2}
            >
              · {title}
            </Text>
          )}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <WeatherForecast
            latitude={latitude}
            longitude={longitude}
            layout="responsive"
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default WeatherModal;
