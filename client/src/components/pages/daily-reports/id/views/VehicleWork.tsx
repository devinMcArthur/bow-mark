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
import Permission from "../../../../Common/Permission";
import ShowMore from "../../../../Common/ShowMore";
import VehicleWorkCreateForm from "./VehicleWorkCreateForm";
import VehicleWorkCard from "./VehicleWorldCard";
import formatNumber from "../../../../../utils/formatNumber";

interface IVehicleWork {
  dailyReport: DailyReportFullSnippetFragment;
  editPermission?: boolean;
}

const VehicleWork = ({ dailyReport, editPermission }: IVehicleWork) => {
  const [addForm, setAddForm] = React.useState(false);

  const works = dailyReport.vehicleWork;
  const hasWorks = works.length > 0;

  const totalHours = React.useMemo(
    () => works.reduce((sum, w) => sum + (w.hours ?? 0), 0),
    [works]
  );
  const uniqueVehicles = React.useMemo(
    () =>
      new Set(
        works.map((w) => w.vehicle?._id).filter((id): id is string => !!id)
      ).size,
    [works]
  );

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={[3, 4, 5]}
      h="fit-content"
    >
      <Flex justify="space-between" align="center" mb={hasWorks ? 1 : 3}>
        <Heading size="md">Equipment Hours</Heading>
        <Permission otherCriteria={editPermission}>
          <Tooltip label={addForm ? "Cancel" : "Add equipment hours"}>
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

      {hasWorks && (
        <Text fontSize="sm" color="gray.600" mb={3}>
          <Text as="span" fontWeight="semibold" color="purple.600">
            {formatNumber(totalHours)} {totalHours === 1 ? "hr" : "hrs"}
          </Text>
          <Text as="span" mx={1} color="gray.400">
            ·
          </Text>
          {uniqueVehicles} {uniqueVehicles === 1 ? "vehicle" : "vehicles"}
        </Text>
      )}

      {addForm && (
        <VehicleWorkCreateForm
          dailyReport={dailyReport}
          closeForm={() => setAddForm(false)}
        />
      )}

      <Flex flexDir="column" w="100%">
        {hasWorks ? (
          <ShowMore
            list={works.map((work) => (
              <VehicleWorkCard
                vehicleWork={work}
                key={work._id}
                editPermission={editPermission}
              />
            ))}
          />
        ) : (
          <Center py={4} color="gray.400" fontSize="sm">
            No equipment work logged
          </Center>
        )}
      </Flex>
    </Box>
  );
};

export default VehicleWork;
