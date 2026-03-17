// client/src/components/Chat/RatingButtons.tsx
import React from "react";
import { HStack, IconButton, Tooltip } from "@chakra-ui/react";
import { FiThumbsUp, FiThumbsDown } from "react-icons/fi";
import DownvoteForm from "./DownvoteForm";

interface RatingButtonsProps {
  messageId: string;
  rating?: "up" | "down";
  ratingReasons?: string[];
  ratingComment?: string;
  onRate: (rating: "up" | "down" | null, reasons?: string[], comment?: string) => void;
}

const RatingButtons = ({
  rating,
  ratingReasons,
  ratingComment,
  onRate,
}: RatingButtonsProps) => {
  const [showForm, setShowForm] = React.useState(false);

  const handleThumbsUp = () => {
    if (showForm) setShowForm(false);
    onRate(rating === "up" ? null : "up");
  };

  const handleThumbsDown = () => {
    setShowForm(true);
  };

  const handleSubmit = (reasons: string[], comment: string) => {
    onRate("down", reasons, comment);
    setShowForm(false);
  };

  const handleCancel = () => {
    // If opening the form replaced an upvote, restore it
    if (rating === "up") {
      onRate("up");
    }
    setShowForm(false);
  };

  return (
    <>
      <HStack
        spacing={0}
        sx={{
          "@media (hover: hover)": {
            visibility: "hidden",
            ".message-container:hover &": { visibility: "visible" },
          },
        }}
      >
        <Tooltip label="Good response" placement="bottom" fontSize="xs">
          <IconButton
            aria-label="Upvote response"
            icon={<FiThumbsUp />}
            size="xs"
            variant="ghost"
            color={rating === "up" ? "green.500" : "gray.400"}
            _hover={{ color: "green.500", bg: "transparent" }}
            onClick={handleThumbsUp}
          />
        </Tooltip>
        <Tooltip label="Bad response" placement="bottom" fontSize="xs">
          <IconButton
            aria-label="Downvote response"
            icon={<FiThumbsDown />}
            size="xs"
            variant="ghost"
            color={rating === "down" ? "red.500" : "gray.400"}
            _hover={{ color: "red.500", bg: "transparent" }}
            onClick={handleThumbsDown}
          />
        </Tooltip>
      </HStack>
      {showForm && (
        <DownvoteForm
          initialReasons={ratingReasons}
          initialComment={ratingComment}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};

export default RatingButtons;
