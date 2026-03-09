import { Center, Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiX } from "react-icons/fi";

import { DailyReportFullSnippetFragment } from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import Permission from "../../../../Common/Permission";
import ShowMore from "../../../../Common/ShowMore";
import VehicleWorkCreateForm from "./VehicleWorkCreateForm";
import VehicleWorkCard from "./VehicleWorldCard";

interface IVehicleWork {
  dailyReport: DailyReportFullSnippetFragment;
  editPermission?: boolean;
}

const VehicleWork = ({ dailyReport, editPermission }: IVehicleWork) => {
  const [addForm, setAddForm] = React.useState(false);

  return (
    <Card h="fit-content">
      <Flex flexDir="row" justifyContent="space-between">
        <Heading my="auto" ml={2} size="md" w="100%">
          Equipment Hours ({dailyReport.vehicleWork.length || 0})
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
        <VehicleWorkCreateForm
          dailyReport={dailyReport}
          closeForm={() => setAddForm(false)}
        />
      )}
      <Flex flexDir="column" w="100%" px={4} py={2}>
        {dailyReport.vehicleWork.length > 0 ? (
          <ShowMore
            list={dailyReport.vehicleWork.map((work) => (
              <VehicleWorkCard
                vehicleWork={work}
                key={work._id}
                editPermission={editPermission}
              />
            ))}
          />
        ) : (
          <Center>No Vehicle Work</Center>
        )}
      </Flex>
    </Card>
  );
};

export default VehicleWork;
