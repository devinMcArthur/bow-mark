import React from "react";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  useMediaQuery,
} from "@chakra-ui/react";
import ChatPage from "../Chat/ChatPage";

const DAILY_REPORT_SUGGESTIONS = [
  "What are the key requirements I should be aware of today?",
  "Are there any safety requirements in the jobsite documents?",
  "Summarize the specification for the work we're doing",
  "What materials or equipment are referenced in the documents?",
];

interface DailyReportChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobsiteId: string;
  jobsiteName: string;
}

const DailyReportChatDrawer = ({
  isOpen,
  onClose,
  jobsiteId,
  jobsiteName,
}: DailyReportChatDrawerProps) => {
  const [isDesktop] = useMediaQuery("(min-width: 768px)");

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      size={isDesktop ? "md" : "full"}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" fontSize="md">
          {jobsiteName}
        </DrawerHeader>
        <DrawerBody p={0} overflow="hidden">
          <ChatPage
            messageEndpoint="/api/jobsite-chat/message"
            conversationsEndpoint={`/conversations?jobsiteId=${jobsiteId}`}
            extraPayload={{ jobsiteId }}
            suggestions={DAILY_REPORT_SUGGESTIONS}
            disableRouting
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default DailyReportChatDrawer;
