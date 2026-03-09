import { Center, Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiX } from "react-icons/fi";
import { JobsiteTruckingRatesSnippetFragment } from "../../../../../generated/graphql";
import jobsiteName from "../../../../../utils/jobsiteName";
import Card from "../../../../Common/Card";
import TruckingTypeRatesTable from "../../../../Common/Jobsite/TruckingTypeRatesTable";
import Permission from "../../../../Common/Permission";
import JobsiteTruckingRates from "../../../../Forms/Jobsite/JobsiteTruckingRates";

interface ITruckingRates {
  jobsite: JobsiteTruckingRatesSnippetFragment;
  displayJobsiteName?: boolean;
  defaultCollapsed?: boolean;
}

const TruckingRates = ({
  jobsite,
  displayJobsiteName = false,
  defaultCollapsed = true,
}: ITruckingRates) => {
  /**
   * ----- Hook Initialization -----
   */

  const [editForm, setEditForm] = React.useState(false);

  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  /**
   * ----- Rendering -----
   */

  return (
    <Card h="fit-content">
      <Flex flexDir="row" justifyContent="space-between">
        <Heading
          my="auto"
          ml={2}
          size="md"
          w="100%"
          cursor="pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          {displayJobsiteName
            ? jobsiteName(jobsite.name, jobsite.jobcode)
            : "Trucking Rates"}
        </Heading>
        <Permission>
          <IconButton
            icon={editForm ? <FiX /> : <FiEdit />}
            aria-label="add"
            backgroundColor="transparent"
            onClick={() => setEditForm(!editForm)}
          />
        </Permission>
      </Flex>
      {editForm && (
        <JobsiteTruckingRates
          jobsite={jobsite}
          onSuccess={() => setEditForm(false)}
        />
      )}
      {jobsite.truckingRates.length > 0 ? (
        !collapsed && (
          <TruckingTypeRatesTable truckingRates={jobsite.truckingRates} />
        )
      ) : (
        <Center>Rates not set</Center>
      )}
    </Card>
  );
};

export default TruckingRates;
