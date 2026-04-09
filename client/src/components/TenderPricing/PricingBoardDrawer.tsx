import React from "react";
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
} from "@chakra-ui/react";
import { TenderPricingRow, TenderPricingSheet } from "./types";
import { TenderFileItem } from "../Tender/types";
import LineItemDetail from "./LineItemDetail";

interface PricingBoardDrawerProps {
  row: TenderPricingRow | null;
  sheet: TenderPricingSheet;
  tenderId: string;
  onClose: () => void;
  onUpdateRow: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  tenderFiles?: TenderFileItem[];
}

const PricingBoardDrawer: React.FC<PricingBoardDrawerProps> = ({
  row,
  sheet,
  tenderId,
  onClose,
  onUpdateRow,
  tenderFiles,
}) => {
  return (
    <Drawer isOpen={!!row} onClose={onClose} placement="bottom" size="md">
      <DrawerOverlay bg="blackAlpha.300" />
      <DrawerContent maxH="60vh" borderTopRadius="xl" display="flex" flexDir="column">
        {row && (
          <DrawerBody p={0} flex={1} display="flex" flexDir="column" overflow="hidden" minH={0}>
            <LineItemDetail
              row={row}
              defaultMarkupPct={sheet.defaultMarkupPct}
              sheetId={sheet._id}
              tenderId={tenderId}
              onUpdate={onUpdateRow}
              onClose={onClose}
              tenderFiles={tenderFiles}
            />
          </DrawerBody>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default PricingBoardDrawer;
