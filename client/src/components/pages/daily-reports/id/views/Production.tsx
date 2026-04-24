import React from "react";

import {
  Box,
  Center,
  Flex,
  Heading,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { DailyReportFullSnippetFragment } from "../../../../../generated/graphql";
import { FiPlus, FiX } from "react-icons/fi";
import ProductionCard from "./ProductionCard";
import ProductionCreateForm from "./ProductionCreateForm";
import ShowMore from "../../../../Common/ShowMore";
import Permission from "../../../../Common/Permission";

interface IProduction {
  dailyReport: DailyReportFullSnippetFragment;
  editPermission?: boolean;
}

const Production = ({ dailyReport, editPermission }: IProduction) => {
  const [addForm, setAddForm] = React.useState(false);

  const productions = dailyReport.productions;
  const hasProductions = productions.length > 0;

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={[3, 4, 5]}
      h="fit-content"
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="md" color="green.700">
          Production
        </Heading>
        <Permission otherCriteria={editPermission}>
          <Tooltip label={addForm ? "Cancel" : "Add production"}>
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

      {addForm && (
        <Box mb={3}>
          <ProductionCreateForm
            dailyReport={dailyReport}
            closeForm={() => setAddForm(false)}
          />
        </Box>
      )}

      <Flex flexDir="column" w="100%">
        {hasProductions ? (
          <ShowMore
            list={productions.map((production) => (
              <ProductionCard
                production={production}
                dailyReportDate={dailyReport.date}
                key={production._id}
                editPermission={editPermission}
              />
            ))}
          />
        ) : (
          <Center py={4} color="gray.400" fontSize="sm">
            No production logged
          </Center>
        )}
      </Flex>
    </Box>
  );
};

export default Production;
