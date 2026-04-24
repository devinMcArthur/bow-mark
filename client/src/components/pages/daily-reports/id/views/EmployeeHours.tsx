import React from "react";

import {
  Box,
  Center,
  Flex,
  Heading,
  IconButton,
  Text,
  Tooltip,
} from "@chakra-ui/react";

import EmployeeWorkCard from "./EmployeeWorkCard";

import { DailyReportFullSnippetFragment } from "../../../../../generated/graphql";
import { FiPlus, FiX } from "react-icons/fi";
import dayjs from "dayjs";
import EmployeeHourCreateForm from "./EmployeeHourCreateForm";
import ShowMore from "../../../../Common/ShowMore";
import Permission from "../../../../Common/Permission";
import formatNumber from "../../../../../utils/formatNumber";

interface IEmployeeHours {
  dailyReport: DailyReportFullSnippetFragment;
  editPermission?: boolean;
}

const EmployeeHours = ({ dailyReport, editPermission }: IEmployeeHours) => {
  const [addForm, setAddForm] = React.useState(false);

  const works = dailyReport.employeeWork;
  const hasWorks = works.length > 0;

  // Summary stats for the header subline. Hours are derived the same
  // way EmployeeWorkCard computes them — end minus start in minutes,
  // divided by 60 — so the total here always matches the sum of the
  // individual rows.
  const totalHours = React.useMemo(
    () =>
      works.reduce(
        (sum, w) => sum + dayjs(w.endTime).diff(w.startTime, "minute") / 60,
        0
      ),
    [works]
  );
  const uniqueWorkers = React.useMemo(
    () => new Set(works.map((w) => w.employee._id)).size,
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
        <Heading size="md">Employee Hours</Heading>
        <Permission otherCriteria={editPermission}>
          <Tooltip label={addForm ? "Cancel" : "Add employee hours"}>
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
          <Text as="span" fontWeight="semibold" color="blue.600">
            {formatNumber(totalHours)} {totalHours === 1 ? "hr" : "hrs"}
          </Text>
          <Text as="span" mx={1} color="gray.400">
            ·
          </Text>
          {uniqueWorkers} {uniqueWorkers === 1 ? "worker" : "workers"}
        </Text>
      )}

      {addForm && (
        <EmployeeHourCreateForm
          dailyReport={dailyReport}
          closeForm={() => setAddForm(false)}
        />
      )}

      <Flex flexDir="column" w="100%">
        {hasWorks ? (
          <ShowMore
            list={works.map((work) => (
              <EmployeeWorkCard
                editPermission={editPermission}
                employeeWork={work}
                dailyReportDate={dailyReport.date}
                key={work._id}
              />
            ))}
          />
        ) : (
          <Center py={4} color="gray.400" fontSize="sm">
            No employee work logged
          </Center>
        )}
      </Flex>
    </Box>
  );
};

export default EmployeeHours;
