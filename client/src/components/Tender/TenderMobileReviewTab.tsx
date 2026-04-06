import React from "react";
import { Box } from "@chakra-ui/react";
import TenderReviewTab from "./TenderReviewTab";

interface TenderMobileReviewTabProps {
  tenderId: string;
}

const TenderMobileReviewTab: React.FC<TenderMobileReviewTabProps> = ({ tenderId }) => {
  return (
    <Box h="100%" overflow="hidden">
      <TenderReviewTab tenderId={tenderId} />
    </Box>
  );
};

export default TenderMobileReviewTab;
