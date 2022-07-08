import React from "react";

import {
  Box,
  BoxProps,
  Flex,
  HStack,
  IconButton,
  Text,
} from "@chakra-ui/react";
import {
  DailyReportForMaterialShipmentSnippetFragment,
  DailyReportFullDocument,
  MaterialShipmentCardSnippetFragment,
  useMaterialShipmentDeleteMutation,
} from "../../../generated/graphql";
import { FiEdit, FiTrash, FiX } from "react-icons/fi";
import MaterialShipmentUpdate from "../../Forms/MaterialShipment/MaterialShipmentUpdate";
import Warning from "../Warning";
import Permission from "../Permission";
import FormContainer from "../FormContainer";
import dayjs from "dayjs";
import hourString from "../../../utils/hourString";
import formatNumber from "../../../utils/formatNumber";
import jobsiteMaterialName from "../../../utils/jobsiteMaterialName";

interface IMaterialShipmentCard extends BoxProps {
  materialShipment: MaterialShipmentCardSnippetFragment;
  dailyReport: DailyReportForMaterialShipmentSnippetFragment;
  editPermission?: boolean;
}

const MaterialShipmentCard = ({
  materialShipment,
  dailyReport,
  editPermission,
  ...props
}: IMaterialShipmentCard) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  const [remove] = useMaterialShipmentDeleteMutation({
    variables: {
      id: materialShipment._id,
    },
    refetchQueries: [DailyReportFullDocument],
  });

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    let hours;
    if (materialShipment.startTime && materialShipment.endTime) {
      const hourNumber = Math.abs(
        dayjs(materialShipment.endTime).diff(
          dayjs(materialShipment.startTime),
          "hours",
          true
        )
      );
      hours = (
        <>
          ({formatNumber(hourNumber)} {hourString(hourNumber)})
        </>
      );
    }

    if (
      materialShipment.schemaVersion === 1 ||
      materialShipment.noJobsiteMaterial
    ) {
      return (
        <Text>
          <Text as="span" fontWeight="bold">
            {materialShipment.supplier} {materialShipment.shipmentType}
          </Text>
          {" - "}
          {materialShipment.quantity} {materialShipment.unit} {hours}
        </Text>
      );
    } else {
      return (
        <Text>
          <Text as="span" fontWeight="bold">
            {materialShipment.jobsiteMaterial
              ? jobsiteMaterialName(materialShipment.jobsiteMaterial)
              : "Unknown"}
          </Text>
          {" - "}
          {materialShipment.quantity} {materialShipment.jobsiteMaterial?.unit}{" "}
          {hours}
        </Text>
      );
    }
  }, [materialShipment]);

  return (
    <Box p={2} w="100%" border="1px solid lightgray" {...props}>
      <Flex flexDir="row" justifyContent="space-between">
        <Box>
          {content}
          {materialShipment.vehicleObject?.source}{" "}
          {materialShipment.vehicleObject?.vehicleType}{" "}
          {materialShipment.vehicleObject?.vehicleCode}
        </Box>
        <HStack dir="horizontal" spacing={2} h="100%">
          {materialShipment.noJobsiteMaterial && (
            <Warning tooltip="No costing" />
          )}
          <Permission otherCriteria={editPermission}>
            {edit && (
              <IconButton
                m="auto"
                backgroundColor="transparent"
                icon={<FiTrash />}
                aria-label="delete"
                onClick={() => window.confirm("Are you sure?") && remove()}
              />
            )}
            <IconButton
              m="auto"
              backgroundColor="transparent"
              icon={edit ? <FiX /> : <FiEdit />}
              aria-label="edit"
              onClick={() => setEdit(!edit)}
            />
          </Permission>
        </HStack>
      </Flex>
      {edit && (
        <FormContainer>
          <MaterialShipmentUpdate
            materialShipment={materialShipment}
            dailyReport={dailyReport}
            onSuccess={() => setEdit(false)}
          />
        </FormContainer>
      )}
    </Box>
  );
};

export default MaterialShipmentCard;
