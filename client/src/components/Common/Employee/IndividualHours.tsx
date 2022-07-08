import { Flex, Grid, GridItem, Heading, IconButton } from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { FiCheck, FiWatch } from "react-icons/fi";
import { useEmployeeHourDateForm } from "../../../forms/employee";
import { Scalars } from "../../../generated/graphql";
import Card from "../Card";
import EmployeeHours from "./Hours";

interface IIndividualEmployeeHoursCard {
  employeeId: string;
}

const IndividualEmployeeHoursCard = ({
  employeeId,
}: IIndividualEmployeeHoursCard) => {
  /**
   * ----- Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  const [startTime, setStartTime] = React.useState<Scalars["DateTime"]>(
    dayjs().subtract(2, "weeks").toISOString()
  );
  const [endTime, setEndTime] = React.useState<Scalars["DateTime"]>(
    dayjs().toISOString()
  );

  const { FormComponents } = useEmployeeHourDateForm({
    defaultValues: {
      startTime,
      endTime,
    },
  });

  /**
   * ----- Functions -----
   */

  const handleSubmit = (data: {
    startTime: Scalars["DateTime"];
    endTime: Scalars["DateTime"];
  }) => {
    setStartTime(data.startTime);
    setEndTime(data.endTime);
    setEdit(false);
  };

  /**
   * ----- Rendering -----
   */

  const editForm = React.useMemo(() => {
    if (edit) {
      return (
        <FormComponents.Form submitHandler={handleSubmit}>
          <Grid
            templateColumns="repeat(10, 1fr)"
            templateRows="repeat(1, 1fr)"
            gap={2}
            m={2}
            w="100%"
          >
            <GridItem colStart={[0, 0, 0, 6]} colSpan={[4, 4, 4, 2]}>
              <FormComponents.StartTime />
            </GridItem>
            <GridItem colSpan={[4, 4, 4, 2]}>
              <FormComponents.EndTime />
            </GridItem>
            <GridItem colspan={[1, 1, 1, 1]}>
              <IconButton
                py="auto"
                type="submit"
                aria-label="submit"
                icon={<FiCheck />}
              />
            </GridItem>
          </Grid>
        </FormComponents.Form>
      );
    } else {
      return (
        <IconButton
          aria-label="edit"
          backgroundColor="transparent"
          icon={<FiWatch />}
          onClick={() => setEdit(true)}
        />
      );
    }
  }, [FormComponents, edit]);

  return (
    <Card
      heading={
        <Flex justifyContent="space-between">
          <Heading size="md">Hours</Heading>
          {editForm}
        </Flex>
      }
    >
      <EmployeeHours
        employeeId={employeeId}
        startTime={startTime}
        endTime={endTime}
      />
    </Card>
  );
};

export default IndividualEmployeeHoursCard;
