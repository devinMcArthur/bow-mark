import { Box, Flex, IconButton, SimpleGrid, Text } from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { FiEdit, FiTrash, FiX } from "react-icons/fi";
import { useProductionUpdateForm } from "../../../../../forms/production";

import {
  DailyReportFullDocument,
  ProductionCardSnippetFragment,
  ProductionUpdateData,
  useProductionDeleteMutation,
  useProductionUpdateMutation,
} from "../../../../../generated/graphql";
import convertHourToDate from "../../../../../utils/convertHourToDate";
import hourString from "../../../../../utils/hourString";
import SubmitButton from "../../../../Common/forms/SubmitButton";

interface IProductionCard {
  production: ProductionCardSnippetFragment;
  dailyReportDate: Date;
}

const ProductionCard = ({ production, dailyReportDate }: IProductionCard) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  const { FormComponents } = useProductionUpdateForm({
    defaultValues: {
      jobTitle: production.jobTitle,
      quantity: production.quantity,
      unit: production.unit,
      startTime: production.startTime,
      endTime: production.endTime,
      description: production.description,
    },
  });

  const [update, { loading }] = useProductionUpdateMutation();

  const [remove] = useProductionDeleteMutation({
    variables: {
      id: production._id,
    },
    refetchQueries: [DailyReportFullDocument],
  });

  /**
   * ----- Functions -----
   */

  const submitUpdate = React.useCallback(
    (data: ProductionUpdateData) => {
      let startTime = data.startTime;
      if (!dayjs(startTime).isValid()) {
        startTime = convertHourToDate(data.startTime, dailyReportDate);
      }

      let endTime = data.endTime;
      if (!dayjs(endTime).isValid()) {
        endTime = convertHourToDate(data.endTime, dailyReportDate);
      }

      update({
        variables: {
          id: production._id,
          data: {
            ...data,
            startTime,
            endTime,
          },
        },
      }).then(() => setEdit(false));
    },
    [dailyReportDate, production._id, update]
  );

  /**
   * ----- Variables -----
   */

  const hours = React.useMemo(() => {
    return Math.abs(
      dayjs(production.endTime).diff(production.startTime, "hours")
    );
  }, [production.endTime, production.startTime]);

  /**
   * ----- Rendering -----
   */

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <Flex flexDir="row" justifyContent="space-between">
        <Box>
          <Text>
            <Text as="span" fontWeight="bold">
              {production.jobTitle}
            </Text>
            {" - "}
            {production.quantity} {production.unit}
          </Text>
          <Text>
            {dayjs(production.startTime).format("h:mm a")} -{" "}
            {dayjs(production.endTime).format("h:mm a")} ({hours}{" "}
            {hourString(hours)})
          </Text>
        </Box>
        <Flex flexDir="row">
          {edit && (
            <IconButton
              backgroundColor="transparent"
              icon={<FiTrash />}
              aria-label="delete"
              onClick={() => window.confirm("Are you sure?") && remove()}
            />
          )}
          <IconButton
            backgroundColor="transparent"
            icon={edit ? <FiX /> : <FiEdit />}
            aria-label="edit"
            onClick={() => setEdit(!edit)}
          />
        </Flex>
      </Flex>
      {edit && (
        <Box backgroundColor="gray.200" p={2} borderRadius={4}>
          <FormComponents.Form submitHandler={submitUpdate}>
            <FormComponents.JobTitle isLoading={loading} />
            <SimpleGrid columns={[1, 1, 2]} spacing={2}>
              <FormComponents.Quantity isLoading={loading} />
              <FormComponents.Unit isLoading={loading} />
            </SimpleGrid>
            <SimpleGrid columns={[1, 1, 2]} spacing={2}>
              <FormComponents.StartTime isLoading={loading} />
              <FormComponents.EndTime isLoading={loading} />
            </SimpleGrid>
            <FormComponents.Description isLoading={loading} />
            <SubmitButton isLoading={loading} />
          </FormComponents.Form>
        </Box>
      )}
    </Box>
  );
};

export default ProductionCard;
