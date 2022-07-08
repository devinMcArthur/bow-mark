import React from "react";

import {
  Box,
  Center,
  Flex,
  Grid,
  GridItem,
  Heading,
  IconButton,
} from "@chakra-ui/react";
import {
  CrewFullSnippetFragment,
  EmployeeCardSnippetFragment,
  Scalars,
} from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import EmployeeCard from "./EmployeeCard";
import { FiCheck, FiPlus, FiWatch, FiX } from "react-icons/fi";
import EmployeeAddForm from "./EmployeeAddForm";
import ShowMore from "../../../../Common/ShowMore";
import dayjs from "dayjs";
import { useEmployeeHourDateForm } from "../../../../../forms/employee";

interface IEmployees {
  employees: EmployeeCardSnippetFragment[];
  crew: CrewFullSnippetFragment;
}

const Employees = ({ employees, crew }: IEmployees) => {
  /**
   * ----- Hook Initialization -----
   */

  const [hours, setHours] = React.useState(false);
  const [startTime, setStartTime] = React.useState<Scalars["DateTime"]>(
    dayjs().subtract(2, "weeks").toISOString()
  );
  const [endTime, setEndTime] = React.useState<Scalars["DateTime"]>(
    dayjs().toISOString()
  );

  const [addForm, setAddForm] = React.useState(false);

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
  };

  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between">
        <Heading ml={2} w="100%" my="auto" size="md">
          Employees ({employees.length})
        </Heading>
        <IconButton
          aria-label="hours"
          backgroundColor="transparent"
          icon={<FiWatch />}
          onClick={() => setHours(!hours)}
        />
        <IconButton
          aria-label="add"
          backgroundColor="transparent"
          icon={addForm ? <FiX /> : <FiPlus />}
          onClick={() => setAddForm(!addForm)}
        />
      </Flex>
      {hours && (
        <Box>
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
        </Box>
      )}

      {addForm && (
        <EmployeeAddForm crew={crew} closeForm={() => setAddForm(false)} />
      )}

      <Flex flexDir="column" w="100%" px={4} py={2}>
        {employees.length > 0 ? (
          <ShowMore
            list={employees.map((employee) => (
              <EmployeeCard
                employee={employee}
                crew={crew}
                key={employee._id}
                showHours={hours}
                hoursTimeRange={{
                  startTime,
                  endTime,
                }}
              />
            ))}
          />
        ) : (
          <Center>No employees</Center>
        )}
      </Flex>
    </Card>
  );
};

export default Employees;
