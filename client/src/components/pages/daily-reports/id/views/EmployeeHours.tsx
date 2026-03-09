import React from "react";

import { Heading, Flex, IconButton, Center } from "@chakra-ui/react";

import EmployeeWorkCard from "./EmployeeWorkCard";
import Card from "../../../../Common/Card";

import { DailyReportFullSnippetFragment } from "../../../../../generated/graphql";
import { FiPlus, FiX } from "react-icons/fi";
import EmployeeHourCreateForm from "./EmployeeHourCreateForm";
import ShowMore from "../../../../Common/ShowMore";
import Permission from "../../../../Common/Permission";

interface IEmployeeHours {
  dailyReport: DailyReportFullSnippetFragment;
  editPermission?: boolean;
}

const EmployeeHours = ({ dailyReport, editPermission }: IEmployeeHours) => {
  const [addForm, setAddForm] = React.useState(false);

  return (
    <Card h="fit-content">
      <Flex flexDir="row" justifyContent="space-between">
        <Heading w="100%" my="auto" ml={2} size="md">
          Employee Hours ({dailyReport.employeeWork.length || 0})
        </Heading>
        <Permission otherCriteria={editPermission}>
          <IconButton
            icon={addForm ? <FiX /> : <FiPlus />}
            aria-label="add"
            backgroundColor="transparent"
            onClick={() => setAddForm(!addForm)}
          />
        </Permission>
      </Flex>
      {addForm && (
        <EmployeeHourCreateForm
          dailyReport={dailyReport}
          closeForm={() => setAddForm(false)}
        />
      )}
      <Flex flexDir="column" w="100%" px={4} py={2}>
        {dailyReport.employeeWork.length > 0 ? (
          <ShowMore
            list={dailyReport.employeeWork.map((work) => (
              <EmployeeWorkCard
                editPermission={editPermission}
                employeeWork={work}
                dailyReportDate={dailyReport.date}
                key={work._id}
              />
            ))}
          />
        ) : (
          <Center>No Employee Work</Center>
        )}
      </Flex>
    </Card>
  );
};

export default EmployeeHours;
