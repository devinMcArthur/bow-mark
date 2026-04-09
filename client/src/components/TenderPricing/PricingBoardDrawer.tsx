import React from "react";
import {
  Box,
  Drawer,
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
    <Drawer isOpen={!!row} onClose={onClose} placement="bottom">
      <DrawerOverlay bg="blackAlpha.300" />
      <DrawerContent h="60vh" maxH="60vh" borderTopRadius="xl" overflow="hidden">
        {row && (
          <LineItemDetail
            row={row}
            defaultMarkupPct={sheet.defaultMarkupPct}
            sheetId={sheet._id}
            tenderId={tenderId}
            onUpdate={onUpdateRow}
            onClose={onClose}
            tenderFiles={tenderFiles}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default PricingBoardDrawer;
