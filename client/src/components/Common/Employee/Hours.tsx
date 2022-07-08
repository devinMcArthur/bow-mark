import { Box, Center, Table, Tbody, Text, Th, Thead } from "@chakra-ui/react";
import React from "react";
import {
  Scalars,
  useEmployeeHourReportsLazyQuery,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import Loading from "../Loading";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface IEmployeeHours {
  employeeId: string;
  startTime?: Scalars["DateTime"];
  endTime?: Scalars["DateTime"];
}

const startTimeConstant = dayjs().subtract(2, "weeks").toISOString();
const endTimeConstant = dayjs().toISOString();

const EmployeeHours = ({
  employeeId,
  startTime = startTimeConstant,
  endTime = endTimeConstant,
}: IEmployeeHours) => {
  /**
   * ----- Hook Initialization -----
   */

  const [query, { data }] = useEmployeeHourReportsLazyQuery();

  /**
   * ----- Variables -----
   */

  const totalHours = React.useMemo(() => {
    if (data?.employeeHourReports) {
      return data.employeeHourReports.days.reduce(
        (acc, curr) => acc + curr.hours,
        0
      );
    }
    return 0;
  }, [data?.employeeHourReports]);

  /**
   * ----- Use-effects -----
   */

  React.useEffect(() => {
    if (startTime && endTime) {
      query({
        variables: {
          startTime,
          endTime,
          id: employeeId,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, employeeId]);

  /**
   * ----- Rendering -----
   */

  const tableContent = React.useMemo(() => {
    if (data?.employeeHourReports) {
      if (data.employeeHourReports.days.length > 0) {
        const content: {
          headers: React.ReactElement[];
          rows: React.ReactElement[];
        } = { headers: [], rows: [] };

        data.employeeHourReports.days.forEach((day) => {
          content.headers.push(
            <Th isNumeric>{dayjs(day.date).utc().format("MMM DD, YYYY")}</Th>
          );
          content.rows.push(<Th isNumeric>{formatNumber(day.hours)}</Th>);
        });

        return (
          <Table>
            <Thead>
              {content.headers}
              <Th isNumeric>Total</Th>
            </Thead>
            <Tbody>
              {content.rows}
              <Th isNumeric>{formatNumber(totalHours)}</Th>
            </Tbody>
          </Table>
        );
      } else {
        return (
          <Center>
            <Text>- No hours found -</Text>
          </Center>
        );
      }
    } else return <Loading />;
  }, [data?.employeeHourReports, totalHours]);

  return (
    <Box
      w="100%"
      overflowX="scroll"
      backgroundColor="gray.200"
      borderRadius={6}
      maxH="60vh"
      overflowY="scroll"
    >
      {tableContent}
    </Box>
  );
};

export default EmployeeHours;
