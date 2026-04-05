// client/src/components/Tender/TenderMobileLayout.tsx
import React, { useState } from "react";
import {
  Badge,
  Box,
  Flex,
  IconButton,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { FiChevronLeft, FiFileText, FiList, FiMessageSquare, FiAlignLeft } from "react-icons/fi";
import { useRouter } from "next/router";
import TenderMobilePricingTab from "./TenderMobilePricingTab";
import TenderMobileDocumentsTab from "./TenderMobileDocumentsTab";
import TenderSummaryTab from "./TenderSummaryTab";
import TenderNotesTab from "./TenderNotesTab";
import { TenderDetail, tenderStatusColor } from "./types";
import { TenderPricingSheet } from "../TenderPricing/types";
import { navbarHeight } from "../../constants/styles";

// ─── Types ────────────────────────────────────────────────────────────────────

type MobileTab = "pricing" | "documents" | "notes" | "summary";

const TABS: { key: MobileTab; label: string; icon: React.ReactElement }[] = [
  { key: "pricing", label: "Pricing", icon: <FiList size={18} /> },
  { key: "documents", label: "Documents", icon: <FiFileText size={18} /> },
  { key: "notes", label: "Notes", icon: <FiMessageSquare size={18} /> },
  { key: "summary", label: "Summary", icon: <FiAlignLeft size={18} /> },
];

const TAB_BAR_HEIGHT = "56px";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderMobileLayoutProps {
  tender: TenderDetail;
  sheet: TenderPricingSheet | null;
  onSheetUpdate: (sheet: TenderPricingSheet) => void;
  tenderId: string;
  onRefetch: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TenderMobileLayout: React.FC<TenderMobileLayoutProps> = ({
  tender,
  sheet,
  onSheetUpdate,
  tenderId,
  onRefetch,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MobileTab>("pricing");

  return (
    <Flex
      direction="column"
      position="fixed"
      top={navbarHeight}
      bottom={0}
      left={0}
      right={0}
      overflow="hidden"
    >
      {/* Top bar */}
      <Flex
        h="40px"
        flexShrink={0}
        align="center"
        px={2}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        <IconButton
          aria-label="Back to tenders"
          icon={<FiChevronLeft size={18} />}
          size="sm"
          variant="ghost"
          onClick={() => router.push("/tenders")}
          mr={1}
        />
        <Text fontSize="sm" fontWeight="600" isTruncated flex={1} color="gray.800">
          {tender.name}
        </Text>
        <Text fontFamily="mono" fontSize="xs" color="gray.500" flexShrink={0} mx={2}>
          {tender.jobcode}
        </Text>
        <Badge colorScheme={tenderStatusColor(tender.status)} flexShrink={0}>
          {tender.status}
        </Badge>
      </Flex>

      {/* Tab content */}
      <Box flex={1} overflow="hidden">
        {activeTab === "pricing" && (
          sheet ? (
            <TenderMobilePricingTab
              sheet={sheet}
              tenderId={tenderId}
              onSheetUpdate={onSheetUpdate}
              tenderFiles={tender.files}
            />
          ) : (
            <Flex h="100%" align="center" justify="center">
              <Spinner />
            </Flex>
          )
        )}
        {activeTab === "documents" && (
          <TenderMobileDocumentsTab files={tender.files} />
        )}
        {activeTab === "notes" && (
          <Box h="100%" overflowY="auto" px={4} py={3}>
            <TenderNotesTab tender={tender} onUpdated={onRefetch} />
          </Box>
        )}
        {activeTab === "summary" && (
          <Box h="100%" overflowY="auto" px={4} py={3}>
            <TenderSummaryTab tender={tender} onUpdated={onRefetch} />
          </Box>
        )}
      </Box>

      {/* Bottom tab bar */}
      <Flex
        h={TAB_BAR_HEIGHT}
        flexShrink={0}
        borderTop="1px solid"
        borderColor="gray.200"
        bg="white"
        align="stretch"
        pb="env(safe-area-inset-bottom, 0px)"
      >
        {TABS.map((tab) => (
          <Flex
            key={tab.key}
            flex={1}
            direction="column"
            align="center"
            justify="center"
            cursor="pointer"
            onClick={() => setActiveTab(tab.key)}
            color={activeTab === tab.key ? "blue.500" : "gray.400"}
            borderTop="2px solid"
            borderColor={activeTab === tab.key ? "blue.500" : "transparent"}
            transition="color 0.15s, border-color 0.15s"
            _active={{ bg: "gray.50" }}
          >
            <Box mb="2px">{tab.icon}</Box>
            <Text fontSize="10px" fontWeight={activeTab === tab.key ? "600" : "400"}>
              {tab.label}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};

export default TenderMobileLayout;
