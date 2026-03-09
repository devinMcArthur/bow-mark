import React from "react";

import { Center, Flex, Heading, IconButton } from "@chakra-ui/react";
import { DailyReportFullSnippetFragment } from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import { FiPlus, FiX } from "react-icons/fi";
import ProductionCard from "./ProductionCard";
import ProductionCreateForm from "./ProductionCreateForm";
import ShowMore from "../../../../Common/ShowMore";
import Permission from "../../../../Common/Permission";
import FormContainer from "../../../../Common/FormContainer";

interface IProduction {
  dailyReport: DailyReportFullSnippetFragment;
  editPermission?: boolean;
}

const Production = ({ dailyReport, editPermission }: IProduction) => {
  /**
   * ----- Hook Initialization -----
   */

  const [addForm, setAddForm] = React.useState(false);

  /**
   * ----- Rendering -----
   */

  return (
    <Card h="fit-content">
      <Flex flexDir="row" justifyContent="space-between">
        <Heading my="auto" ml={2} size="md" w="100%">
          Production ({dailyReport.productions.length || 0})
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
        <FormContainer>
          <ProductionCreateForm
            dailyReport={dailyReport}
            closeForm={() => setAddForm(false)}
          />
        </FormContainer>
      )}
      <Flex flexDir="column" w="100%" px={4} py={2}>
        {dailyReport.productions.length > 0 ? (
          <ShowMore
            list={dailyReport.productions.map((production) => (
              <ProductionCard
                production={production}
                dailyReportDate={dailyReport.date}
                key={production._id}
                editPermission={editPermission}
              />
            ))}
          />
        ) : (
          <Center>No Production</Center>
        )}
      </Flex>
    </Card>
  );
};

export default Production;
