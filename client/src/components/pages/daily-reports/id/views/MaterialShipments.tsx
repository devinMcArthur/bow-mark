import {
  Box,
  Center,
  Flex,
  Heading,
  IconButton,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiX } from "react-icons/fi";

import { DailyReportFullSnippetFragment } from "../../../../../generated/graphql";
import ShowMore from "../../../../Common/ShowMore";
import MaterialShipmentCreate from "../../../../Forms/MaterialShipment/MaterialShipmentCreate";
import MaterialShipmentCard from "../../../../Common/MaterialShipment/MaterialShipmentCard";
import Permission from "../../../../Common/Permission";
import formatNumber from "../../../../../utils/formatNumber";

interface IMaterialShipments {
  dailyReport: DailyReportFullSnippetFragment;
  editPermission?: boolean;
}

/**
 * Condense a unit label into its short form for the summary subline.
 * Plural / long forms get compressed so the line stays one-glance
 * readable across 2-3 different units.
 */
const UNIT_SHORTHAND: Record<string, string> = {
  tonnes: "t",
  tonne: "t",
  tons: "t",
  ton: "t",
  litres: "L",
  litre: "L",
  liters: "L",
  liter: "L",
};
function shortUnit(unit: string): string {
  const lower = unit.toLowerCase();
  return UNIT_SHORTHAND[lower] ?? unit;
}

const MaterialShipments = ({
  dailyReport,
  editPermission,
}: IMaterialShipments) => {
  const [addForm, setAddForm] = React.useState(false);

  const shipments = dailyReport.materialShipments;
  const hasShipments = shipments.length > 0;

  // Group quantities by unit. Shipments that share a unit get summed
  // into one segment on the subline; ordering stays insertion-first so
  // the most-used unit of the day naturally leads.
  const perUnit = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of shipments) {
      const unit = s.unit?.trim();
      if (!unit) continue;
      const qty = typeof s.quantity === "number" ? s.quantity : 0;
      map.set(unit, (map.get(unit) ?? 0) + qty);
    }
    return Array.from(map.entries()).map(([unit, total]) => ({
      unit,
      total,
      short: shortUnit(unit),
    }));
  }, [shipments]);

  // Keep the subline manageable on a busy day. After 3 unit groups we
  // fold the tail into a "+N more" chip so nothing wraps awkwardly.
  const MAX_UNITS_INLINE = 3;
  const visibleUnits = perUnit.slice(0, MAX_UNITS_INLINE);
  const extraUnitCount = Math.max(0, perUnit.length - MAX_UNITS_INLINE);

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={[3, 4, 5]}
      h="fit-content"
    >
      <Flex justify="space-between" align="center" mb={hasShipments ? 1 : 3}>
        <Heading size="md">Material Shipments</Heading>
        <Permission otherCriteria={editPermission}>
          <Tooltip label={addForm ? "Cancel" : "Add material shipment"}>
            <IconButton
              icon={addForm ? <FiX /> : <FiPlus />}
              aria-label={addForm ? "cancel" : "add"}
              size="sm"
              variant="ghost"
              onClick={() => setAddForm(!addForm)}
            />
          </Tooltip>
        </Permission>
      </Flex>

      {hasShipments && (
        <Text fontSize="sm" color="gray.600" mb={3}>
          <Text as="span" fontWeight="semibold" color="orange.600">
            {shipments.length}{" "}
            {shipments.length === 1 ? "shipment" : "shipments"}
          </Text>
          {visibleUnits.map((u) => (
            <React.Fragment key={u.unit}>
              <Text as="span" mx={1} color="gray.400">
                ·
              </Text>
              {formatNumber(u.total)} {u.short}
            </React.Fragment>
          ))}
          {extraUnitCount > 0 && (
            <>
              <Text as="span" mx={1} color="gray.400">
                ·
              </Text>
              +{extraUnitCount} more
            </>
          )}
        </Text>
      )}

      {addForm && (
        <MaterialShipmentCreate
          dailyReport={dailyReport}
          onSuccess={() => setAddForm(false)}
        />
      )}

      <Flex flexDir="column" w="100%">
        {hasShipments ? (
          <ShowMore
            list={shipments.map((materialShipment) => (
              <MaterialShipmentCard
                key={materialShipment._id}
                materialShipment={materialShipment}
                dailyReport={dailyReport}
                editPermission={editPermission}
              />
            ))}
          />
        ) : (
          <Center py={4} color="gray.400" fontSize="sm">
            No material shipments logged
          </Center>
        )}
      </Flex>
    </Box>
  );
};

export default MaterialShipments;
